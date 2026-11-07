import io
import csv
import re
from typing import Iterable
from manufacturing.models import Order


class CSVExportService:
    """
    ISO 13485 & CWE-1236 Compliant Audit CSV Generator.
    Immunizes output against CSV Formula Injection (=cmd, @SUM, +calc, -cmd, \t, \r, %).
    Forces spreadsheet engines (Excel, LibreOffice Calc) to parse cells as literal text.
    """

    @staticmethod
    def sanitize_cell(value) -> str:
        if value is None:
            return ""

        text = str(value)
        # Strip null bytes
        text = text.replace('\0', '')

        # Detect formula triggers: '=', '+', '-', '@', '\t', '\r', '%'
        is_formula_trigger = bool(re.match(r'^[=+\-@\t\r%]', text.lstrip()))

        # Normalize newlines and carriage returns to space to avoid splitting CSV records
        text = text.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')

        if is_formula_trigger:
            text = f"'{text}"

        return text

    @classmethod
    def generate_orders_csv(cls, orders: Iterable[Order]) -> str:
        output = io.StringIO()
        # Add UTF-8 BOM so Microsoft Excel renders international symbols cleanly
        output.write('\ufeff')

        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        headers = [
            'Case ID',
            'Patient Reference',
            'Anatomical Site',
            'Priority',
            'Status',
            'Current Step Sequence',
            'Current Step Name',
            'Total Cost (USD)',
            'Material Cost (USD)',
            'Machine Cost (USD)',
            'Labor Cost (USD)',
            'Created At',
            'Latest Operator',
            'Latest Notes',
        ]
        writer.writerow(headers)

        from manufacturing.services.cost_service import CostService

        for o in orders:
            latest_log = o.step_logs.first()
            cost_info = CostService.calculate_order_cost(o)
            total_cost = cost_info.get('total_cost', 0)
            cost_summary = cost_info.get('cost_breakdown', {})

            row = [
                cls.sanitize_cell(o.case_id),
                cls.sanitize_cell(o.patient_ref),
                cls.sanitize_cell(o.get_implant_type_display()),
                cls.sanitize_cell(o.priority),
                cls.sanitize_cell(o.status),
                str(o.current_step.sequence_order if o.current_step else 0),
                cls.sanitize_cell(o.current_step.name if o.current_step else 'N/A'),
                f"{float(total_cost):.2f}",
                f"{float(cost_summary.get('material_cost', 0)):.2f}",
                f"{float(cost_summary.get('machine_cost', 0)):.2f}",
                f"{float(cost_summary.get('labor_cost', 0)):.2f}",
                o.created_at.strftime('%Y-%m-%d %H:%M:%S') if o.created_at else '',
                cls.sanitize_cell(latest_log.operator_name if latest_log else ''),
                cls.sanitize_cell(latest_log.notes if latest_log else ''),
            ]
            writer.writerow(row)

        return output.getvalue()
