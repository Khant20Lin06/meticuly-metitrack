import pytest
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from manufacturing.models import (
    ProcessStep,
    Order,
    OperatorProfile,
    SecurityAuditEvent,
)
from manufacturing.services import SecurityAuditService, DHRService





@pytest.fixture(autouse=True)
def clean_cache_for_rate_limiting():
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()



@pytest.fixture
def setup_security_testbed(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='3D CAD Planning')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Metal Printing')

    order = Order.objects.create(
        case_id='CAS-SEC-AUDIT-01',
        patient_ref='PT-SEC-AUDIT',
        implant_type='CRANIAL_PLATE',
        current_step=step1
    )

    user = User.objects.create_user(username='qa_auditor', password='AuditorPassword2026!')
    OperatorProfile.objects.create(
        user=user,
        role=OperatorProfile.Role.QA_SPECIALIST,
        badge_number='MET-QA-777',
        title='QA Specialist',
        certification_id='ISO-13485-QA-777'
    )

    return {
        'step1': step1,
        'step2': step2,
        'order': order,
        'user': user,
    }


@pytest.mark.django_db
def test_failed_login_creates_security_audit_event(api_client, setup_security_testbed):
    """
    OWASP A09 & FDA 21 CFR Part 11: Failed login attempts must be logged immediately
    with client IP, username, and timestamp for intrusion detection.
    """
    initial_count = SecurityAuditEvent.objects.filter(event_type=SecurityAuditEvent.EventType.AUTH_FAILED).count()

    response = api_client.post(
        '/api/auth/token/',
        {'username': 'qa_auditor', 'password': 'WrongPassword123!'},
        format='json'
    )
    assert response.status_code == 401

    events = SecurityAuditEvent.objects.filter(
        event_type=SecurityAuditEvent.EventType.AUTH_FAILED,
        actor_username='qa_auditor'
    )
    assert events.count() == initial_count + 1
    event = events.latest('timestamp')
    assert event.severity == SecurityAuditEvent.Severity.WARNING
    assert event.endpoint == '/api/auth/token/'
    assert event.status_code == 401


@pytest.mark.django_db
def test_successful_login_creates_security_audit_event(api_client, setup_security_testbed):
    """
    OWASP A09: Successful authenticated sessions are logged for traceability.
    """
    response = api_client.post(
        '/api/auth/token/',
        {'username': 'qa_auditor', 'password': 'AuditorPassword2026!'},
        format='json'
    )
    assert response.status_code == 200
    assert 'access' in response.json()

    event = SecurityAuditEvent.objects.filter(
        event_type=SecurityAuditEvent.EventType.AUTH_SUCCESS,
        actor_username='qa_auditor'
    ).latest('timestamp')
    assert event.severity == SecurityAuditEvent.Severity.INFO
    assert event.status_code == 200


@pytest.mark.django_db
def test_unauthorized_role_violation_creates_security_audit_event(api_client, setup_security_testbed):
    """
    OWASP A01 & ISO 13485: When an operator attempts an action exceeding their authorized role,
    a CRITICAL security audit event is recorded.
    """
    order = setup_security_testbed['order']

    # Authenticate as PRODUCTION_OPERATOR (unauthorized for eDHR signature)
    op_user = User.objects.create_user(username='op_sec_test', password='Password123!')
    OperatorProfile.objects.create(user=op_user, role=OperatorProfile.Role.PRODUCTION_OPERATOR)
    api_client.force_authenticate(user=op_user)

    # Attempt to sign eDHR with unauthorized PRODUCTION_OPERATOR role
    response = api_client.post(
        f'/api/orders/{order.id}/sign-dhr/',
        {'reason': 'Unauthorized sign attempt'},
        format='json'
    )
    assert response.status_code == 403

    event = SecurityAuditEvent.objects.filter(
        event_type=SecurityAuditEvent.EventType.ROLE_VIOLATION,
        severity=SecurityAuditEvent.Severity.CRITICAL
    ).latest('timestamp')
    assert event.endpoint == f'/api/orders/{order.id}/sign-dhr/'
    assert event.status_code == 403
    assert event.details['resolved_role'] == 'PRODUCTION_OPERATOR'


