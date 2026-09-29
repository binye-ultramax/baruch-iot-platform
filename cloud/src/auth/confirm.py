from shared.cognito import confirm_sign_up
from shared.http import json_response, read_json_body, respond_to_error
from shared.validate import parse_confirm_body


def handler(event, context):
    try:
        body = parse_confirm_body(read_json_body(event))
        confirm_sign_up(body["email"], body["code"])
        return json_response(200, {"email": body["email"], "confirmed": True})
    except Exception as error:
        return respond_to_error(error, "confirm")
