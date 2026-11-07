import pytest
from rest_framework.test import APIClient
from manufacturing.models import ProcessStep, Order, OrderStepLog
from manufacturing.services.csv_service import CSVExportService





def test_formula_trigger_equals_is_neutralized():
    """Verify that leading '=' formula trigger is prefixed with single quote."""
    payload = "=cmd|'/C calc'!A0"
    sanitized = CSVExportService.sanitize_cell(payload)
    assert sanitized.startswith("'=")
    assert sanitized == "'=cmd|'/C calc'!A0"


def test_formula_trigger_at_and_plus_minus_are_neutralized():
    """Verify that '@', '+', '-', '%' formula triggers are prefixed with single quote."""
    assert CSVExportService.sanitize_cell("@SUM(A1:A10)").startswith("'@")
    assert CSVExportService.sanitize_cell("+123456").startswith("'+")
    assert CSVExportService.sanitize_cell("-100+200").startswith("'-")
    assert CSVExportService.sanitize_cell("%0a").startswith("'%")


def test_formula_trigger_tabs_and_newlines_are_neutralized():
    """Verify leading tabs and control characters are caught and neutralized with prepended quote."""
    assert CSVExportService.sanitize_cell("\t=cmd").startswith("' =cmd")
    assert CSVExportService.sanitize_cell("\r+calc").startswith("' +calc")


def test_safe_medical_identifiers_are_unaltered():
    """Verify standard medical identifiers without trigger characters are unaltered."""
    assert CSVExportService.sanitize_cell("CAS-2026-081") == "CAS-2026-081"
    assert CSVExportService.sanitize_cell("PT-BKK-491") == "PT-BKK-491"
    assert CSVExportService.sanitize_cell("Cranial Reconstruction Plate") == "Cranial Reconstruction Plate"


def test_null_bytes_and_newlines_are_stripped():
    """Verify null bytes and multi-line breaks are stripped to prevent CSV structural splitting."""
    raw = "Patient\0Ref\r\nWith\nBreaks"
    sanitized = CSVExportService.sanitize_cell(raw)
    assert "\0" not in sanitized
    assert "\r\n" not in sanitized
    assert "\n" not in sanitized
    assert sanitized == "PatientRef With Breaks"


@pytest.mark.django_db
def test_server_export_csv_endpoint_neutralizes_malicious_order(api_client):
    """
    Simulate a Red Team attack where an attacker registered an order with a malicious
    CSV formula payload in the patient_ref and audit notes.
    Verify that the exported CSV from GET /api/orders/export-csv/ neutralizes the payload.
    """
    step1 = ProcessStep.objects.create(sequence_order=1, code="STEP_CAD_CSV", name="CAD Modeling")

    order = Order.objects.create(
        case_id="CAS-EVIL-01",
        patient_ref="=cmd|'/C calc'!A0",  # Malicious formula payload
        implant_type=Order.ImplantType.CRANIAL_PLATE,
        priority=Order.Priority.URGENT,
        status=Order.Status.IN_PROGRESS,
        current_step=step1
    )

    OrderStepLog.objects.create(
        order=order,
        from_step=None,
        to_step=step1,
        operator_name="@DDE_EXPLOIT",  # Malicious operator name
        notes="+2+5+cmd|' /C powershell.exe'!"  # Malicious note
    )

    response = api_client.get('/api/orders/export-csv/')
    assert response.status_code == 200
    assert response['Content-Type'] == 'text/csv; charset=utf-8'

    csv_text = response.content.decode('utf-8')

    # Verify that the malicious payload in patient_ref is escaped with a leading single quote (')
    assert "'=cmd|'/C calc'!A0" in csv_text
    # Verify that malicious operator is escaped
    assert "'@DDE_EXPLOIT" in csv_text
    # Verify that malicious note is escaped
    assert "'+2+5+cmd|' /C powershell.exe'!" in csv_text

    # The raw unescaped formula triggers MUST NOT exist at cell boundaries
    assert ',"=cmd' not in csv_text
    assert ',"@DDE' not in csv_text
    assert ',"+2+5' not in csv_text
