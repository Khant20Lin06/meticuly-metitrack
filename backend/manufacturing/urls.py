from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ProcessStepViewSet,
    ResourceViewSet,
    OrderViewSet,
    AnalyticsOverviewView,
    OrderStepLogViewSet,
    OrderResourceConsumptionViewSet,
    RBACRolesView,
    CustomTokenObtainPairView,
    AuthMeView,
    AuthLogoutView,
    OperatorDirectoryView,
    SecurityAuditEventViewSet,
)

router = DefaultRouter()
router.register(r'steps', ProcessStepViewSet, basename='step')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'consumptions', OrderResourceConsumptionViewSet, basename='consumption')
router.register(r'audit-logs', OrderStepLogViewSet, basename='audit-log')
router.register(r'security-logs', SecurityAuditEventViewSet, basename='security-log')

urlpatterns = [
    # JWT Authentication Endpoints (OWASP A01 & A07 Remediation)
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', AuthLogoutView.as_view(), name='auth_logout'),
    path('auth/me/', AuthMeView.as_view(), name='auth_me'),
    path('auth/operators/', OperatorDirectoryView.as_view(), name='auth_operators'),

    # Analytics & Roles
    path('analytics/overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('rbac/roles/', RBACRolesView.as_view(), name='rbac-roles'),
    path('', include(router.urls)),
]
