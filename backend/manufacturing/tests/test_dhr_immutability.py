import json
import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.db.models import ProtectedError
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Resource, Order, OrderStepLog, OrderResourceConsumption, OperatorProfile
from manufacturing.services import DHRService, OrderService





@pytest.fixture
def setup_dhr_testbed(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='3D CAD Planning')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Metal Printing')

    order = Order.objects.create(
        case_id='CAS-DHR-001',
        patient_ref='PT-DHR-AUDIT',
        implant_type='CRANIAL_PLATE',
        current_step=step1
    )

    log = OrderStepLog.objects.create(
        order=order,
        from_step=None,
        to_step=step1,
        operator_name='Dr. Smith Biomedical Lead',
        notes='Initial case intake and surgical planning approval.'
    )

    return {
        'step1': step1,
        'step2': step2,
        'order': order,
        'log': log
    }


@pytest.mark.django_db
def test_ordersteplog_update_instance_raises_validation_error(setup_dhr_testbed):
    """
    ISO 13485 Invariant: Updating an existing OrderStepLog instance is permanently forbidden.
    """
    log = setup_dhr_testbed['log']
    log.notes = "Attempted tampering of medical record."

    with pytest.raises(ValidationError) as exc_info:
        log.save()

    assert "ISO 13485 Compliance Violation" in str(exc_info.value)
    assert "immutable and cannot be updated" in str(exc_info.value)


@pytest.mark.django_db
def test_ordersteplog_delete_instance_raises_validation_error(setup_dhr_testbed):
    """
    ISO 13485 Invariant: Deleting an existing OrderStepLog instance is permanently forbidden.
    """
    log = setup_dhr_testbed['log']

    with pytest.raises(ValidationError) as exc_info:
        log.delete()

    assert "ISO 13485 Compliance Violation" in str(exc_info.value)
    assert "cannot be deleted" in str(exc_info.value)


@pytest.mark.django_db
def test_ordersteplog_queryset_batch_delete_forbidden(setup_dhr_testbed):
    """
    ISO 13485 Invariant: Batch deletion via QuerySet.delete() is blocked.
    """
    order = setup_dhr_testbed['order']

    with pytest.raises(ValidationError) as exc_info:
        OrderStepLog.objects.filter(order=order).delete()

    assert "Batch deletion of OrderStepLog records is strictly forbidden" in str(exc_info.value)


@pytest.mark.django_db
def test_ordersteplog_queryset_batch_update_forbidden(setup_dhr_testbed):
    """
    ISO 13485 Invariant: Batch update via QuerySet.update() is blocked.
    """
    order = setup_dhr_testbed['order']

    with pytest.raises(ValidationError) as exc_info:
        OrderStepLog.objects.filter(order=order).update(notes="Batch hacked")

    assert "Batch update of OrderStepLog records is strictly forbidden" in str(exc_info.value)


@pytest.mark.django_db
def test_order_deletion_protected_when_audit_logs_exist(setup_dhr_testbed):
    """
    Regulatory Invariant: Attempting to delete an Order that has DHR audit logs
    is rejected at the database level by models.PROTECT.
    """
    order = setup_dhr_testbed['order']

    with pytest.raises(ProtectedError):
        order.delete()


@pytest.mark.django_db
def test_drf_api_rejects_mutation_on_audit_logs_endpoint(api_client, setup_dhr_testbed):
    """
    API Invariant: Direct POST, PUT, PATCH, and DELETE calls to /api/audit-logs/ return HTTP 405 Method Not Allowed.
    """
    log = setup_dhr_testbed['log']

    # 1. POST
    r_post = api_client.post('/api/audit-logs/', {'notes': 'Unauthorized'}, format='json')
    assert r_post.status_code == 405

    # 2. PUT
    r_put = api_client.put(f'/api/audit-logs/{log.id}/', {'notes': 'Unauthorized'}, format='json')
    assert r_put.status_code == 405

    # 3. PATCH
    r_patch = api_client.patch(f'/api/audit-logs/{log.id}/', {'notes': 'Unauthorized'}, format='json')
    assert r_patch.status_code == 405

    # 4. DELETE
    r_del = api_client.delete(f'/api/audit-logs/{log.id}/')
    assert r_del.status_code == 405

    # 5. GET is allowed
    r_get = api_client.get('/api/audit-logs/')
    assert r_get.status_code == 200


