import pytest
from django.conf import settings
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from manufacturing.models import ProcessStep, Order, OperatorProfile





def test_cors_settings_are_hardened():
    """Verify that wildcard CORS origins are strictly disabled (OWASP A01 & A05)."""
    assert settings.CORS_ALLOW_ALL_ORIGINS is False
    assert 'http://localhost:3001' in settings.CORS_ALLOWED_ORIGINS
    assert 'http://localhost:3000' in settings.CORS_ALLOWED_ORIGINS


def test_allowed_hosts_does_not_contain_wildcard():
    """Verify that wildcard '*' is eliminated from ALLOWED_HOSTS (OWASP A05)."""
    assert '*' not in settings.ALLOWED_HOSTS
    assert 'localhost' in settings.ALLOWED_HOSTS
    assert '127.0.0.1' in settings.ALLOWED_HOSTS


def test_security_headers_are_configured():
    """Verify that browser security headers are enabled."""
    assert settings.SECURE_BROWSER_XSS_FILTER is True
    assert settings.SECURE_CONTENT_TYPE_NOSNIFF is True
    assert settings.X_FRAME_OPTIONS == 'DENY'
    assert settings.SESSION_COOKIE_HTTPONLY is True
    assert settings.CSRF_COOKIE_HTTPONLY is True


@pytest.mark.django_db
def test_api_responses_include_security_headers(api_client):
    """Verify live API endpoints output nosniff and clickjacking protection headers."""
    response = api_client.get('/api/steps/')
    assert response.status_code == 200
    assert response.headers.get('X-Frame-Options') == 'DENY'
    assert response.headers.get('X-Content-Type-Options') == 'nosniff'


@pytest.mark.django_db
def test_authenticated_token_overrides_spoofed_header(unauthenticated_client, db):
    """
    CRITICAL OWASP TEST:
    Verify that an authenticated operator with role QA_SPECIALIST CANNOT spoof
    X-Operator-Role: ADMIN to advance a Step 1 (CAD) order.
    The server MUST enforce the cryptographically verified JWT identity.
    """
    step1 = ProcessStep.objects.create(sequence_order=1, code="STEP_CAD_TEST", name="CAD Modeling")
    step2 = ProcessStep.objects.create(sequence_order=2, code="STEP_PRINT_TEST", name="3D Printing")

    # Create QA Specialist user
    user_qa = User.objects.create_user(
        username="sneaky_qa",
        password="ValidPassword123!"
    )
    OperatorProfile.objects.create(
        user=user_qa,
        role=OperatorProfile.Role.QA_SPECIALIST,
        title="QA Inspector"
    )

    # Order at Step 1
    order = Order.objects.create(
        case_id="CAS-SPOOF-01",
        patient_ref="PT-SPOOF-01",
        implant_type=Order.ImplantType.CRANIAL_PLATE,
        priority=Order.Priority.STANDARD,
        status=Order.Status.IN_PROGRESS,
        current_step=step1
    )

    # 1. Login to obtain legitimate JWT token
    from django.core.cache import cache
    cache.clear()
    login_res = unauthenticated_client.post('/api/auth/token/', {
        'username': 'sneaky_qa',
        'password': 'ValidPassword123!'
    }, format='json')
    token = login_res.data['access']

    # 2. Send advance request WITH legitimate token BUT WITH SPOOFED HEADER 'X-Operator-Role: ADMIN'
    unauthenticated_client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_OPERATOR_ROLE='ADMIN'  # Spoofed header attempt
    )

    adv_res = unauthenticated_client.post(f'/api/orders/{order.id}/advance/', {
        'operator_name': 'Sneaky Operator',
        'notes': 'Trying to bypass with fake ADMIN header'
    }, format='json')

    # MUST FAIL: Server MUST ignore the spoofed header and use the token's real role (QA_SPECIALIST)
    assert adv_res.status_code == 400
    assert "ISO 13485 Compliance Violation" in adv_res.data['error']
    assert "QA_SPECIALIST" in adv_res.data['error']

    # Verify order was not transitioned
    order.refresh_from_db()
    assert order.current_step.sequence_order == 1
