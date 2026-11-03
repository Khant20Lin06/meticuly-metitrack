import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Resource, Order, OrderStepLog, OrderResourceConsumption


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def setup_manufacturing_environment(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='3D CAD Planning')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Metal Printing')
    step3 = ProcessStep.objects.create(sequence_order=3, code='STEP_CNC', name='CNC Machining')
    step4 = ProcessStep.objects.create(sequence_order=4, code='STEP_QA', name='QA Inspection')
    step5 = ProcessStep.objects.create(sequence_order=5, code='STEP_LABEL', name='Packaging & Delivery')

    res_titanium = Resource.objects.create(
        name='Titanium Powder Ti-6Al-4V',
        category=Resource.Category.MATERIAL,
        unit=Resource.Unit.GRAMS,
        cost_per_unit=Decimal('1.50'),
        total_available=Decimal('10000.00')
    )
    res_labor = Resource.objects.create(
        name='Biomedical Engineer Labor',
        category=Resource.Category.LABOR,
        unit=Resource.Unit.HOURS,
        cost_per_unit=Decimal('50.00'),
        total_available=Decimal('500.00')
    )

    return {
        'steps': [step1, step2, step3, step4, step5],
        'resources': [res_titanium, res_labor]
    }


@pytest.mark.django_db
def test_create_order_places_at_step_1(api_client, setup_manufacturing_environment):
    payload = {
        'case_id': 'CAS-TEST-001',
        'patient_ref': 'PT-TEST-A',
        'implant_type': 'CRANIAL_PLATE',
        'priority': 'URGENT'
    }
    response = api_client.post('/api/orders/', payload, format='json')
    assert response.status_code == 201
    data = response.json()
    assert data['case_id'] == 'CAS-TEST-001'
    assert data['status'] == 'IN_PROGRESS'
    assert data['current_step']['sequence_order'] == 1
    assert data['current_step']['code'] == 'STEP_CAD'

    # Verify audit log was created
    order = Order.objects.get(case_id='CAS-TEST-001')
    assert order.step_logs.count() == 1
    assert order.step_logs.first().to_step.code == 'STEP_CAD'


@pytest.mark.django_db
def test_advance_order_sequentially_with_resources(api_client, setup_manufacturing_environment):
    steps = setup_manufacturing_environment['steps']
    res_titanium = setup_manufacturing_environment['resources'][0]

    order = Order.objects.create(
        case_id='CAS-TEST-002',
        patient_ref='PT-TEST-B',
        implant_type='HIP_ACETABULAR_CUP',
        status=Order.Status.IN_PROGRESS,
        current_step=steps[0]
    )

    advance_payload = {
        'operator_name': 'Biomedical Specialist Khant',
        'notes': 'CAD approved by surgical team.',
        'resources': [
            {
                'resource_id': res_titanium.id,
                'quantity': 150.0
            }
        ]
    }

    response = api_client.post(f'/api/orders/{order.id}/advance/', advance_payload, format='json')
    assert response.status_code == 200
    data = response.json()

    # Must be at step 2 now
    assert data['current_step']['sequence_order'] == 2
    assert data['current_step']['code'] == 'STEP_PRINT'

    # Verify resource was recorded
    consumptions = OrderResourceConsumption.objects.filter(order=order)
    assert consumptions.count() == 1
    assert consumptions.first().quantity == Decimal('150.00')

    # Verify step log
    step_log = OrderStepLog.objects.filter(order=order).first()
    assert step_log.from_step.code == 'STEP_CAD'
    assert step_log.to_step.code == 'STEP_PRINT'
    assert step_log.operator_name == 'Biomedical Specialist Khant'


