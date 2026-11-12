from shared.audit import PRODUCT_CREATED, build_entry, summarize
from shared.auth_context import caller_from_event, require_administrator
from shared.http import json_response, read_json_body, respond_to_error
from shared.products import create_product, next_serial_number
from shared.validate_product import parse_product_body


def handler(event, context):
    try:
        caller = caller_from_event(event)
        require_administrator(caller)

        metadata = parse_product_body(read_json_body(event))
        serial_number = next_serial_number()
        audit_entry = build_entry(serial_number, PRODUCT_CREATED, caller, event, details=summarize(metadata))
        product = create_product(serial_number, metadata, created_by=caller["email"], audit_entry=audit_entry)
        return json_response(201, product)
    except Exception as error:
        return respond_to_error(error, "create_product")
