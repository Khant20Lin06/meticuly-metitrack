import json
import pytest
from django.contrib.auth.models import User
from manufacturing.models import Order, ProcessStep, OrderStepLog, OperatorProfile
from manufacturing.services import PKIService, DHRService


@pytest.fixture
def pki_testbed(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='3D CAD Planning')
    step5 = ProcessStep.objects.create(sequence_order=5, code='STEP_QA', name='Final QA & Cleanroom Packaging')

    order = Order.objects.create(
        case_id='CAS-PKI-2026-001',
        patient_ref='PT-PKI-HIPAA-01',
        implant_type='MANDIBLE_RECONSTRUCTION',
        current_step=step5,
        status=Order.Status.COMPLETED
    )

    OrderStepLog.objects.create(
        order=order,
        from_step=step1,
        to_step=step5,
        operator_name='Dr. Somchai QA Lead',
        notes='CMM metrology dimensional verification ±20µm and ASTM F136 cleanroom pass.'
    )

    # QA Signer with PKI profile
    qa_user = User.objects.create_user(username='qa_auditor_pki', password='SecurePassword2026!')
    qa_profile = OperatorProfile.objects.create(
        user=qa_user,
        role=OperatorProfile.Role.QA_SPECIALIST,
        title='Chief Quality Assurance Auditor',
        badge_number='QA-PKI-88',
        certification_id='ISO-13485-LEAD-AUDITOR-2026'
    )
    qa_profile.ensure_pki_keypair()

    # Second QA Operator for non-repudiation and key collision tests
    alt_user = User.objects.create_user(username='alt_auditor_pki', password='SecurePassword2026!')
    alt_profile = OperatorProfile.objects.create(
        user=alt_user,
        role=OperatorProfile.Role.QA_SPECIALIST,
        title='Secondary Quality Auditor',
        badge_number='QA-PKI-99',
        certification_id='ISO-13485-AUDITOR-99'
    )
    alt_profile.ensure_pki_keypair()

    return {
        'order': order,
        'qa_user': qa_user,
        'qa_profile': qa_profile,
        'alt_user': alt_user,
        'alt_profile': alt_profile,
    }


# =====================================================================
# Unit Tests: PKIService Cryptographic Primitives
# =====================================================================

def test_pki_service_keypair_generation():
    """
    NIST FIPS 186-5 ECDSA: Generates SECP256R1 keypair and SHA-256 fingerprint.
    """
    priv, pub, fingerprint = PKIService.generate_operator_keypair()

    assert "BEGIN PRIVATE KEY" in priv
    assert "BEGIN PUBLIC KEY" in pub
    assert fingerprint.startswith("SHA256:")
    assert len(fingerprint) == 23  # 'SHA256:' (7) + 16 hex chars


def test_pki_service_sign_and_verify_valid():
    """
    Cryptographic Signing: Signs data bytes with private key and verifies with public key.
    """
    priv, pub, _ = PKIService.generate_operator_keypair()
    data = b"Canonical eDHR Manifest - Case CAS-2026-001 - Released by QA Specialist"

    signature_b64 = PKIService.sign_digest(priv, data)
    assert isinstance(signature_b64, str)
    assert len(signature_b64) > 60

    is_valid = PKIService.verify_signature(pub, signature_b64, data)
    assert is_valid is True


def test_pki_service_tampered_payload_rejected():
    """
    Tamper Detection: Verification returns False if payload data is altered post-signing.
    """
    priv, pub, _ = PKIService.generate_operator_keypair()
    original_data = b"Case CAS-001 Approved for surgical implantation"
    tampered_data = b"Case CAS-001 REJECTED or modified data"

    sig = PKIService.sign_digest(priv, original_data)
    assert PKIService.verify_signature(pub, sig, tampered_data) is False


def test_pki_service_wrong_public_key_rejected():
    """
    Cryptographic Non-Repudiation (FDA 21 CFR § 11.70):
    Signature by Operator A cannot be verified using Operator B's public key.
    """
    priv_a, pub_a, _ = PKIService.generate_operator_keypair()
    priv_b, pub_b, _ = PKIService.generate_operator_keypair()

    data = b"FDA Release Certification Document"
    sig_a = PKIService.sign_digest(priv_a, data)

    # Verifying Operator A's signature with Operator B's public key must fail
    assert PKIService.verify_signature(pub_b, sig_a, data) is False
    # Verifying with Operator A's public key must succeed
    assert PKIService.verify_signature(pub_a, sig_a, data) is True


