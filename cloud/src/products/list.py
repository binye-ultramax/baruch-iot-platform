from shared.auth_context import caller_from_event
from shared.errors import HttpError
from shared.http import json_response, respond_to_error
from shared.products import PRODUCT_STATUSES, list_products_by_batch, list_products_by_status
from shared.validate_product import parse_limit


def handler(event, context):
    try:
        caller_from_event(event)

        params = event.get("queryStringParameters") or {}
        limit = parse_limit(params.get("limit"))
        batch = (params.get("batch") or "").strip()
        status = (params.get("status") or "").strip().upper()

        if batch and status:
            raise HttpError(400, "Filter by batch or status, not both.")
        if batch:
            items = list_products_by_batch(batch, limit)
        elif status:
            if status not in PRODUCT_STATUSES:
                raise HttpError(400, f"status must be one of: {', '.join(PRODUCT_STATUSES)}.")
            items = list_products_by_status(status, limit)
        else:
            raise HttpError(400, "Provide a batch or status filter.")

        return json_response(200, {"items": items, "count": len(items)})
    except Exception as error:
        return respond_to_error(error, "list_products")
