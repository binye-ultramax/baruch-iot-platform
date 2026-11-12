from shared.auth_context import caller_from_event
from shared.errors import HttpError
from shared.http import json_response, respond_to_error
from shared.products import get_product
from shared.serial import is_serial


def handler(event, context):
    try:
        caller_from_event(event)

        serial_number = (event.get("pathParameters") or {}).get("serialNumber", "").strip().upper()
        if not is_serial(serial_number):
            raise HttpError(400, "serialNumber must look like BMS-2026-000001.")

        product = get_product(serial_number)
        if product is None:
            raise HttpError(404, "No product with that serial number.")
        return json_response(200, product)
    except Exception as error:
        return respond_to_error(error, "get_product")
