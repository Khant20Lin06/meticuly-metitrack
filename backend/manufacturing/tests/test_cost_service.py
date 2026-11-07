import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Resource, Order, OrderResourceConsumption
from manufacturing.services import CostService





@pytest.fixture
def setup_cost_testbed(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='3D CAD Planning')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Metal Printing')
    step3 = ProcessStep.objects.create(sequence_order=3, code='STEP_CNC', name='CNC Machining')

    res_ti = Resource.objects.create(
        name='Titanium Powder ELI',
        category=Resource.Category.MATERIAL,
        unit=Resource.Unit.GRAMS,
        cost_per_unit=Decimal('1.25'),
        total_available=Decimal('10000.00')
    )
    res_printer = Resource.objects.create(
        name='SLM 280 Printer',
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

    order = Order.objects.create(
        case_id='CAS-COST-001',
        patient_ref='PT-COST-REF',
        implant_type='CRANIAL_PLATE',
        current_step=step2
    )

    return {
        'steps': [step1, step2, step3],
        'resources': {'ti': res_ti, 'printer': res_printer, 'labor': res_labor},
        'order': order
    }


@pytest.mark.django_db
def test_cumulative_cost_formula_across_materials_machines_labor(setup_cost_testbed):
    """
    User Specification:
    Total Case Cost = SUM(Quantity * Unit Cost)
    ပစ္စည်းကုန်ကျမှု၊ စက်နာရီနှင့် အင်ဂျင်နီယာ လုပ်အားခများကို အချိန်နှင့်တပြေးညီ ပေါင်းစပ်တွက်ချက်သည်။
    """
    order = setup_cost_testbed['order']
    steps = setup_cost_testbed['steps']
    res = setup_cost_testbed['resources']

    # Step 1: Labor (2.5 hours @ $50.00 = $125.00)
    OrderResourceConsumption.objects.create(
        order=order,
        step=steps[0],
        resource=res['labor'],
        quantity=Decimal('2.50'),
        logged_by='CAD Designer'
    )

    # Step 2: Titanium Material (140g @ $1.25 = $175.00)
    OrderResourceConsumption.objects.create(
        order=order,
        step=steps[1],
        resource=res['ti'],
        quantity=Decimal('140.00'),
        logged_by='SLM Operator'
    )

    # Step 2: Machine Time (4.0 hours @ $75.00 = $300.00)
    OrderResourceConsumption.objects.create(
        order=order,
        step=steps[1],
        resource=res['printer'],
        quantity=Decimal('4.00'),
        logged_by='SLM Operator'
    )

    # Execute Cost Calculation
    cost_summary = CostService.calculate_order_cost(order)

    # Assert Mathematical Invariants:
    # Material: 140 * 1.25 = 175.00
    # Machine: 4.0 * 75.00 = 300.00
    # Labor: 2.5 * 50.00 = 125.00
    # Total: 175.00 + 300.00 + 125.00 = 600.00
    assert cost_summary['cost_breakdown']['material_cost'] == 175.00
    assert cost_summary['cost_breakdown']['machine_cost'] == 300.00
    assert cost_summary['cost_breakdown']['labor_cost'] == 125.00
    assert cost_summary['total_cost'] == 600.00

    # Assert Step-by-Step accumulation
    step_costs = cost_summary['step_costs']
    assert len(step_costs) == 2
    assert step_costs[0]['step_name'] == '3D CAD Planning'
    assert step_costs[0]['step_cost'] == 125.00
    assert step_costs[1]['step_name'] == '3D Metal Printing'
    assert step_costs[1]['step_cost'] == 475.00  # 175 material + 300 machine


@pytest.mark.django_db
def test_zero_cost_when_no_consumptions(setup_cost_testbed):
    """
    An order with zero logged consumptions must have total_cost == 0.00.
    """
    order = setup_cost_testbed['order']
    cost_summary = CostService.calculate_order_cost(order)

    assert cost_summary['total_cost'] == 0.00
    assert cost_summary['cost_breakdown']['material_cost'] == 0.00
    assert cost_summary['cost_breakdown']['machine_cost'] == 0.00
    assert cost_summary['cost_breakdown']['labor_cost'] == 0.00
    assert len(cost_summary['step_costs']) == 0


@pytest.mark.django_db
def test_order_serializer_includes_cost_breakdown(api_client, setup_cost_testbed):
    """
    API Invariant: GET /api/orders/{id}/ returns total_cost and categorical cost_breakdown.
    """
    order = setup_cost_testbed['order']
    res = setup_cost_testbed['resources']
    step = setup_cost_testbed['steps'][0]

    OrderResourceConsumption.objects.create(
        order=order,
        step=step,
        resource=res['ti'],
        quantity=Decimal('80.00'),  # 80g * 1.25 = $100.00
        logged_by='Operator'
    )

    response = api_client.get(f'/api/orders/{order.id}/')
    assert response.status_code == 200
    data = response.json()

    assert data['total_cost'] == 100.00
    assert 'cost_breakdown' in data
    assert data['cost_breakdown']['material_cost'] == 100.00
    assert data['cost_breakdown']['machine_cost'] == 0.00
    assert data['cost_breakdown']['labor_cost'] == 0.00


@pytest.mark.django_db
def test_order_cost_breakdown_detail_endpoint(api_client, setup_cost_testbed):
    """
    API Invariant: GET /api/orders/{id}/cost-breakdown/ returns granular itemized accounting.
    """
    order = setup_cost_testbed['order']
    res = setup_cost_testbed['resources']
    step = setup_cost_testbed['steps'][1]

    OrderResourceConsumption.objects.create(
        order=order,
        step=step,
        resource=res['printer'],
        quantity=Decimal('2.00'),  # 2h * $75.00 = $150.00
        logged_by='Machinist'
    )

    response = api_client.get(f'/api/orders/{order.id}/cost-breakdown/')
    assert response.status_code == 200
    data = response.json()

    assert data['order_id'] == order.id
    assert data['case_id'] == order.case_id
    assert data['total_cost'] == 150.00
    assert data['cost_breakdown']['machine_cost'] == 150.00
    assert len(data['step_costs']) == 1
    assert data['step_costs'][0]['step_name'] == '3D Metal Printing'


@pytest.mark.django_db
def test_plant_wide_cost_analytics_endpoint(api_client, setup_cost_testbed):
    """
    API Invariant: GET /api/analytics/overview/ returns plant-wide financial summary.
    """
    order = setup_cost_testbed['order']
    res = setup_cost_testbed['resources']
    step = setup_cost_testbed['steps'][0]

    OrderResourceConsumption.objects.create(
        order=order,
        step=step,
        resource=res['labor'],
        quantity=Decimal('10.00'),  # 10h * 50 = $500.00
        logged_by='Engineer'
    )

    response = api_client.get('/api/analytics/overview/')
    assert response.status_code == 200
    data = response.json()

    assert 'financial_summary' in data
    fin = data['financial_summary']
    assert fin['labor_cost'] >= 500.00
    assert fin['grand_total_cost'] >= 500.00
    assert 'average_cost_per_case' in fin
