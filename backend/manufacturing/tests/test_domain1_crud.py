import pytest
from decimal import Decimal
from django.db.models import ProtectedError
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Resource, Order, OrderStepLog, OrderResourceConsumption





@pytest.fixture
def setup_domain1_data(db):
    """
    Sets up baseline master data for Domain 1 (CRUD & Persistence).
    """
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
        total_available=Decimal('50000.00')
    )
    res_machine = Resource.objects.create(
        name='SLM 280 3D Printer #1',
        category=Resource.Category.MACHINE_TIME,
        unit=Resource.Unit.HOURS,
        cost_per_unit=Decimal('75.00'),
        total_available=Decimal('500.00')
    )
    res_labor = Resource.objects.create(
        name='Biomedical Engineer Labor',
        category=Resource.Category.LABOR,
        unit=Resource.Unit.HOURS,
        cost_per_unit=Decimal('50.00'),
        total_available=Decimal('1000.00')
    )

    return {
        'steps': [step1, step2, step3, step4, step5],
        'resources': [res_titanium, res_machine, res_labor]
    }


@pytest.mark.django_db
def test_create_order_persists_with_defaults(api_client, setup_domain1_data):
    """
    CRUD: Create Order persists the record with default IN_PROGRESS status and links to Step 1.
    """
    payload = {
        'case_id': 'CAS-CRUD-001',
        'patient_ref': 'PT-BKK-001',
        'implant_type': 'CRANIAL_PLATE',
        'priority': 'URGENT'
    }
    response = api_client.post('/api/orders/', payload, format='json')
    assert response.status_code == 201

    data = response.json()
    assert data['case_id'] == 'CAS-CRUD-001'
    assert data['patient_ref'] == 'PT-BKK-001'
    assert data['priority'] == 'URGENT'
    assert data['status'] == 'IN_PROGRESS'
    assert data['current_step']['sequence_order'] == 1

    # Verify database persistence
    order = Order.objects.get(case_id='CAS-CRUD-001')
    assert order.current_step.code == 'STEP_CAD'
    assert order.step_logs.count() == 1
    assert order.step_logs.first().operator_name == 'Intake Coordinator'


@pytest.mark.django_db
def test_create_order_duplicate_case_id_rejected(api_client, setup_domain1_data):
    """
    CRUD: Enforce unique constraint on case_id at the serializer and DB layer.
    """
    payload = {
        'case_id': 'CAS-DUP-001',
        'patient_ref': 'PT-01',
        'implant_type': 'SPINAL_CAGE'
    }
    res1 = api_client.post('/api/orders/', payload, format='json')
    assert res1.status_code == 201

    # Attempt duplicate
    res2 = api_client.post('/api/orders/', payload, format='json')
    assert res2.status_code == 400
    assert 'already exists' in str(res2.json())


@pytest.mark.django_db
def test_list_orders_with_filtering_and_search(api_client, setup_domain1_data):
    """
    CRUD: List orders with query filtering (status, priority) and keyword search.
    """
    steps = setup_domain1_data['steps']

    Order.objects.create(
        case_id='CAS-FILTER-1',
        patient_ref='PT-ALPHA-BKK',
        implant_type='CRANIAL_PLATE',
        priority=Order.Priority.URGENT,
        status=Order.Status.IN_PROGRESS,
        current_step=steps[0]
    )
    Order.objects.create(
        case_id='CAS-FILTER-2',
        patient_ref='PT-BETA-CNX',
        implant_type='HIP_ACETABULAR_CUP',
        priority=Order.Priority.STANDARD,
        status=Order.Status.IN_PROGRESS,
        current_step=steps[1]
    )
    Order.objects.create(
        case_id='CAS-FILTER-3',
        patient_ref='PT-GAMMA-PKT',
        implant_type='SPINAL_CAGE',
        priority=Order.Priority.STANDARD,
        status=Order.Status.COMPLETED,
        current_step=steps[4]
    )

    # 1. Filter by status=IN_PROGRESS
    r_status = api_client.get('/api/orders/?status=IN_PROGRESS')
    assert r_status.status_code == 200
    assert len(r_status.json()) == 2

    # 2. Filter by priority=URGENT
    r_prio = api_client.get('/api/orders/?priority=URGENT')
    assert r_prio.status_code == 200
    assert len(r_prio.json()) == 1
    assert r_prio.json()[0]['case_id'] == 'CAS-FILTER-1'

    # 3. Search by patient_ref keyword 'CNX'
    r_search = api_client.get('/api/orders/?search=CNX')
    assert r_search.status_code == 200
    assert len(r_search.json()) == 1
    assert r_search.json()[0]['case_id'] == 'CAS-FILTER-2'


