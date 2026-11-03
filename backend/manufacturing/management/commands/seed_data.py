from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from manufacturing.models import ProcessStep, Resource, Order, OrderResourceConsumption, OrderStepLog


class Command(BaseCommand):
    help = "Seeds initial manufacturing steps, resources, and realistic Meticuly implant orders"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding MetiTrack production data...")

        # 1. Seed Process Steps
        steps_data = [
            {
                'sequence_order': 1,
                'code': 'STEP_CAD',
                'name': '3D CAD Modeling & Surgical Planning',
                'description': 'Convert patient CT/MRI DICOM scans into patient-specific 3D implant geometries and obtain surgeon sign-off.',
            },
            {
                'sequence_order': 2,
                'code': 'STEP_PRINT',
                'name': '3D Metal Printing (SLM)',
                'description': 'Laser powder bed fusion additive manufacturing using medical-grade Titanium Ti-6Al-4V ELI powder.',
            },
            {
                'sequence_order': 3,
                'code': 'STEP_CNC',
                'name': 'CNC Post-Processing & Heat Treatment',
                'description': 'Vacuum furnace stress relief annealing and 5-axis precision CNC milling of critical anatomical interfaces.',
            },
            {
                'sequence_order': 4,
                'code': 'STEP_QA',
                'name': 'ISO 13485 QA Inspection & Sterilization',
                'description': 'Dimensional CMM validation, surface roughness test, cleanroom ultrasonic wash, and gamma sterilization pouching.',
            },
            {
                'sequence_order': 5,
                'code': 'STEP_LABEL',
                'name': 'Medical Labelling & Packaging',
                'description': 'Laser-marking unique device identifier (UDI), patient case labeling, and cold-chain dispatch prep for hospital delivery.',
            },
        ]

        steps = {}
        for s in steps_data:
            step_obj, _ = ProcessStep.objects.update_or_create(
                sequence_order=s['sequence_order'],
                defaults={
                    'code': s['code'],
                    'name': s['name'],
                    'description': s['description']
                }
            )
            steps[s['sequence_order']] = step_obj

        # 2. Seed Resources
        resources_data = [
            {
                'name': 'Titanium Ti-6Al-4V Grade 23 Powder',
                'category': Resource.Category.MATERIAL,
                'unit': Resource.Unit.GRAMS,
                'cost_per_unit': Decimal('1.25'),
                'total_available': Decimal('50000.00'),
            },
            {
                'name': 'SLM 3D Metal Printer #1',
                'category': Resource.Category.MACHINE_TIME,
                'unit': Resource.Unit.HOURS,
                'cost_per_unit': Decimal('75.00'),
                'total_available': Decimal('500.00'),
            },
            {
                'name': '5-Axis Precision CNC Milling',
                'category': Resource.Category.MACHINE_TIME,
                'unit': Resource.Unit.HOURS,
                'cost_per_unit': Decimal('60.00'),
                'total_available': Decimal('350.00'),
            },
            {
                'name': 'Biomedical Engineer Labor',
                'category': Resource.Category.LABOR,
                'unit': Resource.Unit.HOURS,
                'cost_per_unit': Decimal('45.00'),
                'total_available': Decimal('1200.00'),
            },
            {
                'name': 'QA Specialist Labor',
                'category': Resource.Category.LABOR,
                'unit': Resource.Unit.HOURS,
                'cost_per_unit': Decimal('40.00'),
                'total_available': Decimal('800.00'),
            },
            {
                'name': 'Sterile Barrier Packaging Kit (UDI)',
                'category': Resource.Category.MATERIAL,
                'unit': Resource.Unit.UNITS,
                'cost_per_unit': Decimal('22.50'),
                'total_available': Decimal('500.00'),
            },
        ]

        resources = {}
        for r in resources_data:
            res_obj, _ = Resource.objects.update_or_create(
                name=r['name'],
                defaults={
                    'category': r['category'],
                    'unit': r['unit'],
                    'cost_per_unit': r['cost_per_unit'],
                    'total_available': r['total_available'],
                }
            )
            resources[r['name']] = res_obj

        # Link suggested resources to steps
        steps[1].suggested_resource_ids = [resources['Biomedical Engineer Labor'].id]
        steps[1].save()

        steps[2].suggested_resource_ids = [
            resources['Titanium Ti-6Al-4V Grade 23 Powder'].id,
            resources['SLM 3D Metal Printer #1'].id,
        ]
        steps[2].save()

        steps[3].suggested_resource_ids = [
            resources['5-Axis Precision CNC Milling'].id,
            resources['Biomedical Engineer Labor'].id,
        ]
        steps[3].save()

        steps[4].suggested_resource_ids = [
            resources['QA Specialist Labor'].id,
            resources['Sterile Barrier Packaging Kit (UDI)'].id,
        ]
        steps[4].save()

        steps[5].suggested_resource_ids = [
            resources['Sterile Barrier Packaging Kit (UDI)'].id,
            resources['Biomedical Engineer Labor'].id,
        ]
        steps[5].save()

        # 3. Seed Realistic Medical Orders across different steps
        orders_data = [
            {
                'case_id': 'CAS-2026-081',
                'patient_ref': 'PT-BKK-491',
                'implant_type': Order.ImplantType.CRANIAL_PLATE,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[1],
                'step_history': [(None, steps[1], 'Nurse Somying (Chulalongkorn Hosp)', 'DICOM received from hospital. Mesh reconstruction initiated.')],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('2.5'), 'Eng. Khant Lin')
                ]
            },
            {
                'case_id': 'CAS-2026-082',
                'patient_ref': 'PT-CNX-102',
                'implant_type': Order.ImplantType.MANDIBULAR_RECON,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[2],
                'step_history': [
                    (None, steps[1], 'Sales Rep Anan', 'Case registered.'),
                    (steps[1], steps[2], 'Eng. Khant Lin', 'Surgeon approved CAD cut guides. Transferred to 3D Print Job #42.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('4.0'), 'Eng. Khant Lin'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('180.00'), 'Print Tech Natthapong'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('5.5'), 'Print Tech Natthapong')
                ]
            },
            {
                'case_id': 'CAS-2026-083',
                'patient_ref': 'PT-BKK-305',
                'implant_type': Order.ImplantType.HIP_ACETABULAR_CUP,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[3],
                'step_history': [
                    (None, steps[1], 'Case intake', 'Initial CT data uploaded.'),
                    (steps[1], steps[2], 'Biomed Eng', '3D design complete.'),
                    (steps[2], steps[3], 'Operator Somkiat', 'SLM printing completed with zero porosity defects. Moving to CNC finish.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('3.0'), 'Biomed Eng'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('240.00'), 'Operator Somkiat'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('6.5'), 'Operator Somkiat'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('2.0'), 'Machinist Chai')
                ]
            },
            {
                'case_id': 'CAS-2026-084',
                'patient_ref': 'PT-PKT-719',
                'implant_type': Order.ImplantType.SPINAL_CAGE,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[4],
                'step_history': [
                    (None, steps[1], 'Intake', 'DICOM upload.'),
                    (steps[1], steps[2], 'Biomedical Team', 'CAD model signed off.'),
                    (steps[2], steps[3], 'Print Team', '3D Printing completed.'),
                    (steps[3], steps[4], 'Machinist Chai', 'CNC deburring & polishing verified. Ready for QA cleanroom.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('2.0'), 'Biomedical Team'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('95.00'), 'Print Team'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('3.5'), 'Print Team'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('1.5'), 'Machinist Chai'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('1.5'), 'QA Lead Dr. Waraporn')
                ]
            },
            {
                'case_id': 'CAS-2026-085',
                'patient_ref': 'PT-BKK-092',
                'implant_type': Order.ImplantType.CRANIAL_PLATE,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.COMPLETED,
                'current_step': steps[5],
                'step_history': [
                    (None, steps[1], 'Intake', 'Emergency craniotomy case.'),
                    (steps[1], steps[2], 'Biomedical Team', 'Rapid CAD generated.'),
                    (steps[2], steps[3], 'SLM Team', 'Printed overnight.'),
                    (steps[3], steps[4], 'Machining', 'CNC milling done.'),
                    (steps[4], steps[5], 'QA Team', 'Passed all ISO 13485 bio-compatibility and CMM checks.'),
                    (steps[5], steps[5], 'Dispatch Officer', 'UDI-compliant label laser-etched and packaged for Siriraj Hospital.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('3.5'), 'Biomedical Team'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('160.00'), 'SLM Team'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('5.0'), 'SLM Team'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('2.0'), 'Machining'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('2.0'), 'QA Team'),
                    (steps[5], resources['Sterile Barrier Packaging Kit (UDI)'], Decimal('1.0'), 'Dispatch Officer')
                ]
            }
        ]

        for od in orders_data:
            order_obj, _ = Order.objects.update_or_create(
                case_id=od['case_id'],
                defaults={
                    'patient_ref': od['patient_ref'],
                    'implant_type': od['implant_type'],
                    'priority': od['priority'],
                    'status': od['status'],
                    'current_step': od['current_step']
                }
            )

            # Clear previous logs if reseeding
            order_obj.step_logs.all().delete()
            order_obj.consumptions.all().delete()

            for from_s, to_s, op, note in od['step_history']:
                OrderStepLog.objects.create(
                    order=order_obj,
                    from_step=from_s,
                    to_step=to_s,
                    operator_name=op,
                    notes=note
                )

            for step_ref, res_ref, qty, logged_by in od['consumptions']:
                OrderResourceConsumption.objects.create(
                    order=order_obj,
                    step=step_ref,
                    resource=res_ref,
                    quantity=qty,
                    logged_by=logged_by
                )

        self.stdout.write(self.style.SUCCESS("MetiTrack database successfully seeded with 5 Steps, 6 Resources, and 5 Patient Cases!"))
