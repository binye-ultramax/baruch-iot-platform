import json
import secrets
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from shared.env import required_env

PRODUCT_CREATED = "PRODUCT_CREATED"
STATUS_CHANGED = "STATUS_CHANGED"
PRODUCT_UPDATED = "PRODUCT_UPDATED"

_dynamodb: Any = None


def build_entry(
    serial_number: str,
    action: str,
    caller: dict[str, Any],
    event: dict[str, Any],
    details: dict[str, Any] | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build one immutable log row. The sort key is millisecond time plus a random suffix."""
    moment = now or datetime.now(timezone.utc)
    stamp = moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    request = event.get("requestContext", {}) or {}
    http = request.get("http", {}) or {}

    entry: dict[str, Any] = {
        "serialNumber": serial_number,
        "occurredAt": f"{stamp}#{secrets.token_hex(3)}",
        "action": action,
        "actorEmail": caller["email"],
        "actorRole": caller.get("role", "Operator"),
    }
    if http.get("sourceIp"):
        entry["sourceIp"] = http["sourceIp"]
    if http.get("userAgent"):
        entry["userAgent"] = http["userAgent"][:256]
    if request.get("requestId"):
        entry["requestId"] = request["requestId"]
    if details:
        entry["details"] = details
    return entry


def transact_put_item(entry: dict[str, Any]) -> dict[str, Any]:
    """Shape a log entry for a DynamoDB TransactWriteItems call."""
    return {
        "Put": {
            "TableName": required_env("AUDIT_LOG_TABLE"),
            "Item": _to_dynamo(entry),
            "ConditionExpression": "attribute_not_exists(serialNumber) AND attribute_not_exists(occurredAt)",
        }
    }


def history_for_product(serial_number: str, limit: int) -> list[dict[str, Any]]:
    from boto3.dynamodb.conditions import Key

    result = _table().query(
        KeyConditionExpression=Key("serialNumber").eq(serial_number),
        Limit=limit,
        ScanIndexForward=True,
    )
    return [_from_dynamo(item) for item in result.get("Items", [])]


def actions_by_actor(actor_email: str, limit: int) -> list[dict[str, Any]]:
    from boto3.dynamodb.conditions import Key

    result = _table().query(
        IndexName="byActor",
        KeyConditionExpression=Key("actorEmail").eq(actor_email),
        Limit=limit,
        ScanIndexForward=False,
    )
    return [_from_dynamo(item) for item in result.get("Items", [])]


def _to_dynamo(value: Any) -> Any:
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: _to_dynamo(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_dynamo(item) for item in value]
    return value


def _from_dynamo(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {key: _from_dynamo(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_from_dynamo(item) for item in value]
    return value


def _table() -> Any:
    global _dynamodb
    if _dynamodb is None:
        import boto3

        _dynamodb = boto3.resource("dynamodb")
    return _dynamodb.Table(required_env("AUDIT_LOG_TABLE"))


def summarize(metadata: dict[str, Any]) -> dict[str, Any]:
    """Keep the log row small: only the fields that identify what was made."""
    keep = ("model", "batchNumber", "cellCount", "chemistry", "capacityAh", "firmwareVersion", "hardwareRevision")
    return {key: metadata[key] for key in keep if key in metadata}


def dumps(entry: dict[str, Any]) -> str:
    return json.dumps(entry, default=str)