@pytest.mark.django_db
def test_edhr_package_generation_with_sha256_checksum(api_client, setup_dhr_testbed):
    """
    eDHR Invariant: Compiling the eDHR package produces an immutable SHA-256 tamper-evident seal
    and GS1-128 UDI barcode specification.
    """
    order = setup_dhr_testbed['order']

    # Service verification
    dhr_package = DHRService.generate_edhr_package(order)
    assert dhr_package['case_id'] == 'CAS-DHR-001'
    assert len(dhr_package['dhr_sha256_checksum']) == 64  # SHA-256 hex digest
    assert dhr_package['regulatory_compliance']['immutability_status'] == 'APPEND_ONLY_SEALED'
    assert 'gs1_128_barcode_string' in dhr_package['udi_data']
    assert '(01)08859123456789' in dhr_package['udi_data']['gs1_128_barcode_string']

    # REST API verification
    response = api_client.get(f'/api/orders/{order.id}/dhr/')
    assert response.status_code == 200
    data = response.json()
    assert data['dhr_sha256_checksum'] == dhr_package['dhr_sha256_checksum']
    assert len(data['audit_trail']) >= 1
    assert data['audit_trail'][0]['operator_name'] == 'Dr. Smith Biomedical Lead'
    assert 'digital_signature' in data
    assert data['digital_signature']['algorithm'] == 'HMAC-SHA256'
    assert len(data['digital_signature']['signature']) == 64
    assert 'ISO-13485' in data['digital_signature']['signer']['certification_id']


@pytest.mark.django_db
def test_edhr_cryptographic_verification_valid(setup_dhr_testbed):
    """
    FDA 21 CFR Part 11: Untampered eDHR package cryptographically verifies with HMAC-SHA256.
    """
    order = setup_dhr_testbed['order']
    dhr_package = DHRService.generate_edhr_package(order)

    is_valid, reason, metadata = DHRService.verify_edhr_package(dhr_package)
    assert is_valid is True
    assert "VALID" in reason
    assert metadata['algorithm'] == 'HMAC-SHA256'
    assert metadata['content_digest'] == dhr_package['dhr_sha256_checksum']


@pytest.mark.django_db
def test_edhr_tamper_detection_content_altered(setup_dhr_testbed):
    """
    FDA 21 CFR Part 11: Any post-signature modification to patient data, notes, or cost
    triggers immediate cryptographic tamper detection (Content Digest Mismatch).
    """
    order = setup_dhr_testbed['order']
    dhr_package = DHRService.generate_edhr_package(order)

    # Malicious actor alters audit notes in the exported eDHR
    tampered_package = json.loads(json.dumps(dhr_package))
    tampered_package['audit_trail'][0]['notes'] = "Altered by malicious actor without authorization"

    is_valid, reason, metadata = DHRService.verify_edhr_package(tampered_package)
    assert is_valid is False
    assert "Data Tampering Detected" in reason
    assert "Content digest mismatch" in reason


@pytest.mark.django_db
def test_edhr_tamper_detection_forged_signature(setup_dhr_testbed):
    """
    FDA 21 CFR Part 11: A forged HMAC signature or invalid secret key is rejected.
    """
    order = setup_dhr_testbed['order']
    dhr_package = DHRService.generate_edhr_package(order)

    tampered_package = json.loads(json.dumps(dhr_package))
    tampered_package['digital_signature']['signature'] = "0" * 64

    is_valid, reason, metadata = DHRService.verify_edhr_package(tampered_package)
    assert is_valid is False
    assert "Cryptographic Signature Mismatch" in reason


