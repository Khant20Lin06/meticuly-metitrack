from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from decimal import Decimal


class EncryptedCharField(models.CharField):
    """
    HIPAA Security Rule (45 CFR § 164.312(a)(2)(iv)) & ISO 27799 Compliant Field.
    Transparently encrypts with AES-256-GCM before database write,
    and decrypts back to plaintext upon database retrieval.
    """
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 255)
        super().__init__(*args, **kwargs)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        from .services import PHIEncryptionService
        return PHIEncryptionService.decrypt(value)

    def to_python(self, value):
        if value is None:
            return value
        from .services import PHIEncryptionService
        return PHIEncryptionService.decrypt(value)

    def get_prep_value(self, value):
        if value is None:
            return value
        from .services import PHIEncryptionService
        return PHIEncryptionService.encrypt(str(value))


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
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['name']),
        ]

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
    patient_ref = EncryptedCharField(max_length=255, help_text="AES-256-GCM Encrypted Patient Reference (HIPAA compliance)")
    implant_type = models.CharField(max_length=50, choices=ImplantType.choices)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.STANDARD)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    current_step = models.ForeignKey(ProcessStep, on_delete=models.PROTECT, related_name='orders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['case_id']),
            models.Index(fields=['patient_ref']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['implant_type']),
            models.Index(fields=['status', 'priority']),
        ]

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
        indexes = [
            models.Index(fields=['order', 'step']),
            models.Index(fields=['resource']),
            models.Index(fields=['logged_at']),
        ]

    def clean(self):
        if self.quantity <= Decimal('0.00'):
            raise ValidationError({'quantity': "Resource consumption quantity must be greater than zero."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order.case_id} @ Step {self.step.sequence_order}: {self.quantity} {self.resource.unit} of {self.resource.name}"


class ImmutableLogQuerySet(models.QuerySet):
    """
    QuerySet that strictly forbids batch updates and batch deletions on audit logs.
    """
    def delete(self):
        raise ValidationError("ISO 13485 Compliance Violation: Batch deletion of OrderStepLog records is strictly forbidden.")

    def update(self, **kwargs):
        raise ValidationError("ISO 13485 Compliance Violation: Batch update of OrderStepLog records is strictly forbidden.")


class ImmutableLogManager(models.Manager):
    def get_queryset(self):
        return ImmutableLogQuerySet(self.model, using=self._db)


class OrderStepLog(models.Model):
    """
    Immutable audit log documenting step transitions for medical device traceability (ISO 13485 / FDA 21 CFR Part 11).
    Enforces strict Append-Only integrity: updates and deletions are permanently prohibited.
    """
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name='step_logs')
    from_step = models.ForeignKey(ProcessStep, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    to_step = models.ForeignKey(ProcessStep, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    transitioned_at = models.DateTimeField(auto_now_add=True)
    operator_name = models.CharField(max_length=100)
    notes = models.TextField(blank=True)

    objects = ImmutableLogManager()

    class Meta:
        ordering = ['-transitioned_at']
        indexes = [
            models.Index(fields=['order', 'transitioned_at']),
        ]

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValidationError(
                "ISO 13485 Compliance Violation: OrderStepLog audit records are immutable and cannot be updated once created."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "ISO 13485 Compliance Violation: OrderStepLog audit records cannot be deleted. Traceability logs are append-only."
        )

    def __str__(self):
        from_str = self.from_step.name if self.from_step else "Created"
        to_str = self.to_step.name if self.to_step else "Finished"
        return f"{self.order.case_id}: {from_str} -> {to_str} by {self.operator_name}"


class OperatorProfile(models.Model):
    """
    Certified operator profile linked to Django User for ISO 13485 / FDA 21 CFR Part 11
    electronic signatures and Role-Based Access Control (RBAC).
    """
    class Role(models.TextChoices):
        BIOMEDICAL_ENGINEER = 'BIOMEDICAL_ENGINEER', 'Biomedical Engineer'
        PRODUCTION_OPERATOR = 'PRODUCTION_OPERATOR', 'Production Operator'
        QA_SPECIALIST = 'QA_SPECIALIST', 'QA Specialist'
        ADMIN = 'ADMIN', 'Plant Administrator'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='operator_profile')
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.ADMIN)
    badge_number = models.CharField(max_length=50, blank=True)
    title = models.CharField(max_length=150, blank=True)
    certification_id = models.CharField(max_length=100, blank=True, help_text="ISO 13485 Personnel Certification Number")

    # FDA 21 CFR Part 11 & NIST FIPS 186-5 ECDSA PKI Keypair (SECP256R1)
    public_key_pem = models.TextField(blank=True, help_text="ECDSA SECP256R1 SubjectPublicKeyInfo PEM")
    key_fingerprint = models.CharField(max_length=100, blank=True, help_text="SHA256 Key Fingerprint e.g. SHA256:4A8F...")
    private_key_pem = models.TextField(blank=True, help_text="ECDSA SECP256R1 PKCS8 Private Key PEM")

    class Meta:
        ordering = ['user__username']
        verbose_name = "Operator Profile"
        verbose_name_plural = "Operator Profiles"

    def __str__(self):
        full_name = self.user.get_full_name() or self.user.username
        return f"{full_name} ({self.get_role_display()})"

    def get_decrypted_private_key(self) -> str:
        """Decrypts and returns the raw ECDSA PEM private key for in-memory signing operations."""
        if not self.private_key_pem:
            return ""
        from .services import PHIEncryptionService
        return PHIEncryptionService.decrypt(self.private_key_pem)

    def ensure_pki_keypair(self) -> tuple[str, str, str]:
        """
        Ensures an individual ECDSA NIST P-256 keypair exists for this operator.
        Generates and securely stores encrypted private key at rest using AES-256-GCM (FDA 21 CFR Part 11).
        Returns plaintext in-memory tuple for signing:
            (private_key_pem, public_key_pem, key_fingerprint)
        """
        from .services import PHIEncryptionService
        if not self.public_key_pem or not self.private_key_pem:
            from .services import PKIService
            priv, pub, fp = PKIService.generate_operator_keypair()
            # FDA 21 CFR Part 11 & NIST SP 800-38D: Encrypt private key at rest
            self.private_key_pem = PHIEncryptionService.encrypt(priv)
            self.public_key_pem = pub
            self.key_fingerprint = fp
            self.save(update_fields=['private_key_pem', 'public_key_pem', 'key_fingerprint'])
            return priv, pub, fp

        raw_priv = PHIEncryptionService.decrypt(self.private_key_pem)
        # Transparent migration: If legacy record was unencrypted, encrypt it on disk now
        if not PHIEncryptionService.is_encrypted(self.private_key_pem):
            self.private_key_pem = PHIEncryptionService.encrypt(raw_priv)
            self.save(update_fields=['private_key_pem'])

        return raw_priv, self.public_key_pem, self.key_fingerprint


