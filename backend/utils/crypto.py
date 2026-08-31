import json
from typing import Any, Optional
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.types import String, TypeDecorator


class EncryptedText(TypeDecorator):
    """SQLAlchemy TypeDecorator that transparently encrypts strings on write and decrypts on read using Fernet (AES-128 + HMAC)."""

    impl = String
    cache_ok = True

    def _get_fernet(self) -> Fernet:
        from config import FACE_ENCRYPTION_KEY
        if not FACE_ENCRYPTION_KEY:
            raise RuntimeError(
                "FACE_ENCRYPTION_KEY is not configured! Set FACE_ENCRYPTION_KEY in .env before performing biometric operations."
            )
        return Fernet(FACE_ENCRYPTION_KEY.encode("utf-8"))

    def process_bind_param(self, value: Optional[Any], dialect) -> Optional[str]:
        if value is None:
            return None
        if not isinstance(value, str):
            value = json.dumps(value)
        return self._get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")

    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None
        try:
            return self._get_fernet().decrypt(value.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            # Fallback in case raw plaintext existed prior to encryption migration
            return value