@pytest.mark.django_db
def test_verify_dhr_api_endpoint(api_client, setup_dhr_testbed):
    """
    API Invariant: POST /api/orders/{id}/verify-dhr/ returns 200 for authentic packages
    and 422 Unprocessable Entity for tampered packages.
    """
    order = setup_dhr_testbed['order']

    # 1. Verify authentic order package
    res_valid = api_client.post(f'/api/orders/{order.id}/verify-dhr/')
    assert res_valid.status_code == 200
    assert res_valid.json()['status'] == 'VERIFIED_AUTHENTIC'
    assert res_valid.json()['is_valid'] is True

    # 2. Verify tampered payload submitted via POST body
    dhr_package = DHRService.generate_edhr_package(order)
    tampered_package = json.loads(json.dumps(dhr_package))
    tampered_package['case_id'] = "CAS-FORGED-999"

    res_tampered = api_client.post(
        f'/api/orders/{order.id}/verify-dhr/',
        {'package': tampered_package},
        format='json'
    )
    assert res_tampered.status_code == 422
    assert res_tampered.json()['status'] == 'TAMPERED_OR_INVALID'
    assert res_tampered.json()['is_valid'] is False


@pytest.mark.django_db
def test_sign_dhr_api_endpoint_rbac(api_client, setup_dhr_testbed):
    """
    ISO 13485 / FDA 21 CFR Part 11 Invariant: Only QA_SPECIALIST or ADMIN can formally affix
    an electronic signature to release an eDHR. Non-QA roles (BIOMEDICAL_ENGINEER, PRODUCTION_OPERATOR)
    are strictly rejected with HTTP 403 Forbidden.
    """
    order = setup_dhr_testbed['order']

    # Create operators
    user_bio = User.objects.create_user(username='bio_signer_test', password='Password123!')
    OperatorProfile.objects.create(user=user_bio, role=OperatorProfile.Role.BIOMEDICAL_ENGINEER)

    user_op = User.objects.create_user(username='op_signer_test', password='Password123!')
    OperatorProfile.objects.create(user=user_op, role=OperatorProfile.Role.PRODUCTION_OPERATOR)

    user_qa = User.objects.create_user(username='qa_signer_test', password='Password123!')
    OperatorProfile.objects.create(
        user=user_qa,
        role=OperatorProfile.Role.QA_SPECIALIST,
        title='Lead Quality Auditor',
        badge_number='QA-CERT-01',
        certification_id='ISO-13485-QA-01'
    )

    # 1. Attempt signature with unauthorized role (BIOMEDICAL_ENGINEER)
    api_client.force_authenticate(user=user_bio)
    res_unauth = api_client.post(
        f'/api/orders/{order.id}/sign-dhr/',
        {'reason': 'Unauthorized signature attempt'},
        format='json'
    )
    assert res_unauth.status_code == 403
    assert "Forbidden" in res_unauth.json()['error']

    # 2. Attempt signature with unauthorized role (PRODUCTION_OPERATOR)
    api_client.force_authenticate(user=user_op)
    res_op = api_client.post(
        f'/api/orders/{order.id}/sign-dhr/',
        {'reason': 'Operator attempting QA sign-off'},
        format='json'
    )
    assert res_op.status_code == 403

    # 3. Legitimate QA signature
    api_client.force_authenticate(user=user_qa)
    res_qa = api_client.post(
        f'/api/orders/{order.id}/sign-dhr/',
        {'reason': 'Official Cleanroom QA Release Certification'},
        format='json'
    )
    assert res_qa.status_code == 200
    assert "eDHR successfully signed and sealed" in res_qa.json()['message']
    signed_pkg = res_qa.json()['signed_package']
    assert signed_pkg['digital_signature']['signer']['signer_role'] == 'QA_SPECIALIST'
    assert signed_pkg['digital_signature']['signer']['meaning'] == 'Official Cleanroom QA Release Certification'

