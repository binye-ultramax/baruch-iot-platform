import re
from typing import Any

from shared.errors import HttpError
from shared.serial import is_serial

_MAC_CHARS = re.compile(r"^[0-9A-F]{12}$")
_TEXT = re.compile(r"^[^\x00-\x1F]{1,64}$")
_VERSION = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.\-+]{0,31}$")


def normalize_mac(value: object) -> str:
    """Accept AA:BB:CC:DD:EE:FF, AA-BB-..., aabb.ccdd.eeff, or bare hex. Return AA:BB:CC:DD:EE:FF."""
    if not isinstance(value, str):
        raise HttpError(400, "macAddress is required.")
    hex_only = re.sub(r"[^0-9A-Fa-f]", "", value).upper()
    if not _MAC_CHARS.fullmatch(hex_only):
        raise HttpError(400, "macAddress must be 12 hex digits, for example AA:BB:CC:DD:EE:FF.")
    if hex_only in ("000000000000", "FFFFFFFFFFFF"):
        raise HttpError(400, "macAddress must not be all zeros or all ones.")
    return ":".join(hex_only[i : i + 2] for i in range(0, 12, 2))


def parse_register_device_body(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise HttpError(400, "Request body must be a JSON object.")

    body: dict[str, Any] = {"macAddress": normalize_mac(value.get("macAddress"))}

    serial = value.get("serialNumber")
    if serial is not None and serial != "":
        if not isinstance(serial, str):
            raise HttpError(400, "serialNumber must be text.")
        serial = serial.strip().upper()
        if not is_serial(serial):
            raise HttpError(400, "serialNumber must look like BMS-2026-000001.")
        body["serialNumber"] = serial

    for field in ("manufacturer", "model"):
        if value.get(field) is not None and value.get(field) != "":
            body[field] = _text(value.get(field), field)

    if value.get("firmwareVersion") is not None and value.get("firmwareVersion") != "":
        body["firmwareVersion"] = _version(value.get("firmwareVersion"))

    if "serialNumber" not in body and "manufacturer" not in body:
        raise HttpError(400, "Give a serialNumber for a factory unit, or a manufacturer for an external one.")

    return body


def _text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise HttpError(400, f"{field} is required.")
    text = value.strip()
    if not _TEXT.fullmatch(text):
        raise HttpError(400, f"{field} must be 1 to 64 characters.")
    return text


def _version(value: object) -> str:
    if not isinstance(value, str) or not _VERSION.fullmatch(value.strip()):
        raise HttpError(400, "firmwareVersion must look like 1.4.2.")
    return value.strip()
