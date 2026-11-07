import pytest
import concurrent.futures
from decimal import Decimal
from django.db import connection
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Resource, Order, OrderResourceConsumption, OrderStepLog
from manufacturing.services import (
    OrderService,
    IllegalStateTransitionError,
    InsufficientInventoryError,
)


@pytest.fixture
def setup_concurrency_env(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='CAD Planning')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Printing')
    step3 = ProcessStep.objects.create(sequence_order=3, code='STEP_CNC', name='CNC Machining')
    step4 = ProcessStep.objects.create(sequence_order=4, code='STEP_QA', name='QA Metrology')
    step5 = ProcessStep.objects.create(sequence_order=5, code='STEP_LABEL', name='Packaging')

    res_titanium = Resource.objects.create(
        name='Titanium Powder ELI',
        category=Resource.Category.MATERIAL,
        unit=Resource.Unit.GRAMS,
        cost_per_unit=Decimal('1.50'),
        total_available=Decimal('100.00')
    )

    return {
        'steps': [step1, step2, step3, step4, step5],
        'resource': res_titanium
    }


@pytest.mark.django_db(transaction=True)
def test_concurrent_order_advance_prevents_double_advancement(setup_concurrency_env):
    """
    Concurrency Invariant: When 2 concurrent operators attempt to advance the exact same order
    from Step 1, select_for_update() serializes execution, and the OCC check blocks the 2nd operator
    from skipping Step 2 to Step 3.
    """
    steps = setup_concurrency_env['steps']
    order = Order.objects.create(
        case_id='CAS-RACE-001',
        patient_ref='PT-RACE',
        implant_type='CRANIAL_PLATE',
        current_step=steps[0]  # Step 1
    )

    success_count = 0
    conflict_count = 0

    def attempt_advance(operator_name):
        import time
        # Close old connection in new thread for isolated DB session
        connection.close()
        for attempt in range(10):
            try:
                OrderService.advance_order(
                    order_id=order.id,
                    operator_name=operator_name,
                    expected_step_sequence=1  # Both operators see Step 1 on screen
                )
                return True, None
            except IllegalStateTransitionError as e:
                return False, str(e)
            except Exception:
                time.sleep(0.05)
        return False, "Contention timeout"

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(attempt_advance, "Operator 1")
        f2 = executor.submit(attempt_advance, "Operator 2")

        for f in [f1, f2]:
            ok, err = f.result()
            if ok:
                success_count += 1
            else:
                conflict_count += 1
                assert "Concurrency Conflict" in err or "already" in err.lower()

    # Exactly 1 operator succeeded
    assert success_count == 1
    assert conflict_count == 1

    # Reload order and verify it moved strictly to Step 2 (NOT double-stepped to Step 3)
    order.refresh_from_db()
    assert order.current_step.sequence_order == 2
    assert OrderStepLog.objects.filter(order=order).count() == 1


@pytest.mark.django_db(transaction=True)
def test_concurrent_inventory_depletion_never_oversells(setup_concurrency_env):
    """
    Concurrency Invariant: When multiple concurrent orders attempt to consume a shared resource
    whose balance is limited, pessimistic row locking ensures the balance never drops below zero.
    """
    steps = setup_concurrency_env['steps']
    res = setup_concurrency_env['resource']  # Initial balance: 100.00 grams

    # Create 3 distinct orders
    o1 = Order.objects.create(case_id='CAS-CONC-1', patient_ref='PT-1', implant_type='SPINAL_CAGE', current_step=steps[0])
    o2 = Order.objects.create(case_id='CAS-CONC-2', patient_ref='PT-2', implant_type='SPINAL_CAGE', current_step=steps[0])
    o3 = Order.objects.create(case_id='CAS-CONC-3', patient_ref='PT-3', implant_type='SPINAL_CAGE', current_step=steps[0])

    # Each order demands 40.00 grams. Total demand = 120.00 grams (exceeds 100.00).
    # Exactly 2 should succeed (consuming 80.00, leaving 20.00). 1 must fail with InsufficientInventoryError.
    def worker_advance(order_id):
        import time
        connection.close()
        for attempt in range(10):
            try:
                OrderService.advance_order(
                    order_id=order_id,
                    operator_name='Operator',
                    resources_data=[{'resource_id': res.id, 'quantity': Decimal('40.00')}]
                )
                return True, None
            except InsufficientInventoryError as e:
                return False, str(e)
            except Exception:
                # Retry on SQLite file lock contention
                time.sleep(0.05)
        return False, "Contention timeout"

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(worker_advance, o.id) for o in [o1, o2, o3]]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    successes = [r for r in results if r[0] is True]
    failures = [r for r in results if r[0] is False]

    assert len(successes) == 2
    assert len(failures) == 1
    assert "Insufficient stock" in failures[0][1]

    # Verify database state
    res.refresh_from_db()
    assert res.total_available == Decimal('20.00')  # Exactly 100.00 - 80.00 = 20.00
    assert OrderResourceConsumption.objects.filter(resource=res).count() == 2


@pytest.mark.django_db
def test_stale_view_concurrency_guard_api(setup_concurrency_env, api_client):
    """
    API Invariant: Client sending stale expected_step_sequence receives clean HTTP 400 with concurrency alert.
    """
    client = api_client
    steps = setup_concurrency_env['steps']
    order = Order.objects.create(
        case_id='CAS-STALE-001',
        patient_ref='PT-STALE',
        implant_type='HIP_ACETABULAR_CUP',
        current_step=steps[1]  # Order is currently at Step 2 (3D Printing)
    )

    # Client thinks the order is still at Step 1
    stale_payload = {
        'operator_name': 'Operator Stale',
        'expected_step_sequence': 1
    }

    response = client.post(f'/api/orders/{order.id}/advance/', stale_payload, format='json')
    assert response.status_code == 400
    assert "Concurrency Conflict" in response.json()['error']
    assert "currently at Step 2" in response.json()['error']