# =====================================================================
# Domain & Model Tests: OperatorProfile PKI Integration
# =====================================================================

@pytest.mark.django_db
def test_operator_profile_ensure_pki_keypair_persistence(pki_testbed):
    """
    OperatorProfile automatically persists ECDSA keypair and key fingerprint in database.
    """
    qa_profile = pki_testbed['qa_profile']
    assert qa_profile.public_key_pem.startswith("-----BEGIN PUBLIC KEY-----")
    # FDA 21 CFR Part 11: Private key is securely encrypted at rest using AES-256-GCM
    assert qa_profile.private_key_pem.startswith("enc:v1:")
    assert qa_profile.get_decrypted_private_key().startswith("-----BEGIN PRIVATE KEY-----")
    assert qa_profile.key_fingerprint.startswith("SHA256:")

    # Subsequent call does not alter existing keypair (key stability)
    old_fingerprint = qa_profile.key_fingerprint
    qa_profile.ensure_pki_keypair()
    assert qa_profile.key_fingerprint == old_fingerprint


# =====================================================================
# Service Layer Tests: DHRService ECDSA Signing & Verification
# =====================================================================

@pytest.mark.django_db
def test_dhr_service_generate_ecdsa_package(pki_testbed):
    """
    DHRService compiles an eDHR package with an asymmetric ECDSA-SHA256-P256 signature block.
    """
    order = pki_testbed['order']
    qa_user = pki_testbed['qa_user']

    package = DHRService.generate_edhr_package(
        order=order,
        signer_user=qa_user,
        signing_reason="FDA 21 CFR Part 11 QA Release Authorization",
        algorithm="ECDSA-SHA256-P256"
    )

    sig_block = package['digital_signature']
    assert sig_block['algorithm'] == 'ECDSA-SHA256-P256'
    assert sig_block['is_valid'] is True
    assert sig_block['key_identifier'].startswith("SHA256:")
    assert 'NIST FIPS 186-5' in sig_block['non_repudiation_statement']

    signer = sig_block['signer']
    assert signer['signer_username'] == qa_user.username
    assert signer['signer_role'] == 'QA_SPECIALIST'
    assert signer['public_key_pem'].startswith("-----BEGIN PUBLIC KEY-----")
    assert signer['key_fingerprint'].startswith("SHA256:")
    assert "Asymmetric ECDSA-SHA256-P256" in package['regulatory_compliance']['part_11_electronic_records']


@pytest.mark.django_db
def test_dhr_service_verify_ecdsa_package_valid(pki_testbed):
    """
    Untampered ECDSA eDHR package passes full cryptographic verification.
    """
    order = pki_testbed['order']
    qa_user = pki_testbed['qa_user']

    package = DHRService.generate_edhr_package(
        order=order,
        signer_user=qa_user,
        algorithm="ECDSA-SHA256-P256"
    )

    is_valid, reason, metadata = DHRService.verify_edhr_package(package)
    assert is_valid is True
    assert "VALID" in reason
    assert metadata['algorithm'] == 'ECDSA-SHA256-P256'
    assert metadata['signer']['signer_username'] == qa_user.username


@pytest.mark.django_db
def test_dhr_service_verify_ecdsa_tampered_payload_rejected(pki_testbed):
    """
    Tamper Detection: Altering patient reference, case ID, or step audit trail
    in an ECDSA-signed eDHR package triggers Content Digest Mismatch.
    """
    order = pki_testbed['order']
    qa_user = pki_testbed['qa_user']

    package = DHRService.generate_edhr_package(
        order=order,
        signer_user=qa_user,
        algorithm="ECDSA-SHA256-P256"
    )

    # Malicious actor tampers with patient_ref
    tampered_package = json.loads(json.dumps(package))
    tampered_package['patient_ref'] = 'PT-HACKED-999'

    is_valid, reason, metadata = DHRService.verify_edhr_package(tampered_package)
    assert is_valid is False
    assert "Data Tampering Detected" in reason
    assert "Content digest mismatch" in reason


