import re
from datetime import datetime, timezone

SERIAL_PREFIX = "BMS"
SEQUENCE_DIGITS = 6
MAX_SEQUENCE = 10**SEQUENCE_DIGITS - 1

SERIAL_PATTERN = re.compile(rf"^{SERIAL_PREFIX}-\d{{4}}-\d{{{SEQUENCE_DIGITS}}}$")


def format_serial(year: int, sequence: int) -> str:
    """Build a serial such as BMS-2026-000001."""
    if sequence < 1 or sequence > MAX_SEQUENCE:
        raise ValueError(f"Sequence {sequence} is outside 1..{MAX_SEQUENCE}")
    return f"{SERIAL_PREFIX}-{year:04d}-{sequence:0{SEQUENCE_DIGITS}d}"


def is_serial(value: object) -> bool:
    return isinstance(value, str) and SERIAL_PATTERN.fullmatch(value) is not None


def current_year(now: datetime | None = None) -> int:
    return (now or datetime.now(timezone.utc)).year
