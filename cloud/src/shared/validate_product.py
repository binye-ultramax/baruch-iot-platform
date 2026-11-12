import re
from typing import Any

from shared.errors import HttpError

_TEXT = re.compile(r"^[^\x00-\x1F]{1,64}$")
_VERSION = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.\-+]{0,31}$")
_TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$")

CHEMISTRIES = ("LiFePO4", "NMC", "LTO", "LeadAcid")


def parse_product_body(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise HttpError(400, "Request body must be a JSON object.")

    body: dict[str, Any] = {
        "model": _text(value.get("model"), "model"),
        "batchNumber": _text(value.get("batchNumber"), "batchNumber"),
        "cellCount": _integer(value.get("cellCount"), "cellCount", 1, 512),
        "chemistry": _chemistry(value.get("chemistry")),
    }

    optional_text = ("hardwareRevision", "notes")
    for field in optional_text:
        if value.get(field) is not None:
            body[field] = _text(value.get(field), field, max_length=256 if field == "notes" else 64)

    if value.get("firmwareVersion") is not None:
        body["firmwareVersion"] = _version(value.get("firmwareVersion"))

    if value.get("capacityAh") is not None:
        body["capacityAh"] = _number(value.get("capacityAh"), "capacityAh", 0.1, 100_000)

    if value.get("manufacturedAt") is not None:
        body["manufacturedAt"] = _timestamp(value.get("manufacturedAt"))

    return body


def parse_limit(value: object, default: int = 50, maximum: int = 200) -> int:
    if value is None or value == "":
        return default
    try:
        limit = int(str(value))
    except ValueError:
        raise HttpError(400, "limit must be a whole number.") from None
    if limit < 1 or limit > maximum:
        raise HttpError(400, f"limit must be between 1 and {maximum}.")
    return limit


def _text(value: object, field: str, max_length: int = 64) -> str:
    if not isinstance(value, str) or not value.strip():
        raise HttpError(400, f"{field} is required.")
    text = value.strip()
    if len(text) > max_length or not _TEXT.fullmatch(text[:64]):
        raise HttpError(400, f"{field} must be 1 to {max_length} characters.")
    return text


def _version(value: object) -> str:
    if not isinstance(value, str) or not _VERSION.fullmatch(value.strip()):
        raise HttpError(400, "firmwareVersion must look like 1.4.2.")
    return value.strip()


def _integer(value: object, field: str, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise HttpError(400, f"{field} must be a whole number.")
    if value < minimum or value > maximum:
        raise HttpError(400, f"{field} must be between {minimum} and {maximum}.")
    return value


def _number(value: object, field: str, minimum: float, maximum: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise HttpError(400, f"{field} must be a number.")
    if value < minimum or value > maximum:
        raise HttpError(400, f"{field} must be between {minimum} and {maximum}.")
    return float(value)


def _chemistry(value: object) -> str:
    if value not in CHEMISTRIES:
        raise HttpError(400, f"chemistry must be one of: {', '.join(CHEMISTRIES)}.")
    return str(value)


def _timestamp(value: object) -> str:
    if not isinstance(value, str) or not _TIMESTAMP.fullmatch(value.strip()):
        raise HttpError(400, "manufacturedAt must be an ISO 8601 date or timestamp.")
    return value.strip()
