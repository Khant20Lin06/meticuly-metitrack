from rest_framework import serializers
from decimal import Decimal
from .models import ProcessStep, Resource, Order, OrderResourceConsumption, OrderStepLog


class ProcessStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessStep
        fields = [
            'id',
            'sequence_order',
            'code',
            'name',
            'description',
            'suggested_resource_ids',
        ]


class ResourceSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)

    class Meta:
        model = Resource
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'unit',
            'unit_display',
            'cost_per_unit',
            'total_available',
        ]


class OrderResourceConsumptionSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    resource_category = serializers.CharField(source='resource.category', read_only=True)
    unit = serializers.CharField(source='resource.unit', read_only=True)
    step_name = serializers.CharField(source='step.name', read_only=True)
    cost = serializers.SerializerMethodField()

    class Meta:
        model = OrderResourceConsumption
        fields = [
            'id',
            'order',
            'step',
            'step_name',
            'resource',
            'resource_name',
            'resource_category',
            'unit',
            'quantity',
            'cost',
            'logged_at',
            'logged_by',
        ]

    def get_cost(self, obj):
        return float(obj.quantity * obj.resource.cost_per_unit)


class OrderStepLogSerializer(serializers.ModelSerializer):
    from_step_name = serializers.CharField(source='from_step.name', read_only=True)
    to_step_name = serializers.CharField(source='to_step.name', read_only=True)

    class Meta:
        model = OrderStepLog
        fields = [
            'id',
            'order',
            'from_step',
            'from_step_name',
            'to_step',
            'to_step_name',
            'transitioned_at',
            'operator_name',
            'notes',
        ]


class OrderSerializer(serializers.ModelSerializer):
    current_step = ProcessStepSerializer(read_only=True)
    implant_type_display = serializers.CharField(source='get_implant_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_advance = serializers.BooleanField(read_only=True)
    total_cost = serializers.SerializerMethodField()
    resource_summary = serializers.SerializerMethodField()
    step_logs = OrderStepLogSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'case_id',
            'patient_ref',
            'implant_type',
            'implant_type_display',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'current_step',
            'can_advance',
            'total_cost',
            'resource_summary',
            'step_logs',
            'created_at',
            'updated_at',
        ]

    def get_total_cost(self, obj):
        total = Decimal('0.00')
        for c in obj.consumptions.select_related('resource').all():
            total += c.quantity * c.resource.cost_per_unit
        return float(total)

    def get_resource_summary(self, obj):
        summary = {}
        for c in obj.consumptions.select_related('resource').all():
            res_id = c.resource.id
            if res_id not in summary:
                summary[res_id] = {
                    'resource_id': res_id,
                    'name': c.resource.name,
                    'category': c.resource.category,
                    'unit': c.resource.unit,
                    'total_quantity': 0.0,
                }
            summary[res_id]['total_quantity'] += float(c.quantity)
        return list(summary.values())


class CreateOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'case_id',
            'patient_ref',
            'implant_type',
            'priority',
        ]

    def validate_case_id(self, value):
        val = value.strip().upper()
        if Order.objects.filter(case_id=val).exists():
            raise serializers.ValidationError(f"Case ID '{val}' already exists.")
        return val

    def create(self, validated_data):
        first_step = ProcessStep.objects.order_by('sequence_order').first()
        if not first_step:
            raise serializers.ValidationError("Cannot create order: No manufacturing process steps defined.")

        order = Order.objects.create(
            current_step=first_step,
            status=Order.Status.IN_PROGRESS,
            **validated_data
        )

        OrderStepLog.objects.create(
            order=order,
            from_step=None,
            to_step=first_step,
            operator_name="Intake Coordinator",
            notes="Case registered into MetiTrack manufacturing queue."
        )
        return order


class ResourceInputItemSerializer(serializers.Serializer):
    resource_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))


class AdvanceOrderSerializer(serializers.Serializer):
    operator_name = serializers.CharField(max_length=100, default="Biomedical Operator")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    resources = ResourceInputItemSerializer(many=True, required=False, default=list)
