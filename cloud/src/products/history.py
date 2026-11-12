from shared.audit import history_for_product
from shared.auth_context import caller_from_event
from shared.errors import HttpError
from shared.http import json_response, respond_to_error
from shared.serial import is_serial
from shared.validate_product import parse_limit


def handler(event, context):
    try:
        caller_from_event(event)

        serial_number = (event.get("pathParameters") or {}).get("serialNumber", "").strip().upper()
        if not is_serial(serial_number):
            raise HttpError(400, "serialNumber must look like BMS-2026-000001.")

        limit = parse_limit((event.get("queryStringParameters") or {}).get("limit"), default=100, maximum=500)
        items = history_for_product(serial_number, limit)
        return json_response(200, {"serialNumber": serial_number, "items": items, "count": len(items)})
    except Exception as error:
        return respond_to_error(error, "product_history")
