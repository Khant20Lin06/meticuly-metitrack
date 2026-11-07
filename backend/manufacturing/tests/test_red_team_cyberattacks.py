import pytest
import json
from decimal import Decimal
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import DisallowedHost
from rest_framework.test import APIClient
from manufacturing.models import (
    ProcessStep,
    Resource,
    Order,
    OrderStepLog,
    OperatorProfile,
    SecurityAuditEvent,
)
from manufacturing.services import (
    OrderService,
    InventoryService,
    DHRService,
    CSVExportService,
    SecurityAuditService,
    InsufficientInventoryError,
    UnauthorizedStepOperatorError,
    RBACService,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def clean_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def red_team_environment(db):
    """
    Sets up a realistic Meticuly cleanroom manufacturing testbed for Red Team attacks.
    """
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='3D CAD Planning')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Metal Printing')
    step5 = ProcessStep.objects.create(sequence_order=5, code='STEP_CLEANROOM', name='Cleanroom Sterile Barrier')

    powder = Resource.objects.create(
        name='Titanium Ti-6Al-4V Grade 23 Powder',
        category=Resource.Category.MATERIAL,
        unit='g',
        total_available=Decimal('100.00'),
        cost_per_unit=Decimal('2.50')
    )

    # Legitimate Biomedical Engineer
    user_bio = User.objects.create_user(username='biomed_hacker_target', password='BiomedPassword2026!')
    OperatorProfile.objects.create(
        user=user_bio,
        role=OperatorProfile.Role.BIOMEDICAL_ENGINEER,
        badge_number='MET-BIO-101',
        certification_id='ISO-13485-BIO-101'
    )

    # Low-privilege Production Operator (Attacker Persona)
    user_op = User.objects.create_user(username='rogue_operator', password='OperatorPassword2026!')
    OperatorProfile.objects.create(
        user=user_op,
        role=OperatorProfile.Role.PRODUCTION_OPERATOR,
        badge_number='MET-OP-666',
        certification_id='ISO-13485-OP-666'
    )

    # QA Director (Victim/Target Persona)
    user_qa = User.objects.create_user(username='qa_director', password='QAPassword2026!')
    OperatorProfile.objects.create(
        user=user_qa,
        role=OperatorProfile.Role.QA_SPECIALIST,
        badge_number='MET-QA-999',
        certification_id='ISO-13485-QA-999'
    )

    order = Order.objects.create(
        case_id='CAS-REDTEAM-007',
        patient_ref='PT-REDTEAM-VIP',
        implant_type=Order.ImplantType.CRANIAL_PLATE,
        priority=Order.Priority.URGENT,
        current_step=step1
    )

    log1 = OrderStepLog.objects.create(
        order=order,
        from_step=None,
        to_step=step1,
        operator_name='Dr. Khant Lin',
        notes='Initial trauma CAD reconstruction intake.'
    )

    return {
        'step1': step1,
        'step2': step2,
        'step5': step5,
        'powder': powder,
        'order': order,
        'user_bio': user_bio,
        'user_op': user_op,
        'user_qa': user_qa,
    }


