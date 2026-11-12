import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from products import audit as audit_handler
from products import create as create_handler
from products import history as history_handler

ADMIN = {"email": "admin@baruch.io", "name": "Admin", "cognito:groups": "[Administrator]"}
OPERATOR = {"email": "op@baruch.io", "name": "Op", "cognito:groups": "[Operator]"}


def _event(claims, body=None, path=None, query=None):
    event = {"requestContext": {"authorizer": {"jwt": {"claims": claims}}, "requestId": "r1", "http": {"sourceIp": "1.2.3.4"}}}
    if body is not None:
        event["body"] = json.dumps(body)
    if path is not None:
        event["pathParameters"] = path
    if query is not None:
        event["queryStringParameters"] = query
    return event


class CreateWritesAuditTests(unittest.TestCase):
    @mock.patch("products.create.create_product")
    @mock.patch("products.create.next_serial_number", return_value="BMS-2026-000003")
    def test_create_passes_an_audit_entry_for_the_caller(self, _next, create) -> None:
        create.side_effect = lambda serial, meta, created_by, audit_entry: {"serialNumber": serial}
        body = {"model": "M", "batchNumber": "B", "cellCount": 16, "chemistry": "LiFePO4", "notes": "private"}

        response = create_handler.handler(_event(ADMIN, body), None)

        self.assertEqual(response["statusCode"], 201)
        entry = create.call_args.kwargs["audit_entry"]
        self.assertEqual(entry["serialNumber"], "BMS-2026-000003")
        self.assertEqual(entry["action"], "PRODUCT_CREATED")
        self.assertEqual(entry["actorEmail"], "admin@baruch.io")
        self.assertEqual(entry["actorRole"], "Administrator")
        self.assertEqual(entry["sourceIp"], "1.2.3.4")
        self.assertNotIn("notes", entry["details"])


class HistoryTests(unittest.TestCase):
    @mock.patch("products.history.history_for_product", return_value=[{"action": "PRODUCT_CREATED"}])
    def test_any_signed_in_user_can_read_history(self, history) -> None:
        response = history_handler.handler(_event(OPERATOR, path={"serialNumber": "bms-2026-000001"}), None)
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        self.assertEqual(body["serialNumber"], "BMS-2026-000001")
        self.assertEqual(body["count"], 1)
        history.assert_called_once_with("BMS-2026-000001", 100)

    def test_bad_serial_is_400(self) -> None:
        response = history_handler.handler(_event(OPERATOR, path={"serialNumber": "nope"}), None)
        self.assertEqual(response["statusCode"], 400)

    def test_requires_sign_in(self) -> None:
        response = history_handler.handler({"pathParameters": {"serialNumber": "BMS-2026-000001"}}, None)
        self.assertEqual(response["statusCode"], 401)


class AuditByActorTests(unittest.TestCase):
    @mock.patch("products.audit.actions_by_actor", return_value=[])
    def test_admin_can_query_by_actor(self, by_actor) -> None:
        response = audit_handler.handler(_event(ADMIN, query={"actor": " Op@Baruch.io "}), None)
        self.assertEqual(response["statusCode"], 200)
        by_actor.assert_called_once_with("op@baruch.io", 100)

    def test_operator_is_forbidden(self) -> None:
        response = audit_handler.handler(_event(OPERATOR, query={"actor": "op@baruch.io"}), None)
        self.assertEqual(response["statusCode"], 403)

    def test_actor_is_required(self) -> None:
        response = audit_handler.handler(_event(ADMIN, query={}), None)
        self.assertEqual(response["statusCode"], 400)


if __name__ == "__main__":
    unittest.main()
