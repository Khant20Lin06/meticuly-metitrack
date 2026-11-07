import logging
from manufacturing.models import SecurityAuditEvent

logger = logging.getLogger('meticuly.security')


class SecurityAuditService:
    """
    Enterprise Security Audit Logging Service (FDA 21 CFR Part 11 / ISO 13485:2016 / OWASP A09).
    Persists immutable security audit logs to SQLite/PostgreSQL and streams structured telemetry to syslog/SIEM.
    """

    @classmethod
    def log_event(
        cls,
        event_type: str,
        severity: str = SecurityAuditEvent.Severity.INFO,
        request=None,
        actor_username: str = '',
        endpoint: str = '',
        method: str = 'GET',
        status_code: int = None,
        details: dict = None
    ) -> SecurityAuditEvent:
        ip_addr = None
        user_agent = ''

        if request:
            endpoint = endpoint or request.path
            method = method or request.method
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]

            # Resolve real client IP behind reverse proxy / load balancer
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded:
                ip_addr = x_forwarded.split(',')[0].strip()
            else:
                ip_addr = request.META.get('REMOTE_ADDR')

            if not actor_username and hasattr(request, 'user') and request.user and request.user.is_authenticated:
                actor_username = request.user.username

        payload_details = details or {}

        # 1. Dual logging: Stream to system logger for SIEM ingest
        log_msg = (
            f"[SEC-AUDIT] type={event_type} severity={severity} user={actor_username or 'ANONYMOUS'} "
            f"ip={ip_addr or 'UNKNOWN'} path={endpoint} method={method} status={status_code} "
            f"details={payload_details}"
        )
        if severity == SecurityAuditEvent.Severity.CRITICAL:
            logger.error(log_msg)
        elif severity == SecurityAuditEvent.Severity.WARNING:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        # 2. Immutable persistence in compliance database
        return SecurityAuditEvent.objects.create(
            event_type=event_type,
            severity=severity,
            actor_username=actor_username or '',
            ip_address=ip_addr,
            user_agent=user_agent,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            details=payload_details
        )