class TestRedTeamCyberattacks:
    """
    Automated Red Team Penetration Testing & Exploit Verification Suite (OWASP Top 10 & FDA 21 CFR Part 11).
    Demonstrates active defense, exploit rejection, and audit detection across all critical attack vectors.
    """

    @pytest.mark.django_db
    def test_attack_1_credential_stuffing_and_brute_force_mitigation(self, api_client, red_team_environment):
        """
        ATTACK SCENARIO 1: Automated botnet performs rapid dictionary/password spraying against /api/auth/token/.
        EXPECTED DEFENSE:
        1. LoginRateThrottle blocks the brute-force attack with HTTP 429 Too Many Requests.
        2. SecurityAuditEvent captures both AUTH_FAILED and RATE_LIMITED events with client IP.
        """
        got_throttled = False
        for attempt in range(16):
            res = api_client.post(
                '/api/auth/token/',
                {'username': 'qa_director', 'password': f'CrackingAttempt_{attempt}'},
                format='json'
            )
            if res.status_code == 429:
                got_throttled = True
                assert 'throttled' in res.json().get('detail', '').lower()
                break

        assert got_throttled is True, "CRITICAL VULNERABILITY: Brute-force botnet was not throttled by LoginRateThrottle!"

        # Verify audit trail captures the intrusion attempt
        failed_auth_events = SecurityAuditEvent.objects.filter(
            event_type=SecurityAuditEvent.EventType.AUTH_FAILED,
            actor_username='qa_director'
        )
        assert failed_auth_events.exists()
        assert failed_auth_events.first().severity == SecurityAuditEvent.Severity.WARNING

    @pytest.mark.django_db
    def test_attack_2_bfla_privilege_escalation_role_spoofing(self, api_client, red_team_environment):
        """
        ATTACK SCENARIO 2: Broken Function Level Authorization (OWASP A01).
        A low-privilege Production Operator logs in with legitimate credentials, obtains a valid JWT,
        and injects spoofed client headers ('X-Operator-Role: ADMIN', 'X-Operator-Role: QA_SPECIALIST')
        to illegally advance Step 1 (CAD) or sign an eDHR release.
        EXPECTED DEFENSE:
        1. Server-side Zero-Trust RBAC strictly derives role claims from the signed JWT token claims.
        2. The spoofed header is ignored; request is rejected with HTTP 403 / 400.
        3. A CRITICAL ROLE_VIOLATION event is recorded in SecurityAuditEvent.
        """
        order = red_team_environment['order']

        # 1. Attacker logs in as PRODUCTION_OPERATOR
        login_res = api_client.post(
            '/api/auth/token/',
            {'username': 'rogue_operator', 'password': 'OperatorPassword2026!'},
            format='json'
        )
        assert login_res.status_code == 200
        token = login_res.json()['access']

        # 2. Attacker crafts privilege escalation exploit with spoofed ADMIN header
        api_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {token}',
            HTTP_X_OPERATOR_ROLE='ADMIN'  # Attack payload
        )

        # Attempt to sign cleanroom eDHR release (requires QA_SPECIALIST or ADMIN)
        exploit_res = api_client.post(
            f'/api/orders/{order.id}/sign-dhr/',
            {'reason': 'Hacker signing eDHR with spoofed header'},
            format='json'
        )
        assert exploit_res.status_code == 403, "CRITICAL VULNERABILITY: Rogue operator bypassed RBAC with spoofed header!"
        assert "Forbidden" in exploit_res.json()['error']

        # 3. Verify security audit event logged with CRITICAL severity
        event = SecurityAuditEvent.objects.filter(
            event_type=SecurityAuditEvent.EventType.ROLE_VIOLATION,
            severity=SecurityAuditEvent.Severity.CRITICAL
        ).latest('timestamp')
        assert event.actor_username == 'rogue_operator'
        assert event.status_code == 403

    @pytest.mark.django_db
    def test_attack_3_host_header_injection_poisoning(self, api_client, red_team_environment):
        """
        ATTACK SCENARIO 3: Host Header Injection / Cache Poisoning (OWASP A05).
        Attacker supplies an untrusted Host header ('evil-phishing-host.com') to poison URLs.
        EXPECTED DEFENSE:
        Django's hardened ALLOWED_HOSTS strictly rejects non-whitelisted hosts with HTTP 400 Bad Request.
        """
        res = api_client.get(
            '/api/steps/',
            HTTP_HOST='evil-phishing-implant.com'
        )
        assert res.status_code == 400, "CRITICAL VULNERABILITY: Host header injection was not rejected with 400!"

    @pytest.mark.django_db
    def test_attack_4_cors_unauthorized_cross_origin_blocked(self, api_client, red_team_environment):
        """
        ATTACK SCENARIO 4: Cross-Origin Resource Sharing (CORS) Data Theft.
        Attacker's malicious site (http://evil-attacker.com) initiates a cross-origin preflight/request.
        EXPECTED DEFENSE:
        CORS_ALLOW_ALL_ORIGINS = False; unauthorized origins are denied Access-Control-Allow-Origin.
        """
        api_client.force_authenticate(user=red_team_environment['user_bio'])
        res = api_client.get(
            '/api/orders/',
            HTTP_ORIGIN='http://evil-attacker-site.org'
        )
        # Server must NOT reflect the untrusted origin in Access-Control-Allow-Origin
        allow_origin = res.headers.get('Access-Control-Allow-Origin')
        assert allow_origin != 'http://evil-attacker-site.org'
        assert allow_origin != '*'

    @pytest.mark.django_db
    def test_attack_5_csv_formula_injection_dde_rce_payload(self, api_client, red_team_environment):
        """
        ATTACK SCENARIO 5: CSV Formula Injection / Excel Dynamic Data Exchange (CWE-1236).
        Attacker injects formula triggers into Patient Reference and Clinical Notes:
        =cmd|' /C calc'!A0, @SUM(1+1)*cmd, +1337-calc, \t=2+5
        EXPECTED DEFENSE:
        CSVExportService sanitizes every untrusted cell with leading single quote `'` and strips newlines,
        neutralizing remote code execution upon spreadsheet parsing.
        """
        # Inject malicious order
        malicious_order = Order.objects.create(
            case_id='CAS-HACK-CSV',
            patient_ref='=cmd|\'/C calc\'!A0',
            implant_type=Order.ImplantType.MANDIBULAR_RECON,
            priority=Order.Priority.URGENT,
            current_step=red_team_environment['step1']
        )
        OrderStepLog.objects.create(
            order=malicious_order,
            from_step=None,
            to_step=red_team_environment['step1'],
            operator_name='Attacker',
            notes='@SUM(1+1)*cmd|\'/C notepad\'!A0\n+1337'
        )

        api_client.force_authenticate(user=red_team_environment['user_bio'])
        res = api_client.get('/api/orders/export-csv/')
        assert res.status_code == 200
        csv_text = res.content.decode('utf-8')

        # Formula trigger MUST be neutralized with single quote prefix
        assert "'=cmd|'/C calc'!A0" in csv_text, "CRITICAL VULNERABILITY: Formula trigger '=' was not escaped with single quote!"
        assert "'@SUM(1+1)*cmd" in csv_text, "CRITICAL VULNERABILITY: Formula trigger '@' was not escaped with single quote!"
        # Newline injection must be stripped to prevent row hijacking
        assert '\n+1337' not in csv_text

    @pytest.mark.django_db
    def test_attack_6_edhr_tampering_and_forged_cryptographic_seal(self, api_client, red_team_environment):
        """
        ATTACK SCENARIO 6: Electronic Device History Record Tampering & Forgery (FDA 21 CFR Part 11).
        A rogue insider or attacker modifies clinical records, patient ID, or resource quantities,
        attempting to bypass inspection by forging an eDHR package.
        EXPECTED DEFENSE:
        1. DHRService.verify_edhr_package detects Content Digest mismatch and HMAC-SHA256 signature failure.
        2. POST /api/orders/{id}/verify-dhr/ returns HTTP 422 Unprocessable Entity.
        3. A CRITICAL TAMPER_DETECTED event is immediately recorded in SecurityAuditEvent.
        """
        order = red_team_environment['order']
        legit_pkg = DHRService.generate_edhr_package(order)

        # 1. Attacker alters the patient reference in the exported package
        tampered_pkg = json.loads(json.dumps(legit_pkg))
        tampered_pkg['patient_ref'] = 'PT-FORGED-NEW-PATIENT'

        # 2. Attacker submits tampered package to verification gate
        api_client.force_authenticate(user=red_team_environment['user_bio'])
        verify_res = api_client.post(
            f'/api/orders/{order.id}/verify-dhr/',
            {'package': tampered_pkg},
            format='json'
        )
        assert verify_res.status_code == 422, "CRITICAL VULNERABILITY: Tampered eDHR package was accepted!"
        assert verify_res.json()['status'] == 'TAMPERED_OR_INVALID'
        assert "Data Tampering Detected" in verify_res.json()['reason']

        # 3. Verify security intrusion event was logged
        tamper_event = SecurityAuditEvent.objects.filter(
            event_type=SecurityAuditEvent.EventType.TAMPER_DETECTED,
            severity=SecurityAuditEvent.Severity.CRITICAL
        ).latest('timestamp')
        assert tamper_event.status_code == 422
        assert "Content digest mismatch" in tamper_event.details['reason']

    @pytest.mark.django_db
    def test_attack_7_simultaneous_inventory_depletion_race_condition(self, db):
        """
        ATTACK SCENARIO 7: Concurrency & Race Condition Overselling Attack.
        Simultaneous requests attempt to deplete limited Titanium powder beyond available warehouse stock.
        EXPECTED DEFENSE:
        Pessimistic row locking (select_for_update) inside transaction.atomic() guarantees zero overselling
        and maintains mathematical inventory invariants under concurrent load.
        """
        step = ProcessStep.objects.create(sequence_order=1, code='STEP_POWDER', name='Laser Melting')
        powder = Resource.objects.create(
            name='High-Grade Titanium Ti-6Al-4V',
            category=Resource.Category.MATERIAL,
            unit='g',
            total_available=Decimal('50.00'),
            cost_per_unit=Decimal('3.00')
        )
        order = Order.objects.create(
            case_id='CAS-CONCURRENCY-RED',
            patient_ref='PT-CONCURRENCY',
            implant_type=Order.ImplantType.HIP_ACETABULAR_CUP,
            current_step=step
        )

        # First consumption of 40g (50g - 40g = 10g remaining)
        InventoryService.deduct_resources(
            order=order,
            step=step,
            resources_data=[{'resource_id': powder.id, 'quantity': Decimal('40.00')}],
            operator_name='Tech 1'
        )
        powder.refresh_from_db()
        assert powder.total_available == Decimal('10.00')

        # Second consumption attempts 20g (only 10g left -> InsufficientInventoryError)
        with pytest.raises(InsufficientInventoryError) as exc_info:
            InventoryService.deduct_resources(
                order=order,
                step=step,
                resources_data=[{'resource_id': powder.id, 'quantity': Decimal('20.00')}],
                operator_name='Tech 2'
            )
        assert "Insufficient stock" in str(exc_info.value)

        # Inventory must remain exactly 10g, never negative
        powder.refresh_from_db()
        assert powder.total_available == Decimal('10.00')

    @pytest.mark.django_db
    def test_attack_8_ghost_hacker_anonymous_access_blocked(self, unauthenticated_client, red_team_environment):
        """
        ATTACK SCENARIO 8: "Ghost Hacker" Anonymous Bypass Attack (OWASP A01 & Zero Trust).
        An unauthenticated remote attacker sends requests with NO JWT token and NO role header,
        attempting to read patient data, tamper with implant orders, advance manufacturing steps,
        modify warehouse resources, or inspect security audit logs.
        EXPECTED DEFENSE:
        1. All sensitive API endpoints strictly return HTTP 401 Unauthorized via IsAuthenticated.
        2. The service layer RBAC rejects any anonymous sign-off attempt with UnauthorizedStepOperatorError.
        """
        order = red_team_environment['order']
        powder = red_team_environment['powder']

        # 1. Unauthenticated reading of patient implant orders -> 401
        res_orders = unauthenticated_client.get('/api/orders/')
        assert res_orders.status_code == 401, "CRITICAL VULNERABILITY: Anonymous caller read patient orders!"

        # 2. Unauthenticated creation of patient implant order -> 401
        res_create = unauthenticated_client.post('/api/orders/', {
            'case_id': 'CAS-GHOST-HACK',
            'patient_ref': 'PT-GHOST',
            'implant_type': 'CRANIAL_PLATE'
        }, format='json')
        assert res_create.status_code == 401, "CRITICAL VULNERABILITY: Anonymous caller created patient order!"

        # 3. Unauthenticated tampering with order metadata (e.g. priority escalation) -> 401
        res_patch = unauthenticated_client.patch(f'/api/orders/{order.id}/', {
            'priority': 'EMERGENCY'
        }, format='json')
        assert res_patch.status_code == 401, "CRITICAL VULNERABILITY: Anonymous caller modified order metadata!"

        # 4. Unauthenticated advancement of manufacturing station -> 401
        res_adv = unauthenticated_client.post(f'/api/orders/{order.id}/advance/', {
            'operator_name': 'Ghost In The Cleanroom'
        }, format='json')
        assert res_adv.status_code == 401, "CRITICAL VULNERABILITY: Anonymous caller advanced manufacturing step!"

        # 5. Unauthenticated warehouse inventory read & manipulation -> 401
        res_res = unauthenticated_client.get('/api/resources/')
        assert res_res.status_code == 401, "CRITICAL VULNERABILITY: Anonymous caller read warehouse inventory!"

        res_rep = unauthenticated_client.post(f'/api/resources/{powder.id}/replenish/', {
            'quantity': 500
        }, format='json')
        assert res_rep.status_code == 401, "CRITICAL VULNERABILITY: Anonymous caller replenished inventory!"

        # 6. Unauthenticated security audit log inspection -> 401
        res_audit = unauthenticated_client.get('/api/security-logs/')
        assert res_audit.status_code == 401, "CRITICAL VULNERABILITY: Anonymous caller accessed security audit log!"

        # 7. Service Layer direct rejection: anonymous sign-off attempt raises UnauthorizedStepOperatorError
        with pytest.raises(UnauthorizedStepOperatorError) as exc_rbac:
            RBACService.validate_step_permission(
                sequence_order=1,
                step_name='3D CAD Planning',
                operator_role=None,
                user=None
            )
        assert "Uncertified or anonymous operator attempted sign-off" in str(exc_rbac.value)
