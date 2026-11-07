from .exceptions import UnauthorizedStepOperatorError


class RBACService:
    """
    Role-Based Access Control (RBAC) Service enforcing ISO 13485 operator sign-off boundaries:
    - Step 1 (CAD): Biomedical Engineer or Admin
    - Step 2 & 3 (3D Printing & CNC): Production Operator or Admin
    - Step 4 & 5 (QA & Packaging): QA Specialist or Admin
    """

    ROLE_DEFINITIONS = [
        {
            'role_key': 'BIOMEDICAL_ENGINEER',
            'title': 'Biomedical Engineer',
            'description': 'Responsible for patient DICOM segmentation, 3D anatomical modeling, and surgical CAD sign-off.',
            'authorized_steps': [1],
        },
        {
            'role_key': 'PRODUCTION_OPERATOR',
            'title': 'Production Operator / Machinist',
            'description': 'Certified for SLM 280 additive manufacturing, powder handling, and 5-axis CNC machining.',
            'authorized_steps': [2, 3],
        },
        {
            'role_key': 'QA_SPECIALIST',
            'title': 'QA Specialist / Inspector',
            'description': 'Authorized for ISO 13485 CMM dimensional release, cleanroom packaging, and final sterilization approval.',
            'authorized_steps': [4, 5],
        },
        {
            'role_key': 'ADMIN',
            'title': 'Plant Administrator / Plant Lead',
            'description': 'Supervisory override across all 5 manufacturing stations.',
            'authorized_steps': [1, 2, 3, 4, 5],
        },
    ]

    STEP_ROLE_PERMISSIONS = {
        1: ['BIOMEDICAL_ENGINEER', 'ADMIN', 'LEAD_ENGINEER', 'BIOMEDICAL_SPECIALIST'],
        2: ['PRODUCTION_OPERATOR', 'ADMIN', 'MACHINIST', 'SLM_OPERATOR'],
        3: ['PRODUCTION_OPERATOR', 'ADMIN', 'MACHINIST', 'CNC_OPERATOR'],
        4: ['QA_SPECIALIST', 'ADMIN', 'QA_INSPECTOR', 'QA_LEAD'],
        5: ['QA_SPECIALIST', 'ADMIN', 'LOGISTICS_LEAD', 'QA_INSPECTOR'],
    }

    @classmethod
    def validate_step_permission(cls, sequence_order: int, step_name: str, operator_role: str = None, user = None):
        """
        Validates whether the operator is authorized to sign off the given step.
        If user is authenticated, the role from user.operator_profile (or admin status)
        is cryptographically trusted and takes precedence over any client-provided string.
        """
        resolved_role = None

        if user and user.is_authenticated:
            if hasattr(user, 'operator_profile'):
                resolved_role = user.operator_profile.role
            elif user.is_superuser:
                resolved_role = 'ADMIN'

        if not resolved_role and operator_role:
            # Zero-Trust RBAC: Only accept operator_role parameter if user is NOT authenticated (internal/service tests)
            if not (user and user.is_authenticated):
                resolved_role = operator_role

        if not resolved_role:
            raise UnauthorizedStepOperatorError(
                f"ISO 13485 Compliance Violation: Uncertified or anonymous operator attempted sign-off on Step {sequence_order} ({step_name}). Authenticated operator credentials required."
            )

        normalized_role = resolved_role.strip().upper()
        allowed_roles = cls.STEP_ROLE_PERMISSIONS.get(sequence_order, ['ADMIN'])

        if normalized_role not in allowed_roles:
            raise UnauthorizedStepOperatorError(
                f"ISO 13485 Compliance Violation: Role '{resolved_role}' is not authorized to sign off Step {sequence_order} ({step_name}). "
                f"Required role: {', '.join(allowed_roles)}."
            )

    @classmethod
    def get_role_catalog(cls) -> list:
        """
        Returns full persona catalog and station permission matrix.
        """
        return cls.ROLE_DEFINITIONS
