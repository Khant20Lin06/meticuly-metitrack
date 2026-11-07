from decimal import Decimal
from django.db import transaction
from manufacturing.models import Resource, OrderResourceConsumption, ProcessStep, Order
from .exceptions import DomainValidationError, InsufficientInventoryError


class InventoryService:
    """
    Dedicated Domain Service managing:
    - Automated Stock Depletion: Stock_new = Stock_old - quantity
    - Stock Availability Validation
    - Inventory Restocking & Adjustments
    - Safety Stock Threshold Monitoring
    """

    SAFETY_STOCK_THRESHOLDS = {
        Resource.Category.MATERIAL: Decimal('2000.00'),      # e.g., 2000g Titanium powder
        Resource.Category.MACHINE_TIME: Decimal('50.00'),    # 50 machine hours
        Resource.Category.LABOR: Decimal('100.00'),          # 100 labor hours
    }

    @classmethod
    def deduct_resources(
        cls,
        order: Order,
        step: ProcessStep,
        resources_data: list,
        operator_name: str = "Biomedical Operator"
    ) -> list:
        """
        Deducts consumable inventory balances atomically with pessimistic row locking.
        Formula: Stock_new = Stock_old - quantity
        Raises InsufficientInventoryError if Stock_old < quantity.
        """
        if not resources_data:
            return []

        # 1. Deterministic sort to eliminate database deadlocks
        sorted_resources = sorted(resources_data, key=lambda x: int(x.get('resource_id', 0)))
        logged_consumptions = []

        for item in sorted_resources:
            res_id = item.get('resource_id')
            qty_raw = item.get('quantity')

            try:
                qty = Decimal(str(qty_raw))
            except (ValueError, TypeError):
                raise DomainValidationError(f"Invalid quantity '{qty_raw}' for resource ID {res_id}.")

            if qty <= Decimal('0.00'):
                raise DomainValidationError(f"Resource consumption quantity must be greater than zero. Got {qty}.")

            # 2. Pessimistic lock on the consumable resource
            try:
                res_obj = Resource.objects.select_for_update().get(id=res_id)
            except Resource.DoesNotExist:
                raise DomainValidationError(f"Resource ID {res_id} does not exist in plant inventory.")

            # 3. Stock balance invariant check: Stock_old >= quantity
            if res_obj.total_available < qty:
                raise InsufficientInventoryError(
                    f"Insufficient stock for '{res_obj.name}'. "
                    f"Available balance: {res_obj.total_available} {res_obj.unit}, "
                    f"Requested consumption: {qty} {res_obj.unit}."
                )

            # 4. Atomic depletion formula: Stock_new = Stock_old - quantity
            res_obj.total_available -= qty
            res_obj.save(update_fields=['total_available'])

            # 5. Ledger record creation
            consumption = OrderResourceConsumption.objects.create(
                order=order,
                step=step,
                resource=res_obj,
                quantity=qty,
                logged_by=operator_name
            )
            logged_consumptions.append(consumption)

        return logged_consumptions

    @classmethod
    def replenish_stock(
        cls,
        resource_id: int,
        quantity: Decimal,
        operator_name: str = "Inventory Manager",
        notes: str = ""
    ) -> Resource:
        """
        Replenishes plant resource stock balance.
        Formula: Stock_new = Stock_old + quantity
        """
        try:
            qty = Decimal(str(quantity))
        except (ValueError, TypeError):
            raise DomainValidationError(f"Invalid replenishment quantity '{quantity}'.")

        if qty <= Decimal('0.00'):
            raise DomainValidationError(f"Replenishment quantity must be greater than zero. Got {qty}.")

        with transaction.atomic():
            try:
                res_obj = Resource.objects.select_for_update().get(id=resource_id)
            except Resource.DoesNotExist:
                raise DomainValidationError(f"Resource ID {resource_id} does not exist.")

            res_obj.total_available += qty
            res_obj.save(update_fields=['total_available'])

        return res_obj

    @classmethod
    def get_stock_health(cls, resource_id: int = None) -> list:
        """
        Evaluates stock health against safety stock thresholds.
        """
        qs = Resource.objects.all().order_by('category', 'name')
        if resource_id:
            qs = qs.filter(id=resource_id)

        results = []
        for res in qs:
            threshold = cls.SAFETY_STOCK_THRESHOLDS.get(res.category, Decimal('100.00'))
            is_low = res.total_available <= threshold
            results.append({
                'resource_id': res.id,
                'name': res.name,
                'category': res.category,
                'unit': res.unit,
                'total_available': float(res.total_available),
                'safety_threshold': float(threshold),
                'is_low_stock': is_low,
                'cost_per_unit': float(res.cost_per_unit)
            })

        return results
