import pytest
from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Resource, Order, OrderStepLog, OrderResourceConsumption, OperatorProfile
from manufacturing.services import (
    OrderService,
    OrderCompletedError,
    IllegalStateTransitionError,
    InsufficientInventoryError,
    UnauthorizedStepOperatorError,
    DomainValidationError,
)


@pytest.fixture
def setup_domain2_env(db):
    """
    Sets up a 5-station manufacturing pipeline with consumable resources.
    """
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='3D CAD Modeling')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Metal Printing')
    step3 = ProcessStep.objects.create(sequence_order=3, code='STEP_CNC', name='CNC Machining')
    step4 = ProcessStep.objects.create(sequence_order=4, code='STEP_QA', name='ISO 13485 QA')
    step5 = ProcessStep.objects.create(sequence_order=5, code='STEP_LABEL', name='Packaging & UDI')

    res_ti = Resource.objects.create(
        name='Titanium Powder Ti-6Al-4V Grade 23',
        category=Resource.Category.MATERIAL,
        unit=Resource.Unit.GRAMS,
        cost_per_unit=Decimal('1.25'),
        total_available=Decimal('1000.00')
    )
    res_machine = Resource.objects.create(
        name='SLM 280 Printer Time',
        category=Resource.Category.MACHINE_TIME,
        unit=Resource.Unit.HOURS,
        cost_per_unit=Decimal('80.00'),
        total_available=Decimal('100.00')
    )

    return {
        'steps': [step1, step2, step3, step4, step5],
        'resources': [res_ti, res_machine]
    }


@pytest.mark.django_db
def test_strict_sequential_progression_step_n_to_n_plus_one(setup_domain2_env):
    """
    Business Invariant: Order strictly advances Step 1 -> 2 -> 3 -> 4 -> 5.
    """
    steps = setup_domain2_env['steps']
    order = Order.objects.create(
        case_id='CAS-SEQ-001',
        patient_ref='PT-SEQ-1',
        implant_type='CRANIAL_PLATE',
        current_step=steps[0]
    )

    # 1. Advance Step 1 -> Step 2
    order = OrderService.advance_order(order.id, operator_name='Biomedical Eng')
    assert order.current_step.sequence_order == 2
    assert order.status == Order.Status.IN_PROGRESS

    # 2. Advance Step 2 -> Step 3
    order = OrderService.advance_order(order.id, operator_name='SLM Operator')
    assert order.current_step.sequence_order == 3
    assert order.status == Order.Status.IN_PROGRESS

    # 3. Advance Step 3 -> Step 4
    order = OrderService.advance_order(order.id, operator_name='CNC Machinist')
    assert order.current_step.sequence_order == 4
    assert order.status == Order.Status.IN_PROGRESS

    # 4. Advance Step 4 -> Step 5
    order = OrderService.advance_order(order.id, operator_name='QA Inspector')
    assert order.current_step.sequence_order == 5
    assert order.status == Order.Status.IN_PROGRESS


@pytest.mark.django_db
def test_final_step_advance_transitions_status_to_completed(setup_domain2_env):
    """
    Business Invariant: Advancing from Step 5 automatically transitions order to COMPLETED.
    """
    steps = setup_domain2_env['steps']
    order = Order.objects.create(
        case_id='CAS-COMPL-001',
        patient_ref='PT-COMPL',
        implant_type='HIP_ACETABULAR_CUP',
        current_step=steps[4]  # Step 5
    )

    order = OrderService.advance_order(
        order.id,
        operator_name='Cleanroom Packaging Lead',
        notes='Sealed in sterile double pouch with GS1 UDI label.'
    )

    assert order.status == Order.Status.COMPLETED
    assert order.can_advance() is False

    # Check terminal DHR log
    final_log = order.step_logs.latest('transitioned_at')
    assert final_log.from_step.code == 'STEP_LABEL'
    assert final_log.to_step is None
    assert final_log.notes == 'Sealed in sterile double pouch with GS1 UDI label.'


@pytest.mark.django_db
def test_advance_completed_or_cancelled_order_strictly_prohibited(setup_domain2_env):
    """
    Business Invariant: Completed or Cancelled orders are immutable and cannot be advanced.
    """
    steps = setup_domain2_env['steps']

    completed_order = Order.objects.create(
        case_id='CAS-ALREADY-DONE',
        patient_ref='PT-DONE',
        implant_type='SPINAL_CAGE',
        status=Order.Status.COMPLETED,
        current_step=steps[4]
    )

    cancelled_order = Order.objects.create(
        case_id='CAS-CANCELLED',
        patient_ref='PT-CANCEL',
        implant_type='SPINAL_CAGE',
        status=Order.Status.CANCELLED,
        current_step=steps[0]
    )

    with pytest.raises(OrderCompletedError):
        OrderService.advance_order(completed_order.id)

    with pytest.raises(IllegalStateTransitionError):
        OrderService.advance_order(cancelled_order.id)


