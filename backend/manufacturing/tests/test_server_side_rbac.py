import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Order, OperatorProfile
from manufacturing.services import OrderService, UnauthorizedStepOperatorError, RBACService


@pytest.fixture
def setup_rbac_pipeline(db):
    step1 = ProcessStep.objects.create(sequence_order=1, code='STEP_CAD', name='3D CAD Planning')
    step2 = ProcessStep.objects.create(sequence_order=2, code='STEP_PRINT', name='3D Metal Printing')
    step3 = ProcessStep.objects.create(sequence_order=3, code='STEP_CNC', name='CNC Machining')
    step4 = ProcessStep.objects.create(sequence_order=4, code='STEP_QA', name='ISO 13485 QA Inspection')
    step5 = ProcessStep.objects.create(sequence_order=5, code='STEP_LABEL', name='Medical Packaging & UDI')

    return {
        1: step1,
        2: step2,
        3: step3,
        4: step4,
        5: step5,
    }


@pytest.mark.django_db
def test_step1_cad_biomedical_engineer_authorized(setup_rbac_pipeline):
    """
    User Specification:
    Step 1 (CAD) ကို Biomedical Engineer သာ advance လုပ်ခွင့်ရှိသည်။
    """
    steps = setup_rbac_pipeline
    order = Order.objects.create(
        case_id='CAS-RBAC-CAD-01',
        patient_ref='PT-RBAC-1',
        implant_type='CRANIAL_PLATE',
        current_step=steps[1]
    )

    # Biomedical Engineer succeeds
    updated_order = OrderService.advance_order(
        order_id=order.id,
        operator_name='Dr. Alice Bio',
        operator_role='BIOMEDICAL_ENGINEER'
    )
    assert updated_order.current_step.sequence_order == 2


@pytest.mark.django_db
def test_step1_cad_production_operator_and_qa_rejected(setup_rbac_pipeline):
    """
    User Specification:
    Production Operator သို့မဟုတ် QA Specialist သည် Step 1 (CAD) ကို advance မလုပ်နိုင်စေရန် တင်းကြပ်စွာ စစ်ဆေးခြင်း။
    """
    steps = setup_rbac_pipeline
    order = Order.objects.create(
        case_id='CAS-RBAC-CAD-ERR',
        patient_ref='PT-RBAC-ERR',
        implant_type='CRANIAL_PLATE',
        current_step=steps[1]
    )

    # 1. Production Operator rejected
    with pytest.raises(UnauthorizedStepOperatorError) as exc_p:
        OrderService.advance_order(
            order_id=order.id,
            operator_name='Operator John',
            operator_role='PRODUCTION_OPERATOR'
        )
    assert "not authorized to sign off Step 1 (3D CAD Planning)" in str(exc_p.value)

    # 2. QA Specialist rejected
    with pytest.raises(UnauthorizedStepOperatorError) as exc_q:
        OrderService.advance_order(
            order_id=order.id,
            operator_name='QA Inspector Bob',
            operator_role='QA_SPECIALIST'
        )
    assert "not authorized to sign off Step 1 (3D CAD Planning)" in str(exc_q.value)


@pytest.mark.django_db
def test_step4_qa_specialist_authorized(setup_rbac_pipeline):
    """
    User Specification:
    Step 4 (QA) ကို QA Specialist ကသာ လက်မှတ်ထိုးခွင့်ရှိစေရန် Server ဘက်ခြမ်းမှ တင်းကြပ်စွာ စစ်ဆေးခြင်း။
    """
    steps = setup_rbac_pipeline
    order = Order.objects.create(
        case_id='CAS-RBAC-QA-01',
        patient_ref='PT-RBAC-QA',
        implant_type='HIP_ACETABULAR_CUP',
        current_step=steps[4]  # Step 4: ISO 13485 QA Inspection
    )

    # QA Specialist succeeds
    updated_order = OrderService.advance_order(
        order_id=order.id,
        operator_name='Sarah QA Lead',
        operator_role='QA_SPECIALIST'
    )
    assert updated_order.current_step.sequence_order == 5


