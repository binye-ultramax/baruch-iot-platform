import base64
import json
import logging
from typing import Any

from shared.errors import AuthAction, HttpError, error_name, map_cognito_error

logger = logging.getLogger(__name__)


def json_response(status_code: int, body: object) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(body),
    }


def read_json_body(event: dict[str, Any]) -> object:
    encoded = event.get("body")
    if not encoded:
        raise HttpError(400, "Request body is required.")

    if event.get("isBase64Encoded"):
        raw = base64.b64decode(encoded).decode("utf-8")
    else:
        raw = encoded

    if len(raw) > 8_192:
        raise HttpError(400, "Request body is too large.")

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HttpError(400, "Request body must be JSON.") from None


def respond_to_error(error: object, action: AuthAction) -> dict[str, Any]:
    if isinstance(error, HttpError):
        return json_response(error.status_code, {"message": str(error)})

    mapped = map_cognito_error(error, action)
    if mapped is not None:
        return json_response(mapped.status_code, {"message": str(mapped)})

    name = error_name(error)
    if name == "MissingConfigError" and isinstance(error, Exception):
        logger.error(json.dumps({"action": action, "error": name, "message": str(error)}))
    else:
        logger.error(json.dumps({"action": action, "error": name}))

    return json_response(500, {"message": "Something went wrong."})
