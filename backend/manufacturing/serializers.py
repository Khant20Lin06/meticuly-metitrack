from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from decimal import Decimal
from .models import ProcessStep, Resource, Order, OrderResourceConsumption, OrderStepLog, OperatorProfile, SecurityAuditEvent


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
    cost_breakdown = serializers.SerializerMethodField()
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
            'cost_breakdown',
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

    def get_cost_breakdown(self, obj):
        from .services import CostService
        return CostService.calculate_order_cost(obj)['cost_breakdown']

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
    operator_name = serializers.CharField(max_length=100, required=False, default="Intake Coordinator")
    notes = serializers.CharField(required=False, allow_blank=True, default="Case registered into MetiTrack manufacturing queue.")

    class Meta:
        model = Order
        fields = [
            'case_id',
            'patient_ref',
            'implant_type',
            'priority',
            'operator_name',
            'notes',
        ]

    def validate_case_id(self, value):
        val = value.strip().upper()
        if Order.objects.filter(case_id=val).exists():
            raise serializers.ValidationError(f"Case ID '{val}' already exists.")
        return val

    def create(self, validated_data):
        operator_name = validated_data.pop('operator_name', 'Intake Coordinator')
        notes = validated_data.pop('notes', 'Case registered into MetiTrack manufacturing queue.')

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
            operator_name=operator_name or "Intake Coordinator",
            notes=notes or "Case registered into MetiTrack manufacturing queue."
        )
        return order


class UpdateOrderMetadataSerializer(serializers.ModelSerializer):
    """
    Pure CRUD metadata update serializer.
    Only allows updating non-workflow fields (patient_ref, priority).
    State progression and step transitions are strictly guarded and handled via advance RPC.
    """
    class Meta:
        model = Order
        fields = [
            'patient_ref',
            'priority',
        ]


class ResourceInputItemSerializer(serializers.Serializer):
    resource_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))


class AdvanceOrderSerializer(serializers.Serializer):
    operator_name = serializers.CharField(max_length=100, default="Biomedical Operator")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    resources = ResourceInputItemSerializer(many=True, required=False, default=list)
    expected_step_sequence = serializers.IntegerField(required=False, allow_null=True, default=None)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that injects verified operator role, clinical title,
    badge number, and authorized steps into both the JWT token claims and login response.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        profile = getattr(user, 'operator_profile', None)
        role = profile.role if profile else ('ADMIN' if user.is_superuser else 'GUEST')
        full_name = user.get_full_name() or user.username

        token['username'] = user.username
        token['name'] = full_name
        token['role'] = role
        token['badge_number'] = profile.badge_number if profile else ''
        token['is_superuser'] = user.is_superuser

        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        profile = getattr(user, 'operator_profile', None)
        role = profile.role if profile else ('ADMIN' if user.is_superuser else 'GUEST')
        full_name = user.get_full_name() or user.username

        from .services import RBACService
        step_permissions = []
        for step_num, allowed_roles in RBACService.STEP_ROLE_PERMISSIONS.items():
            if role in allowed_roles:
                step_permissions.append(step_num)

        data['user'] = {
            'id': user.id,
            'username': user.username,
            'name': full_name,
            'email': user.email,
            'role': role,
            'title': profile.title if profile else ('Plant Administrator' if user.is_superuser else 'Operator'),
            'badge_number': profile.badge_number if profile else 'METI-OP',
            'certification_id': profile.certification_id if profile else 'ISO-13485-CERT',
            'authorized_steps': step_permissions,
            'is_superuser': user.is_superuser,
        }
        return data


class OperatorDirectoryItemSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.CharField(source='operator_profile.role', default='ADMIN')
    title = serializers.CharField(source='operator_profile.title', default='Operator')
    badge_number = serializers.CharField(source='operator_profile.badge_number', default='METI-00')
    authorized_steps = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'name',
            'email',
            'role',
            'title',
            'badge_number',
            'authorized_steps',
        ]

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_authorized_steps(self, obj):
        from .services import RBACService
        role = getattr(obj.operator_profile, 'role', 'ADMIN') if hasattr(obj, 'operator_profile') else ('ADMIN' if obj.is_superuser else 'GUEST')
        return [step for step, roles in RBACService.STEP_ROLE_PERMISSIONS.items() if role in roles]


class SecurityAuditEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)

    class Meta:
        model = SecurityAuditEvent
        fields = [
            'id',
            'event_type',
            'event_type_display',
            'severity',
            'severity_display',
            'actor_username',
            'ip_address',
            'user_agent',
            'endpoint',
            'method',
            'status_code',
            'details',
            'timestamp',
        ]
        read_only_fields = fields

