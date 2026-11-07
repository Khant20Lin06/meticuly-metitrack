from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """
    Limits authentication attempts on /api/auth/token/ to prevent credential brute-forcing,
    password spraying, and dictionary attacks (OWASP A07:2021 & OWASP A04:2021).
    Default rate: 10 requests per minute per IP.
    """
    scope = 'login'


class AdvanceRateThrottle(UserRateThrottle):
    """
    Limits high-frequency station advancement requests to prevent automated spamming,
    DDoS on manufacturing state transitions, and race condition exploitation.
    Default rate: 120 requests per minute per authenticated user/IP.
    """
    scope = 'advance'
