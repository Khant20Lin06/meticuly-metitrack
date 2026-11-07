class DomainValidationError(Exception):
    """Base domain validation exception for manufacturing business logic."""
    pass


class IllegalStateTransitionError(DomainValidationError):
    """Raised when an illegal step transition (e.g. step skipping, invalid advance) is attempted."""
    pass


class OrderCompletedError(DomainValidationError):
    """Raised when an operation is attempted on an already completed order."""
    pass


class InsufficientInventoryError(DomainValidationError):
    """Raised when consumable inventory balance is insufficient for production logging."""
    pass


class UnauthorizedStepOperatorError(DomainValidationError):
    """Raised when an operator's role does not meet step authorization requirements (ISO 13485 RBAC)."""
    pass
