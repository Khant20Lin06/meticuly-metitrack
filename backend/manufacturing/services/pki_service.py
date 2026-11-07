import base64
import hashlib
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature


class PKIService:
    """
    Class III Medical Device Asymmetric Public Key Infrastructure (PKI) Digital Signature Engine.
    Implements NIST FIPS 186-5 ECDSA with SECP256R1 (P-256 curve) and SHA-256.
    Enforces US FDA 21 CFR § 11.50, § 11.70, § 11.100 and ISO 13485:2016 Clause 7.5.8 non-repudiation.
    
    Guarantees that an eDHR release certification can only be executed by the certified operator
    holding their personal private key, providing non-repudiation beyond symmetric shared secrets.
    """
    ALGORITHM = "ECDSA-SHA256-P256"

    @classmethod
    def generate_operator_keypair(cls) -> tuple[str, str, str]:
        """
        Generates an individual ECDSA NIST P-256 keypair for an operator.
        Returns:
            (private_key_pem, public_key_pem, fingerprint)
        """
        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()

        priv_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        pub_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        # Compute SHA-256 fingerprint from the DER SubjectPublicKeyInfo bytes
        der_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        digest = hashlib.sha256(der_bytes).hexdigest()
        fingerprint = f"SHA256:{digest[:16].upper()}"

        return priv_bytes.decode('utf-8'), pub_bytes.decode('utf-8'), fingerprint

    @classmethod
    def sign_digest(cls, private_key_pem: str, data_to_sign: bytes) -> str:
        """
        Signs canonical data bytes using the operator's ECDSA NIST P-256 private key with SHA-256.
        Returns a base64-encoded ASN.1 DER signature string.
        """
        if isinstance(private_key_pem, str):
            private_key_pem = private_key_pem.encode('utf-8')

        private_key = serialization.load_pem_private_key(
            private_key_pem,
            password=None
        )
        der_signature = private_key.sign(
            data_to_sign,
            ec.ECDSA(hashes.SHA256())
        )
        return base64.b64encode(der_signature).decode('utf-8')

    @classmethod
    def verify_signature(cls, public_key_pem: str, signature_b64: str, data_to_verify: bytes) -> bool:
        """
        Verifies an ECDSA NIST P-256 signature against data bytes using the certified public key.
        Returns True if signature is authentic and untampered; False otherwise.
        """
        if not public_key_pem or not signature_b64:
            return False

        try:
            if isinstance(public_key_pem, str):
                public_key_pem = public_key_pem.encode('utf-8')

            public_key = serialization.load_pem_public_key(public_key_pem)
            raw_signature = base64.b64decode(signature_b64.encode('utf-8'))
            public_key.verify(
                raw_signature,
                data_to_verify,
                ec.ECDSA(hashes.SHA256())
            )
            return True
        except (InvalidSignature, Exception):
            return False
