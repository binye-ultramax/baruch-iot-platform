from typing import Any

from shared.errors import HttpError
from shared.roles import ADMINISTRATOR_GROUP, role_from_groups


def caller_from_event(event: dict[str, Any]) -> dict[str, Any]:
    """Read the signed-in user from the JWT claims API Gateway attached to the request."""
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )
    email = claims.get("email")
    if not isinstance(email, str) or not email:
        raise HttpError(401, "Sign in to continue.")

    groups = _groups_from_claim(claims.get("cognito:groups"))
    return {
        "email": email,
        "name": claims.get("name") if isinstance(claims.get("name"), str) else email,
        "role": role_from_groups(groups),
    }


def require_administrator(caller: dict[str, Any]) -> None:
    if caller.get("role") != ADMINISTRATOR_GROUP:
        raise HttpError(403, "Only administrators can do this.")


def _groups_from_claim(value: object) -> list[str]:
    # API Gateway passes a list as "[Operator Administrator]"; a bare string or list can also appear.
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        return value.strip("[]").replace(",", " ").split()
    return []
