from shared.audit import history_for_subject
from shared.auth_context import caller_from_event
from shared.device_ids import is_device_id
from shared.errors import HttpError
from shared.http import json_response, respond_to_error
from shared.serial import is_serial
from shared.validate_product import parse_limit


def handler(event, context):
    """History for a product (by serial) or a device (by device id). Both share one audit table."""
    try:
        caller_from_event(event)

        params = event.get("pathParameters") or {}
        raw = (params.get("serialNumber") or params.get("deviceId") or "").strip()

        if is_device_id(raw):
            subject = raw
        elif is_serial(raw.upper()):
            subject = raw.upper()
        else:
            raise HttpError(400, "Expected a serial number like BMS-2026-000001 or a device id like dev_….")

        limit = parse_limit((event.get("queryStringParameters") or {}).get("limit"), default=100, maximum=500)
        items = history_for_subject(subject, limit)
        return json_response(200, {"subjectId": subject, "items": items, "count": len(items)})
    except Exception as error:
        return respond_to_error(error, "product_history")