@pytest.mark.django_db
def test_read_order_detail_with_relations(api_client, setup_domain1_data):
    """
    CRUD: Retrieve order detail returns pre-fetched relations and calculated aggregations.
    """
    steps = setup_domain1_data['steps']
    res_ti = setup_domain1_data['resources'][0]

    order = Order.objects.create(
        case_id='CAS-DETAIL-001',
        patient_ref='PT-DETAIL',
        implant_type='MANDIBULAR_RECON',
        current_step=steps[1]
    )

    OrderResourceConsumption.objects.create(
        order=order,
        step=steps[0],
        resource=res_ti,
        quantity=Decimal('120.00'),
        logged_by='CAD Designer'
    )

    response = api_client.get(f'/api/orders/{order.id}/')
    assert response.status_code == 200
    data = response.json()

    assert data['case_id'] == 'CAS-DETAIL-001'
    assert data['current_step']['code'] == 'STEP_PRINT'
    assert data['total_cost'] == float(Decimal('120.00') * Decimal('1.50'))
    assert len(data['resource_summary']) == 1
    assert data['resource_summary'][0]['name'] == 'Titanium Powder Ti-6Al-4V'


@pytest.mark.django_db
def test_update_order_metadata_crud(api_client, setup_domain1_data):
    """
    CRUD: PATCH updates metadata (priority, patient_ref) cleanly without altering state.
    """
    steps = setup_domain1_data['steps']
    order = Order.objects.create(
        case_id='CAS-META-001',
        patient_ref='PT-OLD-REF',
        implant_type='CRANIAL_PLATE',
        priority=Order.Priority.STANDARD,
        current_step=steps[0]
    )

    patch_payload = {
        'priority': 'URGENT',
        'patient_ref': 'PT-NEW-REF-CONFIDENTIAL',
        'status': 'COMPLETED'  # Should be ignored by UpdateOrderMetadataSerializer
    }

    response = api_client.patch(f'/api/orders/{order.id}/', patch_payload, format='json')
    assert response.status_code == 200

    order.refresh_from_db()
    assert order.priority == Order.Priority.URGENT
    assert order.patient_ref == 'PT-NEW-REF-CONFIDENTIAL'
    # Status remains IN_PROGRESS because state progression belongs to Domain 2
    assert order.status == Order.Status.IN_PROGRESS


@pytest.mark.django_db
def test_fetch_process_steps_ordered(api_client, setup_domain1_data):
    """
    CRUD: GET /api/steps/ returns the complete list of 5 steps in strictly ordered sequence.
    """
    response = api_client.get('/api/steps/')
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 5
    sequences = [s['sequence_order'] for s in data]
    assert sequences == [1, 2, 3, 4, 5]


@pytest.mark.django_db
def test_resource_inventory_crud_and_balances(api_client, setup_domain1_data):
    """
    CRUD: Resource inventory balance listing, creation, and updating.
    """
    # 1. List and filter resources
    r_list = api_client.get('/api/resources/?category=MATERIAL')
    assert r_list.status_code == 200
    assert len(r_list.json()) == 1
    assert r_list.json()[0]['category'] == 'MATERIAL'

    # 2. Create new consumable resource
    new_res_payload = {
        'name': 'Sterile Tyvek Pouch',
        'category': 'MATERIAL',
        'unit': 'UNITS',
        'cost_per_unit': '12.50',
        'total_available': '2500.00'
    }
    r_create = api_client.post('/api/resources/', new_res_payload, format='json')
    assert r_create.status_code == 201
    created_id = r_create.json()['id']

    # 3. Update stock balance
    r_patch = api_client.patch(f'/api/resources/{created_id}/', {'total_available': '2450.00'}, format='json')
    assert r_patch.status_code == 200
    assert float(r_patch.json()['total_available']) == 2450.00


@pytest.mark.django_db
def test_consumptions_ledger_endpoint(api_client, setup_domain1_data):
    """
    CRUD: Query the resource consumption ledger with order filtering.
    """
    steps = setup_domain1_data['steps']
    res = setup_domain1_data['resources'][0]

    order = Order.objects.create(
        case_id='CAS-LEDGER-01',
        patient_ref='PT-LEDGER',
        implant_type='CRANIAL_PLATE',
        current_step=steps[0]
    )

    OrderResourceConsumption.objects.create(
        order=order,
        step=steps[0],
        resource=res,
        quantity=Decimal('85.50'),
        logged_by='Operator Jack'
    )

    response = api_client.get(f'/api/consumptions/?order={order.id}')
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]['order'] == order.id
    assert data[0]['resource_name'] == 'Titanium Powder Ti-6Al-4V'
    assert float(data[0]['quantity']) == 85.50


@pytest.mark.django_db
def test_relational_integrity_foreign_key_protections(setup_domain1_data):
    """
    Persistence Invariant: Attempting to delete a ProcessStep or Resource referenced by active orders
    is protected at the database level by models.PROTECT.
    """
    steps = setup_domain1_data['steps']
    res = setup_domain1_data['resources'][0]

    order = Order.objects.create(
        case_id='CAS-PROTECT-01',
        patient_ref='PT-PROTECT',
        implant_type='SPINAL_CAGE',
        current_step=steps[0]
    )

    OrderResourceConsumption.objects.create(
        order=order,
        step=steps[0],
        resource=res,
        quantity=Decimal('10.00'),
        logged_by='Protector'
    )

    # Attempting to delete the step must raise ProtectedError
    with pytest.raises(ProtectedError):
        steps[0].delete()

    # Attempting to delete the resource must raise ProtectedError
    with pytest.raises(ProtectedError):
        res.delete()
