from shared.cognito import sign_up
from shared.http import json_response, read_json_body, respond_to_error
from shared.validate import parse_register_body


def handler(event, context):
    try:
        body = parse_register_body(read_json_body(event))
        sign_up(body["email"], body["password"], body["name"])
        return json_response(201, {"email": body["email"], "confirmationRequired": True})
    except Exception as error:
        return respond_to_error(error, "register")
