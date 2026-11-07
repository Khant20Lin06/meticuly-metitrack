import pytest
from decimal import Decimal
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient
from manufacturing.models import OperatorProfile


@pytest.fixture(autouse=True)
def auto_clean_rate_limit_cache():
    """
    Clears cache before and after every test to prevent rate-limiting cache bleed (OWASP A04).
    """
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def plant_admin_user(db):
    """
    Provides a certified Plant Administrator user with full ISO 13485 supervisory credentials.
    """
    user, _ = User.objects.get_or_create(
        username='plant_admin_auto',
        defaults={'email': 'admin@meticuly.com', 'is_superuser': True}
    )
    user.set_password('AdminSecurePass2026!')
    user.save()

    OperatorProfile.objects.get_or_create(
        user=user,
        defaults={
            'role': OperatorProfile.Role.ADMIN,
            'title': 'Plant Administrator',
            'badge_number': 'METI-ADM-AUTO',
            'certification_id': 'ISO-13485-ADM-AUTO'
        }
    )
    return user


@pytest.fixture
def api_client(plant_admin_user):
    """
    Standard test client, pre-authenticated as certified Plant Administrator (ADMIN).
    Enforces Zero Trust: calls to protected endpoints succeed with verified credentials.
    """
    client = APIClient()
    client.force_authenticate(user=plant_admin_user)
    return client


@pytest.fixture
def unauthenticated_client():
    """
    Explicitly unauthenticated client for testing 401 Unauthorized / anonymous exploit boundaries.
    """
    return APIClient()
