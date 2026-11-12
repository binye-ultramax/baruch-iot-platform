import base64
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from shared.audit import transact_put_item
from shared.device_ids import hash_activation_key, new_activation_key, new_device_id, new_instant_reading_key
from shared.env import required_env
from shared.errors import HttpError

_dynamodb: Any = None
_kms: Any = None

ORIGIN_FACTORY = "FACTORY"
ORIGIN_EXTERNAL = "EXTERNAL"
ACTIVATION_PENDING = "PENDING"
ACTIVATION_ACTIVATED = "ACTIVATED"

# Fields never returned by a read. The instant reading key is shown once, at registration.
SECRET_FIELDS = ("instantReadingKey", "activationKeyHash")


def register_device(
    body: dict[str, Any],
    registered_by: str,
    audit_entry_for: Any,
) -> dict[str, Any]:
    """Create the device, reserve its MAC (and serial), and log it, all in one transaction.

    audit_entry_for(device_id) -> dict builds the log row once the id is known.
    Returns the stored row plus the plaintext keys, which are never stored or returned again.
    """
    product = None
    serial = body.get("serialNumber")
    if serial:
        product = _products_table().get_item(Key={"serialNumber": serial}).get("Item")
        if product is None:
            raise HttpError(404, f"No product with serial number {serial}.")
        if product.get("status") == "RETIRED":
            raise HttpError(409, f"Product {serial} is retired and cannot be registered.")

    device_id = new_device_id()
    instant_reading_key = new_instant_reading_key()
    activation_key = new_activation_key()
    now = _now()

    item: dict[str, Any] = {
        "deviceId": device_id,
        "macAddress": body["macAddress"],
        "origin": ORIGIN_FACTORY if product else ORIGIN_EXTERNAL,
        "instantReadingKey": _encrypt(instant_reading_key, device_id),
        "activationKeyHash": hash_activation_key(activation_key),
        "activationStatus": ACTIVATION_PENDING,
        "registeredBy": registered_by,
        "registeredAt": now,
        "updatedAt": now,
    }
    if product:
        # Factory units are described by their product record; only the firmware may be newer.
        item["serialNumber"] = serial
        item["manufacturer"] = "Baruch"
        if product.get("model"):
            item["model"] = product["model"]
        firmware = body.get("firmwareVersion") or product.get("firmwareVersion")
        if firmware:
            item["firmwareVersion"] = firmware
    else:
        for field in ("manufacturer", "model", "firmwareVersion"):
            if body.get(field):
                item[field] = body[field]

    devices_table = required_env("DEVICES_TABLE")
    macs_table = required_env("DEVICE_MACS_TABLE")

    writes: list[dict[str, Any]] = [
        {
            "Put": {
                "TableName": devices_table,
                "Item": _to_dynamo(item),
                "ConditionExpression": "attribute_not_exists(deviceId)",
            }
        },
        {
            # Reserving the MAC in its own keyed table is what makes uniqueness a hard rule.
            "Put": {
                "TableName": macs_table,
                "Item": {"macAddress": item["macAddress"], "deviceId": device_id, "registeredAt": now},
                "ConditionExpression": "attribute_not_exists(macAddress)",
            }
        },
        transact_put_item(audit_entry_for(device_id)),
    ]
    if product:
        writes.append(
            {
                # A product can be registered once. Registering also marks it shipped.
                "Update": {
                    "TableName": required_env("PRODUCTS_TABLE"),
                    "Key": {"serialNumber": serial},
                    "UpdateExpression": "SET deviceId = :device, #s = :shipped, updatedAt = :now",
                    "ConditionExpression": "attribute_exists(serialNumber) AND attribute_not_exists(deviceId)",
                    "ExpressionAttributeNames": {"#s": "status"},
                    "ExpressionAttributeValues": {":device": device_id, ":shipped": "SHIPPED", ":now": now},
                }
            }
        )

    try:
        _resource().meta.client.transact_write_items(TransactItems=writes)
    except Exception as error:  # noqa: BLE001 - mapped below
        raise _map_transaction_error(error, item["macAddress"], serial) from None

    return {
        **public_view(item),
        "instantReadingKey": instant_reading_key,
        "activationKey": activation_key,
    }


