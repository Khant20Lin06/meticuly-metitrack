from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProcessStepViewSet,
    ResourceViewSet,
    OrderViewSet,
    AnalyticsOverviewView,
    OrderStepLogViewSet
)

router = DefaultRouter()
router.register(r'steps', ProcessStepViewSet, basename='step')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'audit-logs', OrderStepLogViewSet, basename='audit-log')

urlpatterns = [
    path('analytics/overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('', include(router.urls)),
]
