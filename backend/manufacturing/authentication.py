from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class JWTCookieOrHeaderAuthentication(JWTAuthentication):
    """
    Zero-Trust Dual-Channel Authentication (OWASP A03:2021 & A07:2021):
    Authenticates operator sessions from either:
    1. HTTP Header: Authorization: Bearer <token> (API integrations, CLI tools, automated tests)
    2. HttpOnly Cookie: access_token (Next.js web browser sessions)
    
    Security Benefit:
    By supporting HttpOnly, SameSite=Lax/Strict cookies, browser sessions are completely
    immune to XSS (Cross-Site Scripting) token exfiltration, because client-side JavaScript
    (document.cookie) cannot read HttpOnly cookies.
    """

    def authenticate(self, request):
        # 1. Primary Channel: Check Authorization header
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token

        # 2. Secondary Channel: Check HttpOnly cookie
        cookie_token = request.COOKIES.get('access_token')
        if cookie_token:
            try:
                validated_token = self.get_validated_token(cookie_token)
                return self.get_user(validated_token), validated_token
            except (InvalidToken, AuthenticationFailed):
                return None

        return None
