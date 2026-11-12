from shared.audit import actions_by_actor
from shared.auth_context import caller_from_event, require_administrator
from shared.errors import HttpError
from shared.http import json_response, respond_to_error
from shared.validate_product import parse_limit


def handler(event, context):
    try:
        caller = caller_from_event(event)
        require_administrator(caller)

        params = event.get("queryStringParameters") or {}
        actor = (params.get("actor") or "").strip().lower()
        if not actor or "@" not in actor:
            raise HttpError(400, "Provide an actor email, for example ?actor=someone@example.com.")

        limit = parse_limit(params.get("limit"), default=100, maximum=500)
        items = actions_by_actor(actor, limit)
        return json_response(200, {"actor": actor, "items": items, "count": len(items)})
    except Exception as error:
        return respond_to_error(error, "audit_by_actor")
