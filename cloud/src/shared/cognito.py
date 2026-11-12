import base64
import json
from typing import Any

from shared.env import required_env
from shared.errors import HttpError
from shared.roles import ADMINISTRATOR_GROUP, OPERATOR_GROUP, role_from_groups
from shared.secret_hash import secret_hash

_client: Any = None


def sign_up(email: str, password: str, name: str) -> None:
    _cognito().sign_up(
        ClientId=required_env("USER_POOL_CLIENT_ID"),
        SecretHash=secret_hash(email),
        Username=email,
        Password=password,
        UserAttributes=[
            {"Name": "email", "Value": email},
            {"Name": "name", "Value": name},
        ],
    )


def confirm_sign_up(email: str, code: str) -> None:
    _cognito().confirm_sign_up(
        ClientId=required_env("USER_POOL_CLIENT_ID"),
        SecretHash=secret_hash(email),
        Username=email,
        ConfirmationCode=code,
    )


def login(email: str, password: str) -> dict[str, Any]:
    response = _cognito().admin_initiate_auth(
        UserPoolId=required_env("USER_POOL_ID"),
        ClientId=required_env("USER_POOL_CLIENT_ID"),
        AuthFlow="ADMIN_USER_PASSWORD_AUTH",
        AuthParameters={
            "USERNAME": email,
            "PASSWORD": password,
            "SECRET_HASH": secret_hash(email),
        },
    )

    if response.get("ChallengeName"):
        raise HttpError(403, "Additional sign-in steps are required.")

    result = response.get("AuthenticationResult") or {}
    id_token = result.get("IdToken")
    access_token = result.get("AccessToken")
    if not id_token or not access_token:
        raise RuntimeError("Authentication result missing tokens")

    profile = _profile_from_id_token(id_token)
    groups = _list_group_names(required_env("USER_POOL_ID"), email)
    return _session(profile, groups, result, fallback_email=email)


def refresh(user_id: str, refresh_token: str) -> dict[str, Any]:
    """Exchange a refresh token for new id and access tokens.

    Cognito requires the SECRET_HASH for this flow to be built from the user's sub, which is
    why the client sends back the `user.id` it received at login.
    """
    response = _cognito().admin_initiate_auth(
        UserPoolId=required_env("USER_POOL_ID"),
        ClientId=required_env("USER_POOL_CLIENT_ID"),
        AuthFlow="REFRESH_TOKEN_AUTH",
        AuthParameters={
            "REFRESH_TOKEN": refresh_token,
            "SECRET_HASH": secret_hash(user_id),
        },
    )

    result = response.get("AuthenticationResult") or {}
    id_token = result.get("IdToken")
    if not id_token or not result.get("AccessToken"):
        raise RuntimeError("Authentication result missing tokens")

    profile = _profile_from_id_token(id_token)
    # The id token carries group membership, so no admin lookup is needed here.
    return _session(profile, profile.get("groups", []), result, fallback_email="")


def _session(profile: dict[str, Any], groups: list[str], result: dict[str, Any], fallback_email: str) -> dict[str, Any]:
    tokens: dict[str, Any] = {
        "idToken": result["IdToken"],
        "accessToken": result["AccessToken"],
        "expiresIn": result.get("ExpiresIn") or 3600,
    }
    refresh_token = result.get("RefreshToken")
    if refresh_token:
        tokens["refreshToken"] = refresh_token

    user: dict[str, Any] = {
        "email": profile.get("email") or fallback_email,
        "name": profile.get("name") or profile.get("email") or fallback_email,
        "role": role_from_groups(groups),
    }
    if profile.get("sub"):
        user["id"] = profile["sub"]

    return {"user": user, "tokens": tokens}


def ensure_operator_group(user_pool_id: str, username: str) -> None:
    groups = _list_group_names(user_pool_id, username)
    if OPERATOR_GROUP in groups or ADMINISTRATOR_GROUP in groups:
        return

    _cognito().admin_add_user_to_group(
        UserPoolId=user_pool_id,
        Username=username,
        GroupName=OPERATOR_GROUP,
    )


def _list_group_names(user_pool_id: str, username: str) -> list[str]:
    names: list[str] = []
    next_token: str | None = None

    while True:
        request: dict[str, Any] = {
            "UserPoolId": user_pool_id,
            "Username": username,
            "Limit": 60,
        }
        if next_token:
            request["NextToken"] = next_token
        page = _cognito().admin_list_groups_for_user(**request)
        for group in page.get("Groups") or []:
            group_name = group.get("GroupName")
            if group_name:
                names.append(group_name)
        next_token = page.get("NextToken")
        if not next_token:
            return names


def _profile_from_id_token(id_token: str) -> dict[str, Any]:
    """Read claims from a token Cognito just issued to this Lambda. This is not a general JWT verifier."""
    try:
        segment = id_token.split(".")[1]
    except IndexError:
        return {}

    try:
        padding = "=" * (-len(segment) % 4)
        payload = json.loads(base64.urlsafe_b64decode(segment + padding))
    except (json.JSONDecodeError, ValueError):
        return {}

    profile: dict[str, Any] = {}
    for claim in ("sub", "email", "name"):
        value = payload.get(claim)
        if isinstance(value, str):
            profile[claim] = value
    groups = payload.get("cognito:groups")
    if isinstance(groups, list):
        profile["groups"] = [group for group in groups if isinstance(group, str)]
    return profile


def _cognito() -> Any:
    global _client
    if _client is None:
        import boto3

        _client = boto3.client("cognito-idp")
    return _client
