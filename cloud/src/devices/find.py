from shared.auth_context import caller_from_event
from shared.devices import find_by_mac, find_by_serial
from shared.errors import HttpError
from shared.http import json_response, respond_to_error
from shared.serial import is_serial
from shared.validate_device import normalize_mac


def handler(event, context):
    try:
        caller_from_event(event)

        params = event.get("queryStringParameters") or {}
        mac = (params.get("mac") or "").strip()
        serial = (params.get("serial") or "").strip().upper()

        if mac and serial:
            raise HttpError(400, "Search by mac or serial, not both.")
        if mac:
            device = find_by_mac(normalize_mac(mac))
        elif serial:
            if not is_serial(serial):
                raise HttpError(400, "serial must look like BMS-2026-000001.")
            device = find_by_serial(serial)
        else:
            raise HttpError(400, "Provide ?mac= or ?serial=.")

        if device is None:
            raise HttpError(404, "No device matches.")
        return json_response(200, device)
    except Exception as error:
        return respond_to_error(error, "find_device")
