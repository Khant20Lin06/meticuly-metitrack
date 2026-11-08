import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Resource, Order, OrderResourceConsumption
from manufacturing.services import (
    InventoryService,
    OrderService,
    InsufficientInventoryError,
    DomainValidationError,
)





@pytest.fixture
def setup_inventory_testbed(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='CAD Planning')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Metal Printing')

    res_ti = Resource.objects.create(
        name='Medical Titanium Ti-6Al-4V ELI',
        category=Resource.Category.MATERIAL,
        unit=Resource.Unit.GRAMS,
        cost_per_unit=Decimal('1.25'),
        total_available=Decimal('1000.00')  # 1000 grams baseline
    )

    order = Order.objects.create(
        case_id='CAS-TI-140',
        patient_ref='PT-BKK-TI',
        implant_type='CRANIAL_PLATE',
        current_step=step2
    )

    return {
        'step': step2,
        'resource': res_ti,
        'order': order
    }


@pytest.mark.django_db
def test_exact_140g_titanium_depletion_formula(setup_inventory_testbed):
    """
    Specification:
    When an order consumes 140g of Titanium powder, factory inventory automatically updates:
    Stock_new = Stock_old - 140.
    """
    order = setup_inventory_testbed['order']
    step = setup_inventory_testbed['step']
    res = setup_inventory_testbed['resource']

    initial_stock = res.total_available  # 1000.00 grams
    consumption_quantity = Decimal('140.00')

    # Execute automated stock depletion
    consumptions = InventoryService.deduct_resources(
        order=order,
        step=step,
        resources_data=[{'resource_id': res.id, 'quantity': consumption_quantity}],
        operator_name="Biomedical Lead"
    )

    # 1. Assert formula: Stock_new = Stock_old - 140
    res.refresh_from_db()
    expected_stock = initial_stock - consumption_quantity  # 1000.00 - 140.00 = 860.00
    assert res.total_available == Decimal('860.00')
    assert res.total_available == expected_stock

    # 2. Assert ledger entry was recorded accurately
    assert len(consumptions) == 1
    ledger_entry = consumptions[0]
    assert ledger_entry.quantity == Decimal('140.00')
    assert ledger_entry.resource == res
    assert ledger_entry.order == order
    assert ledger_entry.step == step


@pytest.mark.django_db
def test_insufficient_inventory_error_when_exceeding_stock(setup_inventory_testbed):
    """
    Specification:
    Returns InsufficientInventoryError when consumption exceeds available stock.
    """
    order = setup_inventory_testbed['order']
    step = setup_inventory_testbed['step']
    res = setup_inventory_testbed['resource']

    # Set available stock to only 50.00 grams
    res.total_available = Decimal('50.00')
    res.save()

    # Attempt to consume 140.00 grams (exceeds 50.00 grams available)
    with pytest.raises(InsufficientInventoryError) as exc_info:
        InventoryService.deduct_resources(
            order=order,
            step=step,
            resources_data=[{'resource_id': res.id, 'quantity': Decimal('140.00')}],
            operator_name="Biomedical Lead"
        )

    error_msg = str(exc_info.value)
    assert "Insufficient stock" in error_msg
    assert "Available balance: 50.00" in error_msg
    assert "Requested consumption: 140.00" in error_msg

    # Verify stock remained untouched at 50.00
    res.refresh_from_db()
    assert res.total_available == Decimal('50.00')


@pytest.mark.django_db
def test_negative_or_zero_consumption_rejected(setup_inventory_testbed):
    """
    Domain Invariant: Negative or zero consumption quantities must be rejected.
    """
    order = setup_inventory_testbed['order']
    step = setup_inventory_testbed['step']
    res = setup_inventory_testbed['resource']

    # Test negative
    with pytest.raises(DomainValidationError):
        InventoryService.deduct_resources(
            order=order,
            step=step,
            resources_data=[{'resource_id': res.id, 'quantity': Decimal('-140.00')}]
        )

    # Test zero
    with pytest.raises(DomainValidationError):
        InventoryService.deduct_resources(
            order=order,
            step=step,
            resources_data=[{'resource_id': res.id, 'quantity': Decimal('0.00')}]
        )


@pytest.mark.django_db
def test_replenish_stock_increases_balance(setup_inventory_testbed):
    """
    Formula: Stock_new = Stock_old + quantity
    """
    res = setup_inventory_testbed['resource']  # 1000.00
    replenish_qty = Decimal('5000.00')

    updated_res = InventoryService.replenish_stock(
        resource_id=res.id,
        quantity=replenish_qty,
        operator_name="Warehouse Manager"
    )

    assert updated_res.total_available == Decimal('6000.00')
    res.refresh_from_db()
    assert res.total_available == Decimal('6000.00')


@pytest.mark.django_db
def test_stock_health_flags_low_inventory(setup_inventory_testbed):
    """
    Evaluates safety stock thresholds (e.g. Material < 2000g).
    """
    res = setup_inventory_testbed['resource']
    res.total_available = Decimal('1500.00')  # Below 2000g safety threshold
    res.save()

    health_records = InventoryService.get_stock_health(resource_id=res.id)
    assert len(health_records) == 1
    assert health_records[0]['is_low_stock'] is True
    assert health_records[0]['safety_threshold'] == 2000.0


@pytest.mark.django_db
def test_api_replenish_and_health_endpoints(api_client, setup_inventory_testbed):
    """
    Integration: REST API endpoints for inventory replenishment and health.
    """
    res = setup_inventory_testbed['resource']

    # 1. API Replenish
    r_replenish = api_client.post(
        f'/api/resources/{res.id}/replenish/',
        {'quantity': '2500.00', 'operator_name': 'Procurement'},
        format='json'
    )
    assert r_replenish.status_code == 200
    assert float(r_replenish.json()['total_available']) == 3500.00

    # 2. API Health
    r_health = api_client.get('/api/resources/health/')
    assert r_health.status_code == 200
    data = r_health.json()
    assert len(data) >= 1
    matched = [r for r in data if r['resource_id'] == res.id][0]
    assert matched['total_available'] == 3500.00
