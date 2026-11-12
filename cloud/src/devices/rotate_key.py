from shared.audit import ACTIVATION_KEY_ROTATED, build_entry
from shared.auth_context import caller_from_event, require_administrator
from shared.device_ids import is_device_id
from shared.devices import rotate_activation_key
from shared.errors import HttpError
from shared.http import json_response, respond_to_error


def handler(event, context):
    try:
        caller = caller_from_event(event)
        require_administrator(caller)

        device_id = (event.get("pathParameters") or {}).get("deviceId", "").strip()
        if not is_device_id(device_id):
            raise HttpError(400, "deviceId must look like dev_ followed by 26 characters.")

        entry = build_entry(device_id, ACTIVATION_KEY_ROTATED, caller, event)
        result = rotate_activation_key(device_id, entry)
        return json_response(200, result)
    except Exception as error:
        return respond_to_error(error, "rotate_activation_key")
