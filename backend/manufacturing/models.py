from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal


class ProcessStep(models.Model):
    """
    Represents a sequential step in the manufacturing process (Step 1 to 5).
    """
    sequence_order = models.PositiveIntegerField(unique=True, help_text="Strict sequence index (1, 2, 3...)")
    code = models.CharField(max_length=50, unique=True, help_text="Unique step code e.g. STEP_CAD, STEP_PRINT")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    suggested_resource_ids = models.JSONField(default=list, blank=True, help_text="List of Resource IDs typically logged at this step")

    class Meta:
        ordering = ['sequence_order']
        verbose_name = "Process Step"
        verbose_name_plural = "Process Steps"

    def __str__(self):
        return f"Step {self.sequence_order}: {self.name}"

    def get_next_step(self):
        return ProcessStep.objects.filter(sequence_order=self.sequence_order + 1).first()


class Resource(models.Model):
    """
    Represents a consumable material, machine capacity, or labor hour.
    """
    class Category(models.TextChoices):
        MATERIAL = 'MATERIAL', 'Material'
        MACHINE_TIME = 'MACHINE_TIME', 'Machine Time'
        LABOR = 'LABOR', 'Labor'

    class Unit(models.TextChoices):
        GRAMS = 'GRAMS', 'grams'
        HOURS = 'HOURS', 'hours'
        UNITS = 'UNITS', 'units'

    name = models.CharField(max_length=150, unique=True)
    category = models.CharField(max_length=30, choices=Category.choices)
    unit = models.CharField(max_length=20, choices=Unit.choices)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_available = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('10000.00'))

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_unit_display()})"


class Order(models.Model):
    """
    Represents a Patient-Specific Implant (PSI) manufacturing order.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class ImplantType(models.TextChoices):
        CRANIAL_PLATE = 'CRANIAL_PLATE', 'Custom Titanium Cranial Plate'
        MANDIBULAR_RECON = 'MANDIBULAR_RECON', 'Mandibular Reconstruction Plate'
        HIP_ACETABULAR_CUP = 'HIP_ACETABULAR_CUP', 'Personalized Acetabular Hip Cup'
        SPINAL_CAGE = 'SPINAL_CAGE', 'Custom Titanium Spinal Fusion Cage'

    class Priority(models.TextChoices):
        STANDARD = 'STANDARD', 'Standard'
        URGENT = 'URGENT', 'Urgent (Emergency Surgery)'

    case_id = models.CharField(max_length=50, unique=True, db_index=True, help_text="e.g. CAS-2026-001")
    patient_ref = models.CharField(max_length=50, help_text="Anonymized Patient Reference (HIPAA compliance)")
    implant_type = models.CharField(max_length=50, choices=ImplantType.choices)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.STANDARD)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    current_step = models.ForeignKey(ProcessStep, on_delete=models.PROTECT, related_name='orders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return f"{self.case_id} — {self.get_implant_type_display()} ({self.status})"

    def can_advance(self):
        return self.status == self.Status.IN_PROGRESS and self.current_step.get_next_step() is not None or (self.current_step.sequence_order == 5 and self.status == self.Status.IN_PROGRESS)


class OrderResourceConsumption(models.Model):
    """
    Records specific resource consumption for an order at a specific step.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='consumptions')
    step = models.ForeignKey(ProcessStep, on_delete=models.PROTECT, related_name='consumptions')
    resource = models.ForeignKey(Resource, on_delete=models.PROTECT, related_name='consumptions')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    logged_at = models.DateTimeField(auto_now_add=True)
    logged_by = models.CharField(max_length=100, default='Operator')

    class Meta:
        ordering = ['-logged_at']

    def clean(self):
        if self.quantity <= Decimal('0.00'):
            raise ValidationError({'quantity': "Resource consumption quantity must be greater than zero."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order.case_id} @ Step {self.step.sequence_order}: {self.quantity} {self.resource.unit} of {self.resource.name}"


class OrderStepLog(models.Model):
    """
    Immutable audit log documenting step transitions for medical device traceability (ISO 13485).
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='step_logs')
    from_step = models.ForeignKey(ProcessStep, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    to_step = models.ForeignKey(ProcessStep, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    transitioned_at = models.DateTimeField(auto_now_add=True)
    operator_name = models.CharField(max_length=100)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-transitioned_at']

    def __str__(self):
        from_str = self.from_step.name if self.from_step else "Created"
        to_str = self.to_step.name if self.to_step else "Finished"
        return f"{self.order.case_id}: {from_str} -> {to_str} by {self.operator_name}"