class SecurityAuditEvent(models.Model):
    """
    Immutable security audit trail for FDA 21 CFR Part 11 / ISO 13485 compliance & OWASP A09.
    Records authentication failures, unauthorized role access attempts, rate limiting, and cryptographic tamper events.
    """
    class EventType(models.TextChoices):
        AUTH_SUCCESS = 'AUTH_SUCCESS', 'Authentication Succeeded'
        AUTH_FAILED = 'AUTH_FAILED', 'Authentication Failed'
        ROLE_VIOLATION = 'ROLE_VIOLATION', 'Unauthorized Role Access Attempt'
        TAMPER_DETECTED = 'TAMPER_DETECTED', 'Cryptographic Data Tampering Detected'
        RATE_LIMITED = 'RATE_LIMITED', 'Rate Limit Threshold Exceeded'
        DHR_SIGNED = 'DHR_SIGNED', 'eDHR Digital Signature Affixed'

    class Severity(models.TextChoices):
        INFO = 'INFO', 'Informational'
        WARNING = 'WARNING', 'Warning'
        CRITICAL = 'CRITICAL', 'Critical Alert'

    event_type = models.CharField(max_length=50, choices=EventType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    actor_username = models.CharField(max_length=150, blank=True, help_text="Attempted username or authenticated operator")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10, default='GET')
    status_code = models.PositiveIntegerField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    objects = ImmutableLogManager()

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type']),
            models.Index(fields=['severity']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['actor_username']),
        ]

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValidationError(
                "ISO 13485 Compliance: SecurityAuditEvent records are append-only and cannot be modified."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "ISO 13485 Compliance: SecurityAuditEvent records are append-only and cannot be deleted."
        )

    def __str__(self):
        return f"[{self.severity}] {self.get_event_type_display()} at {self.endpoint} by {self.actor_username or 'Anonymous'}"

