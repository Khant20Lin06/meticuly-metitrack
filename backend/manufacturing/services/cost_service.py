from decimal import Decimal
from django.db.models import Sum, F, DecimalField
from django.db.models.functions import Coalesce
from manufacturing.models import Order, OrderResourceConsumption, Resource, ProcessStep


class CostService:
    """
    Dedicated Financial & Cost Accounting Domain Service.
    Formula: Total Case Cost = SUM(Quantity * Unit Cost)
    Categorizes costs by:
    - Raw Material (Titanium Ti-6Al-4V ELI powder, sterile packaging)
    - Machine Capacity (SLM 3D printing hours, 5-axis CNC hours)
    - Skilled Engineering Labor (Biomedical CAD design, QA inspection)
    """

    @classmethod
    def calculate_order_cost(cls, order: Order) -> dict:
        """
        Calculates cumulative case cost and granular breakdown for a single order.
        """
        consumptions = order.consumptions.select_related('resource', 'step').all()

        material_cost = Decimal('0.00')
        machine_cost = Decimal('0.00')
        labor_cost = Decimal('0.00')

        step_breakdown = {}
        for c in consumptions:
            item_cost = c.quantity * c.resource.cost_per_unit
            cat = c.resource.category

            if cat == Resource.Category.MATERIAL:
                material_cost += item_cost
            elif cat == Resource.Category.MACHINE_TIME:
                machine_cost += item_cost
            elif cat == Resource.Category.LABOR:
                labor_cost += item_cost

            step_id = c.step.id
            if step_id not in step_breakdown:
                step_breakdown[step_id] = {
                    'step_id': step_id,
                    'step_sequence': c.step.sequence_order,
                    'step_name': c.step.name,
                    'step_cost': Decimal('0.00'),
                    'items': []
                }
            step_breakdown[step_id]['step_cost'] += item_cost
            step_breakdown[step_id]['items'].append({
                'resource_name': c.resource.name,
                'category': cat,
                'quantity': float(c.quantity),
                'unit': c.resource.unit,
                'cost_per_unit': float(c.resource.cost_per_unit),
                'total_cost': float(item_cost)
            })

        total_cost = material_cost + machine_cost + labor_cost

        return {
            'order_id': order.id,
            'case_id': order.case_id,
            'total_cost': float(total_cost),
            'cost_breakdown': {
                'material_cost': float(material_cost),
                'machine_cost': float(machine_cost),
                'labor_cost': float(labor_cost),
            },
            'step_costs': sorted(
                [
                    {
                        **v,
                        'step_cost': float(v['step_cost'])
                    }
                    for v in step_breakdown.values()
                ],
                key=lambda x: x['step_sequence']
            )
        }

    @classmethod
    def get_plant_cost_analytics(cls) -> dict:
        """
        Aggregates plant-wide cumulative manufacturing expenditures across all cases.
        """
        consumptions = OrderResourceConsumption.objects.select_related('resource').all()

        total_material = Decimal('0.00')
        total_machine = Decimal('0.00')
        total_labor = Decimal('0.00')

        for c in consumptions:
            cost = c.quantity * c.resource.cost_per_unit
            cat = c.resource.category
            if cat == Resource.Category.MATERIAL:
                total_material += cost
            elif cat == Resource.Category.MACHINE_TIME:
                total_machine += cost
            elif cat == Resource.Category.LABOR:
                total_labor += cost

        grand_total = total_material + total_machine + total_labor
        total_orders = Order.objects.count()
        avg_cost = (grand_total / Decimal(str(total_orders))) if total_orders > 0 else Decimal('0.00')

        return {
            'grand_total_cost': float(grand_total),
            'total_plant_cost': float(grand_total),
            'material_cost': float(total_material),
            'machine_cost': float(total_machine),
            'labor_cost': float(total_labor),
            'average_cost_per_case': float(avg_cost),
        }
