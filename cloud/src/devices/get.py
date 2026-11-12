from shared.auth_context import caller_from_event
from shared.device_ids import is_device_id
from shared.devices import get_device
from shared.errors import HttpError
from shared.http import json_response, respond_to_error


def handler(event, context):
    try:
        caller_from_event(event)

        device_id = (event.get("pathParameters") or {}).get("deviceId", "").strip()
        if not is_device_id(device_id):
            raise HttpError(400, "deviceId must look like dev_ followed by 26 characters.")

        device = get_device(device_id)
        if device is None:
            raise HttpError(404, "No device with that id.")
        return json_response(200, device)
    except Exception as error:
        return respond_to_error(error, "get_device")
