import re
from typing import Any, TypedDict

from shared.errors import HttpError

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
SYMBOL = re.compile(r"[\^$*.\[\]{}()?\-\"!@#%&/\\,><':;|_~`+=]")
CONTROL_CHARS = re.compile(r"[\u0000-\u001F]")


class RegisterInput(TypedDict):
    email: str
    password: str
    name: str


class ConfirmInput(TypedDict):
    email: str
    code: str


class LoginInput(TypedDict):
    email: str
    password: str


def parse_register_body(value: object) -> RegisterInput:
    body = _as_record(value)
    email = _parse_email(body.get("email"))
    return {
        "email": email,
        "password": _parse_password(body.get("password"), email),
        "name": _parse_name(body.get("name")),
    }


def parse_confirm_body(value: object) -> ConfirmInput:
    body = _as_record(value)
    return {
        "email": _parse_email(body.get("email")),
        "code": _parse_code(body.get("code")),
    }


def parse_login_body(value: object) -> LoginInput:
    body = _as_record(value)
    return {
        "email": _parse_email(body.get("email")),
        "password": _parse_login_password(body.get("password")),
    }


def _as_record(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise HttpError(400, "Request body must be a JSON object.")
    return value


def _parse_email(value: object) -> str:
    if not isinstance(value, str):
        raise HttpError(400, "Email is required.")
    email = value.strip().lower()
    if not EMAIL.fullmatch(email) or len(email) > 254:
        raise HttpError(400, "Enter a valid email address.")
    return email


def _parse_name(value: object) -> str:
    if not isinstance(value, str):
        raise HttpError(400, "Name is required.")
    name = value.strip()
    if len(name) < 1 or len(name) > 128 or CONTROL_CHARS.search(name):
        raise HttpError(400, "Name must be 1 to 128 characters.")
    return name


def _parse_password(value: object, email: str) -> str:
    password = _parse_login_password(value)
    has_required_characters = (
        len(password) >= 8
        and re.search(r"[a-z]", password)
        and re.search(r"[A-Z]", password)
        and re.search(r"[0-9]", password)
        and SYMBOL.search(password)
    )
    if not has_required_characters:
        raise HttpError(400, _password_rule_message())
    if password.lower() == email:
        raise HttpError(400, "Password must not match the email address.")
    return password


def _parse_login_password(value: object) -> str:
    if not isinstance(value, str) or len(value) == 0:
        raise HttpError(400, "Password is required.")
    if len(value) > 256:
        raise HttpError(400, "Password is too long.")
    return value


def _parse_code(value: object) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"\d{6}", value.strip()):
        raise HttpError(400, "Enter the 6-digit confirmation code.")
    return value.strip()


def _password_rule_message() -> str:
    return (
        "Password must be at least 8 characters and include an uppercase letter, "
        "a lowercase letter, a number, and a symbol."
    )