@pytest.mark.django_db
def test_step4_qa_biomedical_engineer_and_operator_rejected(setup_rbac_pipeline):
    """
    User Specification:
    Biomedical Engineer သို့မဟုတ် Production Operator သည် Step 4 (QA) ကို sign off မလုပ်နိုင်စေရန် တားဆီးခြင်း။
    """
    steps = setup_rbac_pipeline
    order = Order.objects.create(
        case_id='CAS-RBAC-QA-ERR',
        patient_ref='PT-RBAC-QA-ERR',
        implant_type='HIP_ACETABULAR_CUP',
        current_step=steps[4]
    )

    # 1. Biomedical Engineer rejected on Step 4
    with pytest.raises(UnauthorizedStepOperatorError) as exc_bio:
        OrderService.advance_order(
            order_id=order.id,
            operator_name='Dr. Alice Bio',
            operator_role='BIOMEDICAL_ENGINEER'
        )
    assert "not authorized to sign off Step 4 (ISO 13485 QA Inspection)" in str(exc_bio.value)

    # 2. Production Operator rejected on Step 4
    with pytest.raises(UnauthorizedStepOperatorError) as exc_op:
        OrderService.advance_order(
            order_id=order.id,
            operator_name='Operator John',
            operator_role='PRODUCTION_OPERATOR'
        )
    assert "not authorized to sign off Step 4 (ISO 13485 QA Inspection)" in str(exc_op.value)


@pytest.mark.django_db
def test_admin_supervisory_override_all_steps(setup_rbac_pipeline):
    """
    Admin persona is authorized across all steps for supervisory overrides.
    """
    steps = setup_rbac_pipeline
    order1 = Order.objects.create(case_id='CAS-ADM-1', patient_ref='PT-A1', implant_type='CRANIAL_PLATE', current_step=steps[1])
    order4 = Order.objects.create(case_id='CAS-ADM-4', patient_ref='PT-A4', implant_type='SPINAL_CAGE', current_step=steps[4])

    # Admin signs off Step 1
    o1 = OrderService.advance_order(order1.id, operator_name='Admin Lead', operator_role='ADMIN')
    assert o1.current_step.sequence_order == 2

    # Admin signs off Step 4
    o4 = OrderService.advance_order(order4.id, operator_name='Admin Lead', operator_role='ADMIN')
    assert o4.current_step.sequence_order == 5


@pytest.mark.django_db
def test_drf_api_rbac_enforcement_via_header_and_body(api_client, setup_rbac_pipeline):
    """
    API Invariant: Endpoint enforces Zero-Trust authenticated operator claims and prevents cross-role execution.
    """
    steps = setup_rbac_pipeline
    order = Order.objects.create(
        case_id='CAS-API-RBAC',
        patient_ref='PT-API-RBAC',
        implant_type='MANDIBULAR_RECON',
        current_step=steps[1]  # Step 1: CAD
    )

    # Certified Production Operator user
    user_op = User.objects.create_user(username='op_rbac_test', password='Password123!')
    OperatorProfile.objects.create(user=user_op, role=OperatorProfile.Role.PRODUCTION_OPERATOR)

    # Certified Biomedical Engineer user
    user_bio = User.objects.create_user(username='bio_rbac_test', password='Password123!')
    OperatorProfile.objects.create(user=user_bio, role=OperatorProfile.Role.BIOMEDICAL_ENGINEER)

    # 1. Production Operator attempting Step 1 (CAD) -> 400 error with message
    api_client.force_authenticate(user=user_op)
    r_fail = api_client.post(
        f'/api/orders/{order.id}/advance/',
        {'operator_name': 'Operator John'},
        HTTP_X_OPERATOR_ROLE='PRODUCTION_OPERATOR',
        format='json'
    )
    assert r_fail.status_code == 400
    assert "not authorized to sign off Step 1" in r_fail.json()['error']

    # 2. Biomedical Engineer executing Step 1 (CAD) -> 200 OK
    api_client.force_authenticate(user=user_bio)
    r_ok = api_client.post(
        f'/api/orders/{order.id}/advance/',
        {'operator_name': 'Dr. Alice Bio'},
        HTTP_X_OPERATOR_ROLE='BIOMEDICAL_ENGINEER',
        format='json'
    )
    assert r_ok.status_code == 200
    assert r_ok.json()['current_step']['sequence_order'] == 2


@pytest.mark.django_db
def test_rbac_roles_catalog_api_endpoint(api_client):
    """
    API Invariant: GET /api/rbac/roles/ returns complete persona catalog for UI persona switcher.
    """
    response = api_client.get('/api/rbac/roles/')
    assert response.status_code == 200
    roles = response.json()

    assert len(roles) == 4
    role_keys = [r['role_key'] for r in roles]
    assert 'BIOMEDICAL_ENGINEER' in role_keys
    assert 'PRODUCTION_OPERATOR' in role_keys
    assert 'QA_SPECIALIST' in role_keys
    assert 'ADMIN' in role_keys
