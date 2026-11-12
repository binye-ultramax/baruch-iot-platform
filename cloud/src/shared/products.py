from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from shared.env import required_env
from shared.errors import HttpError
from shared.serial import MAX_SEQUENCE, current_year, format_serial

_dynamodb: Any = None

PRODUCT_STATUSES = ("MANUFACTURED", "SHIPPED", "CLAIMED", "RETIRED")


def next_serial_number() -> str:
    """Atomically take the next sequence number for the current year."""
    year = current_year()
    counters = _table(required_env("SERIAL_COUNTER_TABLE"))

    result = counters.update_item(
        Key={"counterId": f"{year}"},
        UpdateExpression="ADD lastSequence :one",
        ExpressionAttributeValues={":one": 1},
        ReturnValues="UPDATED_NEW",
    )
    sequence = int(result["Attributes"]["lastSequence"])
    if sequence > MAX_SEQUENCE:
        raise HttpError(507, f"Serial numbers for {year} are exhausted.")
    return format_serial(year, sequence)


def create_product(serial_number: str, metadata: dict[str, Any], created_by: str) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    item: dict[str, Any] = {
        "serialNumber": serial_number,
        "status": "MANUFACTURED",
        "createdBy": created_by,
        "createdAt": now,
        "updatedAt": now,
        **metadata,
    }

    _table(required_env("PRODUCTS_TABLE")).put_item(
        Item=_to_dynamo(item),
        ConditionExpression="attribute_not_exists(serialNumber)",
    )
    return item


def get_product(serial_number: str) -> dict[str, Any] | None:
    result = _table(required_env("PRODUCTS_TABLE")).get_item(Key={"serialNumber": serial_number})
    item = result.get("Item")
    return _from_dynamo(item) if item else None


def list_products_by_batch(batch_number: str, limit: int) -> list[dict[str, Any]]:
    from boto3.dynamodb.conditions import Key

    result = _table(required_env("PRODUCTS_TABLE")).query(
        IndexName="byBatch",
        KeyConditionExpression=Key("batchNumber").eq(batch_number),
        Limit=limit,
    )
    return [_from_dynamo(item) for item in result.get("Items", [])]


def list_products_by_status(status: str, limit: int) -> list[dict[str, Any]]:
    from boto3.dynamodb.conditions import Key

    result = _table(required_env("PRODUCTS_TABLE")).query(
        IndexName="byStatus",
        KeyConditionExpression=Key("status").eq(status),
        Limit=limit,
        ScanIndexForward=False,
    )
    return [_from_dynamo(item) for item in result.get("Items", [])]


def _to_dynamo(item: dict[str, Any]) -> dict[str, Any]:
    return {key: Decimal(str(value)) if isinstance(value, float) else value for key, value in item.items()}


def _from_dynamo(item: dict[str, Any]) -> dict[str, Any]:
    converted: dict[str, Any] = {}
    for key, value in item.items():
        if isinstance(value, Decimal):
            converted[key] = int(value) if value == value.to_integral_value() else float(value)
        else:
            converted[key] = value
    return converted


def _table(name: str) -> Any:
    global _dynamodb
    if _dynamodb is None:
        import boto3

        _dynamodb = boto3.resource("dynamodb")
    return _dynamodb.Table(name)
