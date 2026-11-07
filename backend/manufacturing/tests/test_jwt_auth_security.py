import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from decimal import Decimal
from manufacturing.models import ProcessStep, Resource, Order, OperatorProfile


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_setup(db):
    # Process Steps
    step1 = ProcessStep.objects.create(sequence_order=1, code="STEP_CAD", name="3D CAD Modeling")
    step2 = ProcessStep.objects.create(sequence_order=2, code="STEP_PRINT", name="3D Metal Printing")

    # Certified Operators
    user_bio = User.objects.create_user(
        username="test_biomed",
        password="ValidPassword123!",
        first_name="Biomed",
        last_name="Tester"
    )
    OperatorProfile.objects.create(
        user=user_bio,
        role=OperatorProfile.Role.BIOMEDICAL_ENGINEER,
        title="Biomedical CAD Specialist",
        badge_number="BIO-001"
    )

    user_qa = User.objects.create_user(
        username="test_qa",
        password="ValidPassword123!",
        first_name="QA",
        last_name="Tester"
    )
    OperatorProfile.objects.create(
        user=user_qa,
        role=OperatorProfile.Role.QA_SPECIALIST,
        title="ISO 13485 Lead Inspector",
        badge_number="QA-001"
    )

    # Patient Order at Step 1
    order = Order.objects.create(
        case_id="CAS-SEC-001",
        patient_ref="PT-SEC-99",
        implant_type=Order.ImplantType.CRANIAL_PLATE,
        priority=Order.Priority.STANDARD,
        status=Order.Status.IN_PROGRESS,
        current_step=step1
    )

    return {
        'step1': step1,
        'step2': step2,
        'user_bio': user_bio,
        'user_qa': user_qa,
        'order': order,
    }


@pytest.mark.django_db
def test_jwt_login_valid_credentials(api_client, auth_setup):
    res = api_client.post('/api/auth/token/', {
        'username': 'test_biomed',
        'password': 'ValidPassword123!'
    }, format='json')

    assert res.status_code == 200
    assert 'access' in res.data
    assert 'refresh' in res.data
    assert res.data['user']['username'] == 'test_biomed'
    assert res.data['user']['role'] == 'BIOMEDICAL_ENGINEER'
    assert 1 in res.data['user']['authorized_steps']


@pytest.mark.django_db
def test_jwt_login_invalid_credentials_rejected(api_client, auth_setup):
    res = api_client.post('/api/auth/token/', {
        'username': 'test_biomed',
        'password': 'WrongPasswordHacked!'
    }, format='json')

    assert res.status_code == 401


@pytest.mark.django_db
def test_auth_me_requires_authentication(api_client, auth_setup):
    # Unauthenticated request must receive 401
    res = api_client.get('/api/auth/me/')
    assert res.status_code == 401


@pytest.mark.django_db
def test_auth_me_returns_verified_profile(api_client, auth_setup):
    # Login
    login_res = api_client.post('/api/auth/token/', {
        'username': 'test_qa',
        'password': 'ValidPassword123!'
    }, format='json')
    token = login_res.data['access']

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    me_res = api_client.get('/api/auth/me/')

    assert me_res.status_code == 200
    assert me_res.data['username'] == 'test_qa'
    assert me_res.data['role'] == 'QA_SPECIALIST'
    assert 4 in me_res.data['authorized_steps']
    assert 5 in me_res.data['authorized_steps']
    assert 1 not in me_res.data['authorized_steps']


@pytest.mark.django_db
def test_step_advance_rejects_unauthorized_token(api_client, auth_setup):
    # QA operator tries to advance Step 1 (CAD)
    login_res = api_client.post('/api/auth/token/', {
        'username': 'test_qa',
        'password': 'ValidPassword123!'
    }, format='json')
    token = login_res.data['access']

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    adv_res = api_client.post(f'/api/orders/{auth_setup["order"].id}/advance/', {
        'operator_name': 'QA Tester',
        'notes': 'Unauthorized bypass attempt'
    }, format='json')

    # Must be blocked by server-side claims check
    assert adv_res.status_code == 400
    assert "ISO 13485 Compliance Violation" in adv_res.data['error']
    assert "QA_SPECIALIST" in adv_res.data['error']

    # Order must remain at Step 1
    auth_setup['order'].refresh_from_db()
    assert auth_setup['order'].current_step.sequence_order == 1


@pytest.mark.django_db
def test_step_advance_succeeds_with_authorized_token(api_client, auth_setup):
    # Biomedical Engineer advances Step 1 (CAD)
    login_res = api_client.post('/api/auth/token/', {
        'username': 'test_biomed',
        'password': 'ValidPassword123!'
    }, format='json')
    token = login_res.data['access']

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    adv_res = api_client.post(f'/api/orders/{auth_setup["order"].id}/advance/', {
        'operator_name': 'Biomedical Lead',
        'notes': 'Authorized CAD design verification'
    }, format='json')

    assert adv_res.status_code == 200
    auth_setup['order'].refresh_from_db()
    assert auth_setup['order'].current_step.sequence_order == 2
