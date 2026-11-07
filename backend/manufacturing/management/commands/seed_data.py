from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User
from decimal import Decimal
from manufacturing.models import (
    ProcessStep,
    Resource,
    Order,
    OrderResourceConsumption,
    OrderStepLog,
    OperatorProfile,
    SecurityAuditEvent,
)


class Command(BaseCommand):
    help = "Seeds initial manufacturing steps, resources, and realistic Meticuly implant orders"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding MetiTrack production data...")

        # 0. Seed Certified Operator Users for Real Authentication (OWASP A01 & A07)
        operators_data = [
            {
                'username': 'admin',
                'password': 'MeticulyAdmin2026!',
                'first_name': 'Plant',
                'last_name': 'Administrator',
                'email': 'admin@meticuly.com',
                'role': OperatorProfile.Role.ADMIN,
                'title': 'Plant Operations Lead & Admin',
                'badge_number': 'METI-ADMIN-01',
                'certification_id': 'ISO-13485-AUDITOR-2026',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'biomed_lead',
                'password': 'Biomed2026!',
                'first_name': 'Khant',
                'last_name': 'Lin',
                'email': 'biomed@meticuly.com',
                'role': OperatorProfile.Role.BIOMEDICAL_ENGINEER,
                'title': 'Lead Biomedical Engineer',
                'badge_number': 'METI-BIO-44',
                'certification_id': 'DICOM-CAD-CERT-908',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'slm_tech',
                'password': 'Operator2026!',
                'first_name': 'Natthapong',
                'last_name': 'Sombat',
                'email': 'slm.tech@meticuly.com',
                'role': OperatorProfile.Role.PRODUCTION_OPERATOR,
                'title': 'Senior SLM / CNC Additive Machinist',
                'badge_number': 'METI-SLM-12',
                'certification_id': 'SLM-SOLUTIONS-280-CERT',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'qa_lead',
                'password': 'QASpecialist2026!',
                'first_name': 'Waraporn',
                'last_name': 'Panyasiri',
                'email': 'qa.lead@meticuly.com',
                'role': OperatorProfile.Role.QA_SPECIALIST,
                'title': 'ISO 13485 Lead Quality Inspector',
                'badge_number': 'METI-QA-08',
                'certification_id': 'ASQ-CMM-INSPECTOR-2026',
                'is_staff': False,
                'is_superuser': False,
            },
        ]

        for op in operators_data:
            user, _ = User.objects.get_or_create(
                username=op['username'],
                defaults={
                    'first_name': op['first_name'],
                    'last_name': op['last_name'],
                    'email': op['email'],
                    'is_staff': op['is_staff'],
                    'is_superuser': op['is_superuser'],
                }
            )
            user.set_password(op['password'])
            user.first_name = op['first_name']
            user.last_name = op['last_name']
            user.email = op['email']
            user.is_staff = op['is_staff']
            user.is_superuser = op['is_superuser']
            user.save()

            OperatorProfile.objects.update_or_create(
                user=user,
                defaults={
                    'role': op['role'],
                    'title': op['title'],
                    'badge_number': op['badge_number'],
                    'certification_id': op['certification_id'],
                }
            )

        self.stdout.write(f"Seeded {len(operators_data)} certified operator accounts with secure credentials.")

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
                'name': 'Additive Machinist & CNC Labor',
                'category': Resource.Category.LABOR,
                'unit': Resource.Unit.HOURS,
                'cost_per_unit': Decimal('38.00'),
                'total_available': Decimal('1000.00'),
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

        # Link suggested resources to steps (Medically and Operationally Accurate BOM)
        steps[1].suggested_resource_ids = [resources['Biomedical Engineer Labor'].id]
        steps[1].save()

        steps[2].suggested_resource_ids = [
            resources['Titanium Ti-6Al-4V Grade 23 Powder'].id,
            resources['SLM 3D Metal Printer #1'].id,
        ]
        steps[2].save()

        steps[3].suggested_resource_ids = [
            resources['5-Axis Precision CNC Milling'].id,
            resources['Additive Machinist & CNC Labor'].id,
        ]
        steps[3].save()

        steps[4].suggested_resource_ids = [
            resources['QA Specialist Labor'].id,
        ]
        steps[4].save()

        steps[5].suggested_resource_ids = [
            resources['Sterile Barrier Packaging Kit (UDI)'].id,
            resources['QA Specialist Labor'].id,
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
            },
            {
                'case_id': 'CAS-2026-086',
                'patient_ref': 'PT-BKK-512',
                'implant_type': Order.ImplantType.CRANIAL_PLATE,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[1],
                'step_history': [(None, steps[1], 'Nurse Kanya (Siriraj)', 'High-speed trauma CT received. Urgent cranial flap reconstruct.')],
                'consumptions': [(steps[1], resources['Biomedical Engineer Labor'], Decimal('2.0'), 'Eng. Thanawat')]
            },
            {
                'case_id': 'CAS-2026-087',
                'patient_ref': 'PT-CNX-204',
                'implant_type': Order.ImplantType.MANDIBULAR_RECON,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[1],
                'step_history': [(None, steps[1], 'Biomed Specialist', 'Oncology resection plan verified.')],
                'consumptions': [(steps[1], resources['Biomedical Engineer Labor'], Decimal('1.5'), 'Eng. Thanawat')]
            },
            {
                'case_id': 'CAS-2026-088',
                'patient_ref': 'PT-HDY-331',
                'implant_type': Order.ImplantType.HIP_ACETABULAR_CUP,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[2],
                'step_history': [
                    (None, steps[1], 'Clinical Liaison', 'Severe acetabular bone defect.'),
                    (steps[1], steps[2], 'Biomedical Lead', 'Trabecular lattice designed. Build plate nesting approved.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('3.5'), 'Biomedical Lead'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('210.00'), 'Print Tech Natthapong'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('5.0'), 'Print Tech Natthapong')
                ]
            },
            {
                'case_id': 'CAS-2026-089',
                'patient_ref': 'PT-PKT-842',
                'implant_type': Order.ImplantType.SPINAL_CAGE,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[2],
                'step_history': [
                    (None, steps[1], 'Intake Desk', 'L4-L5 anterior lumbar fusion.'),
                    (steps[1], steps[2], 'Eng. Khant Lin', 'Porous titanium cage slices generated.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('2.5'), 'Eng. Khant Lin'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('110.00'), 'Print Tech Natthapong'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('4.0'), 'Print Tech Natthapong')
                ]
            },
            {
                'case_id': 'CAS-2026-090',
                'patient_ref': 'PT-BKK-610',
                'implant_type': Order.ImplantType.CRANIAL_PLATE,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[3],
                'step_history': [
                    (None, steps[1], 'Intake', 'Parietal skull defect.'),
                    (steps[1], steps[2], 'Biomed Lead', 'CAD ready.'),
                    (steps[2], steps[3], 'Operator Somkiat', 'SLM printing completed. Sintering plate wire cut.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('3.0'), 'Biomed Lead'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('175.00'), 'Operator Somkiat'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('5.0'), 'Operator Somkiat'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('2.5'), 'Machinist Chai')
                ]
            },
            {
                'case_id': 'CAS-2026-091',
                'patient_ref': 'PT-CNX-711',
                'implant_type': Order.ImplantType.MANDIBULAR_RECON,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[3],
                'step_history': [
                    (None, steps[1], 'Intake', 'Fibula free flap mandibular plate.'),
                    (steps[1], steps[2], 'Biomed Specialist', 'CAD model signed off by surgeon.'),
                    (steps[2], steps[3], 'Print Team', 'Laser powder bed fusion finished.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('4.0'), 'Biomed Specialist'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('190.00'), 'Print Team'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('6.0'), 'Print Team'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('3.0'), 'Machinist Chai')
                ]
            },
            {
                'case_id': 'CAS-2026-092',
                'patient_ref': 'PT-HDY-419',
                'implant_type': Order.ImplantType.HIP_ACETABULAR_CUP,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[4],
                'step_history': [
                    (None, steps[1], 'Intake', 'Revision total hip arthroplasty.'),
                    (steps[1], steps[2], 'Biomed Team', 'CAD model complete.'),
                    (steps[2], steps[3], 'SLM Print Tech', 'Additive manufacturing done.'),
                    (steps[3], steps[4], 'Machinist Chai', 'Screw hole threading complete. Moving to Cleanroom QA.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('3.0'), 'Biomed Team'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('230.00'), 'SLM Print Tech'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('6.5'), 'SLM Print Tech'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('2.0'), 'Machinist Chai'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('2.0'), 'QA Lead Dr. Waraporn')
                ]
            },
            {
                'case_id': 'CAS-2026-093',
                'patient_ref': 'PT-BKK-889',
                'implant_type': Order.ImplantType.SPINAL_CAGE,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[4],
                'step_history': [
                    (None, steps[1], 'Intake', 'Cervical corpectomy cage.'),
                    (steps[1], steps[2], 'Biomed Team', 'CAD complete.'),
                    (steps[2], steps[3], 'Print Tech', 'SLM build complete.'),
                    (steps[3], steps[4], 'Machinist', 'CNC finishing complete.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('2.5'), 'Biomed Team'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('120.00'), 'Print Tech'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('4.0'), 'Print Tech'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('1.5'), 'Machinist'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('1.5'), 'QA Lead')
                ]
            },
            {
                'case_id': 'CAS-2026-094',
                'patient_ref': 'PT-PKT-125',
                'implant_type': Order.ImplantType.CRANIAL_PLATE,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[5],
                'step_history': [
                    (None, steps[1], 'Intake', 'Frontal bone defect.'),
                    (steps[1], steps[2], 'Biomedical Lead', 'Anatomical curvature confirmed.'),
                    (steps[2], steps[3], 'Print Team', 'Laser powder bed fusion complete.'),
                    (steps[3], steps[4], 'Machinist', 'Mirror finish deburring.'),
                    (steps[4], steps[5], 'QA Specialist', 'CMM tolerance ±25µm certified. Sterile wash passed.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('3.0'), 'Biomedical Lead'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('150.00'), 'Print Team'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('5.0'), 'Print Team'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('2.0'), 'Machinist'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('2.0'), 'QA Specialist')
                ]
            },
            {
                'case_id': 'CAS-2026-095',
                'patient_ref': 'PT-BKK-901',
                'implant_type': Order.ImplantType.MANDIBULAR_RECON,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[5],
                'step_history': [
                    (None, steps[1], 'Intake', 'Gunshot trauma mandibular defect.'),
                    (steps[1], steps[2], 'Biomed Team', 'Emergency CAD modeling approved.'),
                    (steps[2], steps[3], 'SLM Tech', 'Printed overnight with high density parameters.'),
                    (steps[3], steps[4], 'Machinist', 'Condyle joint interface milled.'),
                    (steps[4], steps[5], 'QA Lead', 'Passed cleanroom bio-burden inspection.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('4.5'), 'Biomed Team'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('200.00'), 'SLM Tech'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('6.5'), 'SLM Tech'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('3.5'), 'Machinist'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('2.5'), 'QA Lead')
                ]
            },
            {
                'case_id': 'CAS-2026-096',
                'patient_ref': 'PT-CNX-330',
                'implant_type': Order.ImplantType.HIP_ACETABULAR_CUP,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.COMPLETED,
                'current_step': steps[5],
                'step_history': [
                    (None, steps[1], 'Intake', 'Primary hip reconstruction.'),
                    (steps[1], steps[2], 'Biomed Team', 'CAD approved.'),
                    (steps[2], steps[3], 'Print Team', 'SLM printing completed.'),
                    (steps[3], steps[4], 'Machining', 'CNC milling done.'),
                    (steps[4], steps[5], 'QA Team', 'Passed ISO 13485 CMM inspection.'),
                    (steps[5], steps[5], 'Dispatch', 'Packaged with GS1-128 barcode and dispatched to Chiang Mai.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('3.0'), 'Biomed Team'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('220.00'), 'Print Team'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('6.0'), 'Print Team'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('2.0'), 'Machining'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('2.0'), 'QA Team'),
                    (steps[5], resources['Sterile Barrier Packaging Kit (UDI)'], Decimal('1.0'), 'Dispatch')
                ]
            },
            {
                'case_id': 'CAS-2026-097',
                'patient_ref': 'PT-HDY-505',
                'implant_type': Order.ImplantType.SPINAL_CAGE,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.COMPLETED,
                'current_step': steps[5],
                'step_history': [
                    (None, steps[1], 'Intake', 'Multilevel spinal fusion.'),
                    (steps[1], steps[2], 'Biomed Team', 'Lattice parameters calibrated.'),
                    (steps[2], steps[3], 'Print Tech', 'SLM build passed.'),
                    (steps[3], steps[4], 'Machinist', 'CNC surface conditioning.'),
                    (steps[4], steps[5], 'QA Specialist', 'Cleanroom batch certified.'),
                    (steps[5], steps[5], 'Packaging Officer', 'UDI label sealed and dispatched to Songklanagarind Hosp.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('2.5'), 'Biomed Team'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('115.00'), 'Print Tech'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('3.5'), 'Print Tech'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('1.5'), 'Machinist'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('1.5'), 'QA Specialist'),
                    (steps[5], resources['Sterile Barrier Packaging Kit (UDI)'], Decimal('1.0'), 'Packaging Officer')
                ]
            },
            {
                'case_id': 'CAS-2026-098',
                'patient_ref': 'PT-BKK-774',
                'implant_type': Order.ImplantType.CRANIAL_PLATE,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.COMPLETED,
                'current_step': steps[5],
                'step_history': [
                    (None, steps[1], 'Intake', 'Emergency neurosurgical decompressive craniectomy.'),
                    (steps[1], steps[2], 'Biomed Lead', 'Stat CAD modeling approved within 2 hours.'),
                    (steps[2], steps[3], 'SLM Team', 'Printed overnight.'),
                    (steps[3], steps[4], 'Machining', '5-axis milling finished.'),
                    (steps[4], steps[5], 'QA Team', 'Passed all mechanical & biocompatibility testing.'),
                    (steps[5], steps[5], 'Dispatch Officer', 'Delivered via cold chain courier to King Chulalongkorn Hospital.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('4.0'), 'Biomed Lead'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('165.00'), 'SLM Team'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('5.5'), 'SLM Team'),
                    (steps[3], resources['5-Axis Precision CNC Milling'], Decimal('2.5'), 'Machining'),
                    (steps[4], resources['QA Specialist Labor'], Decimal('2.0'), 'QA Team'),
                    (steps[5], resources['Sterile Barrier Packaging Kit (UDI)'], Decimal('1.0'), 'Dispatch Officer')
                ]
            },
            {
                'case_id': 'CAS-2026-099',
                'patient_ref': 'PT-PKT-602',
                'implant_type': Order.ImplantType.MANDIBULAR_RECON,
                'priority': Order.Priority.STANDARD,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[1],
                'step_history': [(None, steps[1], 'Nurse Supaporn (Vachira Phuket)', 'Bilateral mandibular fracture scan uploaded.')],
                'consumptions': [(steps[1], resources['Biomedical Engineer Labor'], Decimal('2.0'), 'Eng. Thanawat')]
            },
            {
                'case_id': 'CAS-2026-100',
                'patient_ref': 'PT-BKK-998',
                'implant_type': Order.ImplantType.HIP_ACETABULAR_CUP,
                'priority': Order.Priority.URGENT,
                'status': Order.Status.IN_PROGRESS,
                'current_step': steps[2],
                'step_history': [
                    (None, steps[1], 'Trauma Surgery Dept', 'Complex pelvic ring discontinuity.'),
                    (steps[1], steps[2], 'Biomedical Team', 'Custom augments and flange plate modeled.')
                ],
                'consumptions': [
                    (steps[1], resources['Biomedical Engineer Labor'], Decimal('4.0'), 'Biomedical Team'),
                    (steps[2], resources['Titanium Ti-6Al-4V Grade 23 Powder'], Decimal('250.00'), 'Print Tech Natthapong'),
                    (steps[2], resources['SLM 3D Metal Printer #1'], Decimal('7.0'), 'Print Tech Natthapong')
                ]
            }
        ]

        created_count = 0
        for od in orders_data:
            order_obj, created = Order.objects.update_or_create(
                case_id=od['case_id'],
                defaults={
                    'patient_ref': od['patient_ref'],
                    'implant_type': od['implant_type'],
                    'priority': od['priority'],
                    'status': od['status'],
                    'current_step': od['current_step']
                }
            )
            if created:
                created_count += 1

            # Only create step logs if none exist to preserve DHR immutability
            if order_obj.step_logs.count() == 0:
                for from_s, to_s, op, note in od['step_history']:
                    OrderStepLog.objects.create(
                        order=order_obj,
                        from_step=from_s,
                        to_step=to_s,
                        operator_name=op,
                        notes=note
                    )

            if order_obj.consumptions.count() == 0:
                for step_ref, res_ref, qty, logged_by in od['consumptions']:
                    OrderResourceConsumption.objects.create(
                        order=order_obj,
                        step=step_ref,
                        resource=res_ref,
                        quantity=qty,
                        logged_by=logged_by
                    )

        # 5. Seed Initial Security Audit Events (FDA 21 CFR Part 11 / ISO 13485 / OWASP A09)
        if SecurityAuditEvent.objects.count() == 0:
            SecurityAuditEvent.objects.create(
                event_type=SecurityAuditEvent.EventType.AUTH_SUCCESS,
                severity=SecurityAuditEvent.Severity.INFO,
                actor_username='admin',
                ip_address='127.0.0.1',
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
                endpoint='/api/auth/token/',
                method='POST',
                status_code=200,
                details={'message': 'Initial system security commissioning and operator audit login'}
            )
            SecurityAuditEvent.objects.create(
                event_type=SecurityAuditEvent.EventType.DHR_SIGNED,
                severity=SecurityAuditEvent.Severity.INFO,
                actor_username='qa_lead',
                ip_address='127.0.0.1',
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
                endpoint='/api/orders/5/sign-dhr/',
                method='POST',
                status_code=200,
                details={'case_id': 'CAS-2026-085', 'meaning': 'Final ISO 13485 Cleanroom Release Certification'}
            )
            SecurityAuditEvent.objects.create(
                event_type=SecurityAuditEvent.EventType.ROLE_VIOLATION,
                severity=SecurityAuditEvent.Severity.WARNING,
                actor_username='slm_tech',
                ip_address='192.168.1.45',
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/131.0.0.0',
                endpoint='/api/orders/2/advance/',
                method='POST',
                status_code=400,
                details={'error': 'Role PRODUCTION_OPERATOR not authorized for Step 1 CAD sign-off (Biomedical Engineer required)'}
            )
            SecurityAuditEvent.objects.create(
                event_type=SecurityAuditEvent.EventType.AUTH_FAILED,
                severity=SecurityAuditEvent.Severity.WARNING,
                actor_username='intruder_unknown',
                ip_address='192.168.1.188',
                user_agent='python-requests/2.31.0',
                endpoint='/api/auth/token/',
                method='POST',
                status_code=401,
                details={'reason': 'Invalid operator credentials - possible credential spray attempt'}
            )
            SecurityAuditEvent.objects.create(
                event_type=SecurityAuditEvent.EventType.RATE_LIMITED,
                severity=SecurityAuditEvent.Severity.CRITICAL,
                actor_username='bot_scanner',
                ip_address='192.168.1.188',
                user_agent='curl/8.4.0',
                endpoint='/api/auth/token/',
                method='POST',
                status_code=429,
                details={'reason': 'Request was throttled. Expected available in 58 seconds.'}
            )

        self.stdout.write(self.style.SUCCESS(f"MetiTrack database successfully seeded! Total {len(orders_data)} clinical cases active across 5 steps."))
