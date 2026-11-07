import pytest
from django.db import connection
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Order, OperatorProfile
from manufacturing.services import PHIEncryptionService


@pytest.fixture
def crypto_env(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code="STEP_CAD_CRYPTO", name="3D CAD Planning")
    user = User.objects.create_user(username="crypto_admin", password="AdminPassword2026!", is_superuser=True)
    OperatorProfile.objects.create(user=user, role=OperatorProfile.Role.ADMIN)
    return {'step1': step1, 'user': user}


class TestPHIEncryptionAndCookieSecurity:
    """
    HIPAA Security Rule & OWASP A03/A07 Verification Suite:
    1. AES-256-GCM Field-Level Encryption (FLE) for Patient Protected Health Information (PHI).
    2. Zero-Trust Dual-Channel Authentication with HttpOnly & SameSite=Lax cookies for XSS defense.
    """

    def test_phi_encryption_service_encrypt_and_decrypt(self):
        """
        HIPAA 45 CFR § 164.312(a)(2)(iv): Verify AES-256-GCM encryption & decryption primitives.
        """
        original_ref = "PT-CONFIDENTIAL-MEDICAL-MRN-888"
        cipher1 = PHIEncryptionService.encrypt(original_ref)
        cipher2 = PHIEncryptionService.encrypt(original_ref)

        assert cipher1.startswith("enc:v1:")
        assert cipher2.startswith("enc:v1:")
        # Randomized 96-bit nonces guarantee distinct ciphertexts for identical plaintext (CWE-329 defense)
        assert cipher1 != cipher2

        # Decryption accurately recovers plaintext
        decrypted1 = PHIEncryptionService.decrypt(cipher1)
        decrypted2 = PHIEncryptionService.decrypt(cipher2)
        assert decrypted1 == original_ref
        assert decrypted2 == original_ref

        # Legacy unencrypted strings pass through unharmed
        assert PHIEncryptionService.decrypt("PT-LEGACY-001") == "PT-LEGACY-001"
        assert PHIEncryptionService.encrypt(cipher1) == cipher1  # Idempotent

    @pytest.mark.django_db
    def test_patient_ref_encrypted_at_rest_in_raw_database(self, crypto_env):
        """
        HIPAA Security Rule: Order.patient_ref MUST be encrypted at rest in the database.
        Raw SQL queries MUST NOT see plaintext patient identifiers.
        """
        secret_patient_ref = "PT-TOP-SECRET-HOSPITAL-MRN-999"
        order = Order.objects.create(
            case_id="CAS-PHI-ENC-001",
            patient_ref=secret_patient_ref,
            implant_type=Order.ImplantType.CRANIAL_PLATE,
            current_step=crypto_env['step1']
        )

        # 1. Raw SQL query directly on the database engine
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT patient_ref FROM manufacturing_order WHERE case_id = %s;",
                [order.case_id]
            )
            raw_db_row = cursor.fetchone()
            assert raw_db_row is not None
            raw_db_patient_ref = raw_db_row[0]

        # In the database table, data is AES-256-GCM ciphertext
        assert raw_db_patient_ref.startswith("enc:v1:")
        assert secret_patient_ref not in raw_db_patient_ref

        # 2. Django ORM transparently decrypts for authorized business logic
        order.refresh_from_db()
        assert order.patient_ref == secret_patient_ref

    @pytest.mark.django_db
    def test_tampered_ciphertext_fails_gracefully(self, crypto_env):
        """
        AES-256-GCM AEAD Tag Verification: Altered ciphertext is detected and handles safely.
        """
        original_ref = "PT-IMMUTABLE-001"
        cipher = PHIEncryptionService.encrypt(original_ref)

        # Flip characters in ciphertext
        tampered_cipher = cipher[:-5] + "XXXXX"
        decrypted = PHIEncryptionService.decrypt(tampered_cipher)
        # Authentication tag mismatch prevents decryption of corrupted data
        assert decrypted != original_ref

    @pytest.mark.django_db
    def test_encrypted_patient_ref_searchable_via_api(self, api_client, crypto_env):
        """
        Search Invariant: Clinicians can search by patient reference keyword even though
        the field is encrypted at rest in the database with AES-256-GCM.
        """
        Order.objects.create(
            case_id="CAS-SEARCH-PHI-1",
            patient_ref="PT-CHIANGMAI-PATIENT-100",
            implant_type=Order.ImplantType.HIP_ACETABULAR_CUP,
            current_step=crypto_env['step1']
        )
        Order.objects.create(
            case_id="CAS-SEARCH-PHI-2",
            patient_ref="PT-BANGKOK-PATIENT-200",
            implant_type=Order.ImplantType.SPINAL_CAGE,
            current_step=crypto_env['step1']
        )

        # Search for 'CHIANGMAI'
        res_search = api_client.get('/api/orders/?search=CHIANGMAI')
        assert res_search.status_code == 200
        data = res_search.json()
        assert len(data) == 1
        assert data[0]['case_id'] == "CAS-SEARCH-PHI-1"
        assert data[0]['patient_ref'] == "PT-CHIANGMAI-PATIENT-100"

        # Search for non-existent keyword
        res_none = api_client.get('/api/orders/?search=NONEXISTENT_SURGERY')
        assert res_none.status_code == 200
        assert len(res_none.json()) == 0

    @pytest.mark.django_db
    def test_httponly_cookie_authentication_neutralizes_xss_token_theft(self, unauthenticated_client, crypto_env):
        """
        OWASP A03 / A07 Defense:
        1. Login endpoint issues access_token and refresh_token in HttpOnly, SameSite=Lax cookies.
        2. Client can execute authenticated API requests using ONLY the HttpOnly cookie without
           sending the Authorization: Bearer header.
        3. Prevents XSS Token Theft: client-side scripts (document.cookie) cannot steal credentials.
        """
        # 1. Login with valid credentials
        login_res = unauthenticated_client.post(
            '/api/auth/token/',
            {'username': 'crypto_admin', 'password': 'AdminPassword2026!'},
            format='json'
        )
        assert login_res.status_code == 200
        assert 'access' in login_res.data
        assert 'access_token' in login_res.cookies

        # Verify cookie security flags
        access_cookie = login_res.cookies['access_token']
        assert access_cookie['httponly'] is True
        assert access_cookie['samesite'] in ['Lax', 'Strict']
        assert access_cookie.value == login_res.data['access']

        # 2. Create fresh client with NO Authorization header
        cookie_client = APIClient()
        cookie_client.cookies['access_token'] = access_cookie.value

        # Make request to protected endpoint (requires authentication)
        order_res = cookie_client.get('/api/orders/')
        assert order_res.status_code == 200, "Failed: HttpOnly cookie authentication was not accepted!"
        assert isinstance(order_res.json(), list)

    @pytest.mark.django_db
    def test_auth_logout_revokes_httponly_cookies(self, unauthenticated_client, crypto_env):
        """
        Session Lifecycle: POST /api/auth/logout/ clears session cookies and logs audit event.
        """
        # 1. Login
        login_res = unauthenticated_client.post(
            '/api/auth/token/',
            {'username': 'crypto_admin', 'password': 'AdminPassword2026!'},
            format='json'
        )
        assert login_res.status_code == 200
        token = login_res.cookies['access_token'].value

        client = APIClient()
        client.cookies['access_token'] = token

        # 2. Call logout
        logout_res = client.post('/api/auth/logout/')
        assert logout_res.status_code == 200
        assert "Session cookies revoked" in logout_res.json()['message']

        # Verify cookie is cleared/expired
        deleted_cookie = logout_res.cookies.get('access_token')
        assert deleted_cookie is not None
        assert deleted_cookie.value == '' or deleted_cookie['max-age'] == 0
