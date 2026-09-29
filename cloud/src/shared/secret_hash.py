import base64
import hashlib
import hmac

from shared.env import required_env


def secret_hash(username: str) -> str:
    """Cognito SECRET_HASH: Base64(HMAC_SHA256(client_secret, username + client_id))."""
    client_id = required_env("USER_POOL_CLIENT_ID")
    client_secret = required_env("USER_POOL_CLIENT_SECRET")
    digest = hmac.new(
        client_secret.encode(),
        f"{username}{client_id}".encode(),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode()