@pytest.mark.django_db
def test_advance_through_final_step_completes_order(api_client, setup_manufacturing_environment):
    steps = setup_manufacturing_environment['steps']

    # Place order at step 5
    order = Order.objects.create(
        case_id='CAS-TEST-005',
        patient_ref='PT-TEST-FINAL',
        implant_type='SPINAL_CAGE',
        status=Order.Status.IN_PROGRESS,
        current_step=steps[4]
    )

    advance_payload = {
        'operator_name': 'QA & Logistics Lead',
        'notes': 'Final UDI label applied and sealed for shipment.'
    }

    response = api_client.post(f'/api/orders/{order.id}/advance/', advance_payload, format='json')
    assert response.status_code == 200
    data = response.json()

    assert data['status'] == 'COMPLETED'
    assert data['can_advance'] is False


@pytest.mark.django_db
def test_advance_completed_order_fails(api_client, setup_manufacturing_environment):
    steps = setup_manufacturing_environment['steps']

    order = Order.objects.create(
        case_id='CAS-TEST-COMPLETED',
        patient_ref='PT-TEST-C',
        implant_type='CRANIAL_PLATE',
        status=Order.Status.COMPLETED,
        current_step=steps[4]
    )

    response = api_client.post(f'/api/orders/{order.id}/advance/', {}, format='json')
    assert response.status_code == 400
    assert "already completed" in response.json()['error']


@pytest.mark.django_db
def test_negative_or_zero_resource_rejected(api_client, setup_manufacturing_environment):
    steps = setup_manufacturing_environment['steps']
    res = setup_manufacturing_environment['resources'][0]

    order = Order.objects.create(
        case_id='CAS-TEST-NEG',
        patient_ref='PT-TEST-D',
        implant_type='CRANIAL_PLATE',
        status=Order.Status.IN_PROGRESS,
        current_step=steps[0]
    )

    bad_payload = {
        'operator_name': 'Operator',
        'resources': [
            {
                'resource_id': res.id,
                'quantity': -25.0
            }
        ]
    }

    response = api_client.post(f'/api/orders/{order.id}/advance/', bad_payload, format='json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_analytics_overview_returns_correct_kpis(api_client, setup_manufacturing_environment):
    steps = setup_manufacturing_environment['steps']

    Order.objects.create(
        case_id='CAS-A1',
        patient_ref='PT-1',
        implant_type='CRANIAL_PLATE',
        status=Order.Status.IN_PROGRESS,
        current_step=steps[0]
    )
    Order.objects.create(
        case_id='CAS-A2',
        patient_ref='PT-2',
        implant_type='HIP_ACETABULAR_CUP',
        status=Order.Status.COMPLETED,
        current_step=steps[4]
    )

    response = api_client.get('/api/analytics/overview/')
    assert response.status_code == 200
    data = response.json()
    assert data['total_orders'] == 2
    assert data['in_progress'] == 1
    assert data['completed'] == 1
    assert len(data['step_distribution']) == 5


@pytest.mark.django_db
def test_advance_order_deducts_inventory_and_prevents_stockout(api_client, setup_manufacturing_environment):
    steps = setup_manufacturing_environment['steps']
    res = setup_manufacturing_environment['resources'][0]  # total_available = 10000.00

    order = Order.objects.create(
        case_id='CAS-TEST-INV',
        patient_ref='PT-TEST-INV',
        implant_type='CRANIAL_PLATE',
        status=Order.Status.IN_PROGRESS,
        current_step=steps[0]
    )

    # 1. Successful deduction
    payload = {
        'operator_name': 'Operator',
        'resources': [{'resource_id': res.id, 'quantity': 1000.00}]
    }
    response = api_client.post(f'/api/orders/{order.id}/advance/', payload, format='json')
    assert response.status_code == 200
    res.refresh_from_db()
    assert res.total_available == Decimal('9000.00')

    # 2. Over-consumption attempt (requesting more than available)
    bad_payload = {
        'operator_name': 'Operator',
        'resources': [{'resource_id': res.id, 'quantity': 9500.00}]
    }
    response2 = api_client.post(f'/api/orders/{order.id}/advance/', bad_payload, format='json')
    assert response2.status_code == 400
    assert "Insufficient inventory" in response2.json()['error']

