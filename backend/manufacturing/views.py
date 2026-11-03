from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Sum, Count
from decimal import Decimal

from .models import ProcessStep, Resource, Order, OrderResourceConsumption, OrderStepLog
from .serializers import (
    ProcessStepSerializer,
    ResourceSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    AdvanceOrderSerializer,
    OrderResourceConsumptionSerializer,
    OrderStepLogSerializer,
)


class ProcessStepViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows manufacturing steps to be viewed.
    """
    queryset = ProcessStep.objects.all().order_by('sequence_order')
    serializer_class = ProcessStepSerializer


class ResourceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and managing plant resources (Materials, Machine Time, Labor).
    """
    queryset = Resource.objects.all().order_by('category', 'name')
    serializer_class = ResourceSerializer


class OrderViewSet(viewsets.ModelViewSet):
    """
    Primary API endpoint for tracking and managing patient implant orders.
    """
    queryset = Order.objects.select_related('current_step').prefetch_related('consumptions__resource', 'step_logs').all()

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrderSerializer
        elif self.action == 'advance':
            return AdvanceOrderSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def advance(self, request, pk=None):
        """
        Advance an order to the next sequential step and atomically record resource consumptions.
        """
        order = self.get_object()

        if order.status == Order.Status.COMPLETED:
            return Response(
                {"error": f"Case '{order.case_id}' is already completed and cannot be advanced."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.status == Order.Status.CANCELLED:
            return Response(
                {"error": f"Case '{order.case_id}' has been cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdvanceOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        operator_name = data.get('operator_name', 'Biomedical Operator')
        notes = data.get('notes', '')
        resources_input = data.get('resources', [])

        current_step = order.current_step
        next_step = current_step.get_next_step()

        with transaction.atomic():
            # Concurrency-safe lock on Order record
            locked_order = Order.objects.select_for_update().get(id=order.id)
            current_step = locked_order.current_step
            next_step = current_step.get_next_step()

            # 1. Deduct and log resource consumptions for the current step
            for item in resources_input:
                res_id = item['resource_id']
                qty = Decimal(str(item['quantity']))

                try:
                    res_obj = Resource.objects.select_for_update().get(id=res_id)
                except Resource.DoesNotExist:
                    return Response(
                        {"error": f"Resource ID {res_id} does not exist."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if res_obj.total_available < qty:
                    return Response(
                        {
                            "error": f"Insufficient inventory for '{res_obj.name}'. Available: {res_obj.total_available} {res_obj.unit}, requested: {qty} {res_obj.unit}."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Deduct inventory atomically
                res_obj.total_available = res_obj.total_available - qty
                res_obj.save(update_fields=['total_available'])

                OrderResourceConsumption.objects.create(
                    order=locked_order,
                    step=current_step,
                    resource=res_obj,
                    quantity=qty,
                    logged_by=operator_name
                )

            # 2. Advance the order or complete it
            if next_step is not None:
                locked_order.current_step = next_step
                locked_order.save(update_fields=['current_step', 'updated_at'])

                OrderStepLog.objects.create(
                    order=locked_order,
                    from_step=current_step,
                    to_step=next_step,
                    operator_name=operator_name,
                    notes=notes or f"Advanced from {current_step.name} to {next_step.name}."
                )
            else:
                # Reached end of defined sequence (Step 5 completed)
                locked_order.status = Order.Status.COMPLETED
                locked_order.save(update_fields=['status', 'updated_at'])

                OrderStepLog.objects.create(
                    order=locked_order,
                    from_step=current_step,
                    to_step=None,
                    operator_name=operator_name,
                    notes=notes or f"Completed all manufacturing steps. Dispatched to hospital."
                )

        # Refresh from DB with relations
        order.refresh_from_db()
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Returns full medical traceability timeline for this order.
        """
        order = self.get_object()
        step_logs = OrderStepLogSerializer(order.step_logs.all(), many=True).data
        consumptions = OrderResourceConsumptionSerializer(order.consumptions.all(), many=True).data

        return Response({
            "order_id": order.id,
            "case_id": order.case_id,
            "patient_ref": order.patient_ref,
            "status": order.status,
            "step_logs": step_logs,
            "consumptions": consumptions
        })


class AnalyticsOverviewView(APIView):
    """
    Aggregated manufacturing overview: total cases, order distribution by step,
    and cumulative resource consumption across materials, machines, and labor.
    """
    def get(self, request):
        total_orders = Order.objects.count()
        in_progress = Order.objects.filter(status=Order.Status.IN_PROGRESS).count()
        completed = Order.objects.filter(status=Order.Status.COMPLETED).count()

        # Orders per step
        steps = ProcessStep.objects.all().order_by('sequence_order')
        step_counts = []
        for step in steps:
            count = Order.objects.filter(current_step=step, status=Order.Status.IN_PROGRESS).count()
            step_counts.append({
                'step_id': step.id,
                'sequence_order': step.sequence_order,
                'code': step.code,
                'name': step.name,
                'order_count': count
            })

        # Resource consumption totals
        resources = Resource.objects.all().order_by('category', 'name')
        resource_stats = []
        for res in resources:
            consumed_total = OrderResourceConsumption.objects.filter(resource=res).aggregate(total=Sum('quantity'))['total'] or Decimal('0.00')
            cost_total = consumed_total * res.cost_per_unit
            resource_stats.append({
                'resource_id': res.id,
                'name': res.name,
                'category': res.category,
                'unit': res.unit,
                'total_consumed': float(consumed_total),
                'cost_per_unit': float(res.cost_per_unit),
                'total_cost': float(cost_total),
                'total_available': float(res.total_available),
            })

        return Response({
            'total_orders': total_orders,
            'in_progress': in_progress,
            'completed': completed,
            'step_distribution': step_counts,
            'resource_consumption': resource_stats
        })


class OrderStepLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Full audit trail viewset for ISO 13485 regulatory compliance inspection.
    """
    queryset = OrderStepLog.objects.select_related('order', 'from_step', 'to_step').all().order_by('-transitioned_at')
    serializer_class = OrderStepLogSerializer