@pytest.mark.django_db
def test_tamper_detection_creates_security_audit_event(api_client, setup_security_testbed):
    """
    FDA 21 CFR Part 11: When cryptographic eDHR verification detects altered data,
    a CRITICAL TAMPER_DETECTED audit log is generated.
    """
    order = setup_security_testbed['order']
    pkg = DHRService.generate_edhr_package(order)
    pkg['patient_ref'] = 'PT-TAMPERED-REF'

    response = api_client.post(
        f'/api/orders/{order.id}/verify-dhr/',
        {'package': pkg},
        format='json'
    )
    assert response.status_code == 422

    event = SecurityAuditEvent.objects.filter(
        event_type=SecurityAuditEvent.EventType.TAMPER_DETECTED,
        severity=SecurityAuditEvent.Severity.CRITICAL
    ).latest('timestamp')
    assert event.status_code == 422
    assert "Data Tampering Detected" in event.details['reason']


@pytest.mark.django_db
def test_security_audit_event_immutability(setup_security_testbed):
    """
    FDA 21 CFR Part 11 / ISO 13485 Invariant: SecurityAuditEvent records are strictly append-only.
    Updates and deletions are blocked at the ORM layer.
    """
    event = SecurityAuditEvent.objects.create(
        event_type=SecurityAuditEvent.EventType.ROLE_VIOLATION,
        severity=SecurityAuditEvent.Severity.CRITICAL,
        actor_username='attacker',
        endpoint='/api/orders/advance/',
        method='POST',
        status_code=403
    )

    # 1. Update attempt must raise ValidationError
    event.actor_username = 'innocent_user'
    with pytest.raises(ValidationError) as exc_info:
        event.save()
    assert "append-only and cannot be modified" in str(exc_info.value)

    # 2. Delete attempt must raise ValidationError
    with pytest.raises(ValidationError) as exc_info:
        event.delete()
    assert "append-only and cannot be deleted" in str(exc_info.value)


@pytest.mark.django_db
def test_security_logs_endpoint_read_only(api_client, setup_security_testbed):
    """
    API Invariant: /api/security-logs/ is strictly read-only (GET allowed, mutations blocked).
    """
    SecurityAuditEvent.objects.create(
        event_type=SecurityAuditEvent.EventType.AUTH_SUCCESS,
        severity=SecurityAuditEvent.Severity.INFO,
        actor_username='test_actor',
        endpoint='/api/auth/token/',
        method='POST',
        status_code=200
    )

    # 1. GET is allowed
    res_get = api_client.get('/api/security-logs/')
    assert res_get.status_code == 200
    assert len(res_get.json()) >= 1

    # 2. Filter by event_type
    res_filter = api_client.get('/api/security-logs/?event_type=AUTH_SUCCESS')
    assert res_filter.status_code == 200

    # 3. Mutations forbidden
    res_post = api_client.post('/api/security-logs/', {'actor_username': 'fake'}, format='json')
    assert res_post.status_code == 405

    res_del = api_client.delete('/api/security-logs/1/')
    assert res_del.status_code == 405


@pytest.mark.django_db
def test_login_rate_limiting_enforcement(unauthenticated_client, setup_security_testbed):
    """
    OWASP A04 & A07: Login endpoint enforces LoginRateThrottle.
    Exceeding rate limit returns HTTP 429 Too Many Requests.
    """
    # Overriding throttle rate dynamically for this test to trigger 429 reliably
    from rest_framework.throttling import AnonRateThrottle
    from manufacturing.throttling import LoginRateThrottle
    from django.core.cache import cache
    cache.clear()

    # Original rate is 10/min. Triggering consecutive requests from same IP.
    got_429 = False
    for i in range(15):
        res = unauthenticated_client.post(
            '/api/auth/token/',
            {'username': 'qa_auditor', 'password': 'WrongPassword!'},
            format='json'
        )
        if res.status_code == 429:
            got_429 = True
            assert 'detail' in res.json()
            assert 'throttled' in res.json()['detail'].lower() or 'request was throttled' in res.json()['detail'].lower()
            break

    # We must have encountered HTTP 429
    assert got_429 is True, "Expected HTTP 429 Too Many Requests was not triggered by rapid login attempts."