@pytest.mark.django_db
def test_automated_inventory_depletion_engine(setup_domain2_env):
    """
    Business Invariant: Consuming resources on advance automatically depletes inventory balances.
    """
    steps = setup_domain2_env['steps']
    res_ti = setup_domain2_env['resources'][0]

    initial_stock = res_ti.total_available  # 1000.00 grams
    consumption_qty = Decimal('220.50')

    order = Order.objects.create(
        case_id='CAS-INVENTORY-01',
        patient_ref='PT-INV-1',
        implant_type='MANDIBULAR_RECON',
        current_step=steps[1]  # 3D Printing
    )

    resources_data = [
        {
            'resource_id': res_ti.id,
            'quantity': consumption_qty
        }
    ]

    OrderService.advance_order(
        order.id,
        operator_name='SLM Lead',
        resources_data=resources_data
    )

    # Reload resource from DB
    res_ti.refresh_from_db()
    expected_balance = initial_stock - consumption_qty
    assert res_ti.total_available == expected_balance  # Exactly 779.50 grams

    # Verify ledger entry
    consumption = OrderResourceConsumption.objects.get(order=order, resource=res_ti)
    assert consumption.quantity == consumption_qty


@pytest.mark.django_db
def test_insufficient_inventory_triggers_atomic_rollback(setup_domain2_env):
    """
    Business Invariant: If stock is insufficient, transaction aborts completely (Atomic Rollback).
    No step advancement occurs and inventory balance remains unmodified.
    """
    steps = setup_domain2_env['steps']
    res_ti = setup_domain2_env['resources'][0]  # 1000.00 available

    order = Order.objects.create(
        case_id='CAS-INSUFFICIENT-01',
        patient_ref='PT-INV-FAIL',
        implant_type='CRANIAL_PLATE',
        current_step=steps[1]
    )

    oversized_request = [
        {
            'resource_id': res_ti.id,
            'quantity': Decimal('50000.00')  # Way above 1000.00
        }
    ]

    with pytest.raises(InsufficientInventoryError) as exc_info:
        OrderService.advance_order(
            order.id,
            operator_name='SLM Operator',
            resources_data=oversized_request
        )

    assert "Insufficient stock" in str(exc_info.value)

    # Verify atomic rollback
    order.refresh_from_db()
    res_ti.refresh_from_db()
    assert order.current_step.sequence_order == 2  # Step was NOT advanced
    assert res_ti.total_available == Decimal('1000.00')  # Balance NOT deducted
    assert OrderResourceConsumption.objects.filter(order=order).count() == 0


@pytest.mark.django_db
def test_server_side_rbac_role_enforcement(setup_domain2_env):
    """
    Business Invariant (ISO 13485): Operators can only sign off stages corresponding to their certified role.
    """
    steps = setup_domain2_env['steps']

    order = Order.objects.create(
        case_id='CAS-RBAC-01',
        patient_ref='PT-RBAC',
        implant_type='CRANIAL_PLATE',
        current_step=steps[0]  # Step 1: CAD
    )

    # 1. Production Operator trying to approve CAD Planning -> Unauthorized
    with pytest.raises(UnauthorizedStepOperatorError):
        OrderService.advance_order(
            order.id,
            operator_name='John Machinist',
            operator_role='PRODUCTION_OPERATOR'
        )

    # 2. Biomedical Engineer approving CAD Planning -> Allowed
    order = OrderService.advance_order(
        order.id,
        operator_name='Dr. Alice Bio',
        operator_role='BIOMEDICAL_ENGINEER'
    )
    assert order.current_step.sequence_order == 2  # Successfully at Step 2 (3D Printing)

    # 3. QA Specialist trying to sign off Step 2 (3D Printing) -> Unauthorized
    with pytest.raises(UnauthorizedStepOperatorError):
        OrderService.advance_order(
            order.id,
            operator_name='Bob QA',
            operator_role='QA_SPECIALIST'
        )

    # 4. SLM Operator approving Step 2 -> Allowed
    order = OrderService.advance_order(
        order.id,
        operator_name='John SLM',
        operator_role='PRODUCTION_OPERATOR'
    )
    assert order.current_step.sequence_order == 3


@pytest.mark.django_db
def test_api_endpoint_handles_domain_exceptions_cleanly(api_client, setup_domain2_env):
    """
    Integration: Verifies DRF API endpoint catches domain exceptions and returns HTTP 400 with message.
    """
    steps = setup_domain2_env['steps']
    res = setup_domain2_env['resources'][0]

    order = Order.objects.create(
        case_id='CAS-API-ERR',
        patient_ref='PT-ERR',
        implant_type='CRANIAL_PLATE',
        current_step=steps[0]
    )

    # Test RBAC rejection via authenticated user with unauthorized role
    user_op = User.objects.create_user(username='op_d2_test', password='Password123!')
    OperatorProfile.objects.create(user=user_op, role=OperatorProfile.Role.PRODUCTION_OPERATOR)
    api_client.force_authenticate(user=user_op)

    res_rbac = api_client.post(
        f'/api/orders/{order.id}/advance/',
        {'operator_name': 'Operator John'},
        format='json'
    )
    assert res_rbac.status_code == 400
    assert "not authorized" in res_rbac.json()['error']

    # Test insufficient inventory via authenticated user with authorized role
    user_bio = User.objects.create_user(username='bio_d2_test', password='Password123!')
    OperatorProfile.objects.create(user=user_bio, role=OperatorProfile.Role.BIOMEDICAL_ENGINEER)
    api_client.force_authenticate(user=user_bio)

    res_stock = api_client.post(
        f'/api/orders/{order.id}/advance/',
        {
            'operator_name': 'Biomedical Specialist',
            'resources': [{'resource_id': res.id, 'quantity': 999999.00}]
        },
        format='json'
    )
    assert res_stock.status_code == 400
    assert "Insufficient stock" in res_stock.json()['error']