@pytest.mark.django_db
def test_dhr_service_verify_ecdsa_forged_signature_rejected(pki_testbed):
    """
    Forgery Detection: Submitting an invalid or altered ECDSA base64 signature fails verification.
    """
    order = pki_testbed['order']
    qa_user = pki_testbed['qa_user']

    package = DHRService.generate_edhr_package(
        order=order,
        signer_user=qa_user,
        algorithm="ECDSA-SHA256-P256"
    )

    tampered_package = json.loads(json.dumps(package))
    # Replace valid DER signature with forged bytes
    tampered_package['digital_signature']['signature'] = "MEUCIQDxForGeDsiGnaTuReInVaLiDCcIkj="

    is_valid, reason, metadata = DHRService.verify_edhr_package(tampered_package)
    assert is_valid is False
    assert ("Cryptographic Signature Mismatch" in reason or "does not match certified operator key" in reason)


@pytest.mark.django_db
def test_dhr_service_verify_ecdsa_key_substitution_attack(pki_testbed):
    """
    Red Team Defense - Public Key Substitution Attack:
    Attacker substitutes QA Lead's public_key_pem in the signer manifest with their own
    public key. Because the signer manifest is hashed into sig_signing_input, the signature fails.
    """
    order = pki_testbed['order']
    qa_user = pki_testbed['qa_user']
    alt_profile = pki_testbed['alt_profile']

    package = DHRService.generate_edhr_package(
        order=order,
        signer_user=qa_user,
        algorithm="ECDSA-SHA256-P256"
    )

    tampered_package = json.loads(json.dumps(package))
    # Substitute QA Lead's public key with attacker's public key
    tampered_package['digital_signature']['signer']['public_key_pem'] = alt_profile.public_key_pem
    tampered_package['digital_signature']['signer']['key_fingerprint'] = alt_profile.key_fingerprint

    is_valid, reason, metadata = DHRService.verify_edhr_package(tampered_package)
    assert is_valid is False
    assert ("Cryptographic Signature Mismatch" in reason or "does not match certified operator key" in reason)


# =====================================================================
# REST API Endpoint Tests: /api/orders/{id}/sign-dhr/ & /verify-dhr/
# =====================================================================

@pytest.mark.django_db
def test_sign_dhr_api_defaults_to_ecdsa(api_client, pki_testbed):
    """
    POST /api/orders/{id}/sign-dhr/ executes NIST FIPS 186-5 ECDSA signing by default.
    """
    order = pki_testbed['order']
    qa_user = pki_testbed['qa_user']

    api_client.force_authenticate(user=qa_user)
    response = api_client.post(
        f'/api/orders/{order.id}/sign-dhr/',
        {'reason': 'Final Cleanroom QA Release and Regulatory Conformity'},
        format='json'
    )

    assert response.status_code == 200
    data = response.json()
    assert "eDHR successfully signed and sealed" in data['message']
    pkg = data['signed_package']
    assert pkg['digital_signature']['algorithm'] == 'ECDSA-SHA256-P256'
    assert pkg['digital_signature']['signer']['signer_username'] == qa_user.username
    assert pkg['digital_signature']['signer']['key_fingerprint'].startswith("SHA256:")
    assert len(pkg['digital_signature']['signature']) > 60


@pytest.mark.django_db
def test_verify_dhr_api_with_ecdsa_package(api_client, pki_testbed):
    """
    POST /api/orders/{id}/verify-dhr/ successfully verifies an ECDSA signed package.
    """
    order = pki_testbed['order']
    qa_user = pki_testbed['qa_user']

    # Sign order with ECDSA
    ecdsa_package = DHRService.generate_edhr_package(
        order=order,
        signer_user=qa_user,
        algorithm="ECDSA-SHA256-P256"
    )

    # 1. Verify authentic ECDSA package
    res_valid = api_client.post(
        f'/api/orders/{order.id}/verify-dhr/',
        {'package': ecdsa_package},
        format='json'
    )
    assert res_valid.status_code == 200
    assert res_valid.json()['status'] == 'VERIFIED_AUTHENTIC'
    assert res_valid.json()['verification']['algorithm'] == 'ECDSA-SHA256-P256'

    # 2. Verify tampered package rejected with 422
    tampered_package = json.loads(json.dumps(ecdsa_package))
    tampered_package['case_id'] = 'CAS-TAMPERED-888'

    res_tampered = api_client.post(
        f'/api/orders/{order.id}/verify-dhr/',
        {'package': tampered_package},
        format='json'
    )
    assert res_tampered.status_code == 422
    assert res_tampered.json()['status'] == 'TAMPERED_OR_INVALID'
    assert res_tampered.json()['is_valid'] is False