def get_device(device_id: str) -> dict[str, Any] | None:
    item = _devices_table().get_item(Key={"deviceId": device_id}).get("Item")
    return public_view(_from_dynamo(item)) if item else None


def find_by_mac(mac: str) -> dict[str, Any] | None:
    pointer = _resource().Table(required_env("DEVICE_MACS_TABLE")).get_item(Key={"macAddress": mac}).get("Item")
    if not pointer:
        return None
    return get_device(pointer["deviceId"])


def find_by_serial(serial: str) -> dict[str, Any] | None:
    from boto3.dynamodb.conditions import Key

    result = _devices_table().query(IndexName="bySerial", KeyConditionExpression=Key("serialNumber").eq(serial), Limit=1)
    items = result.get("Items", [])
    return public_view(_from_dynamo(items[0])) if items else None


def rotate_activation_key(device_id: str, audit_entry: dict[str, Any]) -> dict[str, Any]:
    """Issue a new activation key. The previous key stops working immediately."""
    activation_key = new_activation_key()
    now = _now()
    try:
        _resource().meta.client.transact_write_items(
            TransactItems=[
                {
                    "Update": {
                        "TableName": required_env("DEVICES_TABLE"),
                        "Key": {"deviceId": device_id},
                        "UpdateExpression": "SET activationKeyHash = :hash, activationStatus = :pending, updatedAt = :now REMOVE activatedAt",
                        "ConditionExpression": "attribute_exists(deviceId)",
                        "ExpressionAttributeValues": {
                            ":hash": hash_activation_key(activation_key),
                            ":pending": ACTIVATION_PENDING,
                            ":now": now,
                        },
                    }
                },
                transact_put_item(audit_entry),
            ]
        )
    except Exception as error:  # noqa: BLE001
        if "ConditionalCheckFailed" in str(error):
            raise HttpError(404, "No device with that id.") from None
        raise
    return {"deviceId": device_id, "activationKey": activation_key, "activationStatus": ACTIVATION_PENDING}


def public_view(item: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in item.items() if key not in SECRET_FIELDS}


def _map_transaction_error(error: Exception, mac: str, serial: str | None) -> Exception:
    """TransactWriteItems reports which item failed via CancellationReasons, in order."""
    reasons = getattr(error, "response", {}).get("CancellationReasons") or []
    codes = [reason.get("Code") for reason in reasons]
    # Order matches the writes list: device, mac, audit, product.
    if len(codes) > 1 and codes[1] == "ConditionalCheckFailed":
        return HttpError(409, f"A device with MAC address {mac} is already registered.")
    if len(codes) > 3 and codes[3] == "ConditionalCheckFailed":
        return HttpError(409, f"Product {serial} has already been registered as a device.")
    if "ConditionalCheckFailed" in codes:
        return HttpError(409, "The device could not be registered because a record already exists.")
    return error


def _encrypt(plaintext: str, device_id: str) -> str:
    result = _kms_client().encrypt(
        KeyId=required_env("DEVICE_KEY_KMS_ARN"),
        Plaintext=plaintext.encode(),
        EncryptionContext={"deviceId": device_id, "field": "instantReadingKey"},
    )
    return base64.b64encode(result["CiphertextBlob"]).decode()


def decrypt_instant_reading_key(ciphertext_b64: str, device_id: str) -> str:
    """For a future telemetry verifier. Not exposed by any route today."""
    result = _kms_client().decrypt(
        CiphertextBlob=base64.b64decode(ciphertext_b64),
        EncryptionContext={"deviceId": device_id, "field": "instantReadingKey"},
    )
    return result["Plaintext"].decode()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _to_dynamo(value: Any) -> Any:
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {key: _to_dynamo(item) for key, item in value.items()}
    return value


def _from_dynamo(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {key: _from_dynamo(item) for key, item in value.items()}
    return value


def _resource() -> Any:
    global _dynamodb
    if _dynamodb is None:
        import boto3

        _dynamodb = boto3.resource("dynamodb")
    return _dynamodb


def _devices_table() -> Any:
    return _resource().Table(required_env("DEVICES_TABLE"))


def _products_table() -> Any:
    return _resource().Table(required_env("PRODUCTS_TABLE"))


def _kms_client() -> Any:
    global _kms
    if _kms is None:
        import boto3

        _kms = boto3.client("kms")
    return _kms
