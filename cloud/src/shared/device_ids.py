import hashlib
import os
import re
import secrets
import time

DEVICE_ID_PREFIX = "dev_"
DEVICE_ID_PATTERN = re.compile(r"^dev_[0-9A-HJKMNP-TV-Z]{26}$")

# Crockford base32: no I, L, O, U.
_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

# Activation keys avoid 0/O/1/I so they can be read aloud and typed without confusion.
_ACTIVATION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ACTIVATION_KEY_PATTERN = re.compile(r"^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$")


def new_device_id(now_ms: int | None = None) -> str:
    """dev_ + a ULID: 48 bits of millisecond time, then 80 random bits, Crockford base32."""
    ms = int(time.time() * 1000) if now_ms is None else now_ms
    value = (ms << 80) | int.from_bytes(os.urandom(10), "big")
    chars = []
    for _ in range(26):
        chars.append(_CROCKFORD[value & 31])
        value >>= 5
    return DEVICE_ID_PREFIX + "".join(reversed(chars))


def is_device_id(value: object) -> bool:
    return isinstance(value, str) and DEVICE_ID_PATTERN.fullmatch(value) is not None


def new_instant_reading_key() -> str:
    """32 random bytes as base64url, no padding. About 43 characters."""
    return secrets.token_urlsafe(32)


def new_activation_key() -> str:
    """Four groups of four, e.g. K7PM-3XQD-R9HT-WB2N."""
    groups = ["".join(secrets.choice(_ACTIVATION_ALPHABET) for _ in range(4)) for _ in range(4)]
    return "-".join(groups)


def normalize_activation_key(value: str) -> str:
    """Accept lowercase or missing dashes when a user types the key."""
    raw = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    return "-".join(raw[i : i + 4] for i in range(0, len(raw), 4))


def hash_activation_key(key: str) -> str:
    return hashlib.sha256(normalize_activation_key(key).encode()).hexdigest()
