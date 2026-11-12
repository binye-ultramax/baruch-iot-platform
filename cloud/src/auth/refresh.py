from shared.cognito import refresh
from shared.http import json_response, read_json_body, respond_to_error
from shared.validate import parse_refresh_body


def handler(event, context):
    try:
        body = parse_refresh_body(read_json_body(event))
        session = refresh(body["userId"], body["refreshToken"])
        return json_response(200, session)
    except Exception as error:
        return respond_to_error(error, "refresh")
