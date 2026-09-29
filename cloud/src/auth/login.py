from shared.cognito import login
from shared.http import json_response, read_json_body, respond_to_error
from shared.validate import parse_login_body


def handler(event, context):
    try:
        body = parse_login_body(read_json_body(event))
        session = login(body["email"], body["password"])
        return json_response(200, session)
    except Exception as error:
        return respond_to_error(error, "login")
