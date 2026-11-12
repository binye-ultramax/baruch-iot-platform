from shared.audit import DEVICE_REGISTERED, build_entry
from shared.auth_context import caller_from_event, require_administrator
from shared.devices import register_device
from shared.http import json_response, read_json_body, respond_to_error
from shared.validate_device import parse_register_device_body


def handler(event, context):
    try:
        caller = caller_from_event(event)
        require_administrator(caller)

        body = parse_register_device_body(read_json_body(event))

        def audit_entry_for(device_id: str) -> dict:
            details = {key: body[key] for key in ("macAddress", "serialNumber", "manufacturer", "model") if key in body}
            return build_entry(device_id, DEVICE_REGISTERED, caller, event, details=details)

        device = register_device(body, registered_by=caller["email"], audit_entry_for=audit_entry_for)
        return json_response(201, device)
    except Exception as error:
        return respond_to_error(error, "register_device")
