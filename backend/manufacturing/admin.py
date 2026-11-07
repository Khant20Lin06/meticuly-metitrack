"""
Django Admin Configuration for MetiTrack MES.
Provides shop-floor supervision and audit visibility for regulatory compliance (ISO 13485 / FDA 21 CFR Part 11).
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ProcessStep,
    Resource,
    Order,
    OrderResourceConsumption,
    OrderStepLog,
    OperatorProfile,
    SecurityAuditEvent,
)


@admin.register(ProcessStep)
class ProcessStepAdmin(admin.ModelAdmin):
    list_display = ('sequence_order', 'code', 'name', 'resource_count')
    list_display_links = ('sequence_order', 'name')
    ordering = ('sequence_order',)
    search_fields = ('code', 'name', 'description')

    def resource_count(self, obj):
        return len(obj.suggested_resource_ids)
    resource_count.short_description = "Suggested Resources"


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'unit', 'cost_per_unit', 'total_available')
    list_filter = ('category', 'unit')
    search_fields = ('name',)
    ordering = ('category', 'name')


class OrderResourceConsumptionInline(admin.TabularInline):
    model = OrderResourceConsumption
    extra = 0
    readonly_fields = ('step', 'resource', 'quantity', 'logged_at', 'logged_by')
    can_delete = False


class OrderStepLogInline(admin.TabularInline):
    model = OrderStepLog
    extra = 0
    readonly_fields = ('from_step', 'to_step', 'transitioned_at', 'operator_name', 'notes')
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('case_id', 'implant_type', 'priority_badge', 'status_badge', 'current_step', 'created_at')
    list_filter = ('status', 'priority', 'implant_type', 'current_step')
    search_fields = ('case_id', 'patient_ref')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [OrderStepLogInline, OrderResourceConsumptionInline]

    def priority_badge(self, obj):
        color = '#ef4444' if obj.priority == Order.Priority.URGENT else '#10b981'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_priority_display()
        )
    priority_badge.short_description = "Priority"

    def status_badge(self, obj):
        color_map = {
            Order.Status.COMPLETED: '#10b981',
            Order.Status.IN_PROGRESS: '#06b6d4',
            Order.Status.PENDING: '#f59e0b',
            Order.Status.CANCELLED: '#6b7280',
        }
        color = color_map.get(obj.status, '#ffffff')
        return format_html(
            '<span style="background-color: {}; color: #000; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = "Status"


@admin.register(OrderResourceConsumption)
class OrderResourceConsumptionAdmin(admin.ModelAdmin):
    list_display = ('order', 'step', 'resource', 'quantity', 'unit', 'logged_at', 'logged_by')
    list_filter = ('step', 'resource__category', 'logged_at')
    search_fields = ('order__case_id', 'resource__name', 'logged_by')
    readonly_fields = ('logged_at',)

    def unit(self, obj):
        return obj.resource.unit
    unit.short_description = "Unit"


@admin.register(OrderStepLog)
class OrderStepLogAdmin(admin.ModelAdmin):
    list_display = ('order', 'from_step', 'to_step', 'operator_name', 'transitioned_at')
    list_filter = ('from_step', 'to_step', 'transitioned_at')
    search_fields = ('order__case_id', 'operator_name', 'notes')
    readonly_fields = ('order', 'from_step', 'to_step', 'transitioned_at', 'operator_name', 'notes')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OperatorProfile)
class OperatorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'badge_number', 'certification_id', 'key_fingerprint')
    list_filter = ('role',)
    search_fields = ('user__username', 'badge_number', 'certification_id', 'key_fingerprint')
    readonly_fields = ('key_fingerprint', 'public_key_pem')


@admin.register(SecurityAuditEvent)
class SecurityAuditEventAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'severity_badge', 'event_type', 'actor_username', 'endpoint', 'status_code')
    list_filter = ('severity', 'event_type', 'timestamp')
    search_fields = ('actor_username', 'endpoint', 'ip_address')
    readonly_fields = ('timestamp', 'severity', 'event_type', 'actor_username', 'ip_address', 'user_agent', 'endpoint', 'method', 'status_code', 'details')

    def severity_badge(self, obj):
        color_map = {
            SecurityAuditEvent.Severity.CRITICAL: '#ef4444',
            SecurityAuditEvent.Severity.WARNING: '#f59e0b',
            SecurityAuditEvent.Severity.INFO: '#10b981',
        }
        color = color_map.get(obj.severity, '#94a3b8')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_severity_display()
        )
    severity_badge.short_description = "Severity"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
