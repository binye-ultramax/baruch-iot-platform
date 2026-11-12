import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from products import create as create_handler
from products import get as get_handler
from products import list as list_handler

ADMIN_CLAIMS = {"email": "admin@baruch.io", "name": "Admin", "cognito:groups": "[Administrator]"}
OPERATOR_CLAIMS = {"email": "op@baruch.io", "name": "Op", "cognito:groups": "[Operator]"}


def _event(claims: dict, body: dict | None = None, path: dict | None = None, query: dict | None = None) -> dict:
    event: dict = {"requestContext": {"authorizer": {"jwt": {"claims": claims}}}}
    if body is not None:
        event["body"] = json.dumps(body)
    if path is not None:
        event["pathParameters"] = path
    if query is not None:
        event["queryStringParameters"] = query
    return event


VALID_BODY = {"model": "BMS-16S-100A", "batchNumber": "B2026-11-A", "cellCount": 16, "chemistry": "LiFePO4"}


class CreateProductTests(unittest.TestCase):
    @mock.patch("products.create.create_product")
    @mock.patch("products.create.next_serial_number", return_value="BMS-2026-000007")
    def test_admin_gets_a_serial_and_the_row_is_stored(self, _next, create) -> None:
        create.side_effect = lambda serial, meta, created_by: {"serialNumber": serial, **meta, "createdBy": created_by}

        response = create_handler.handler(_event(ADMIN_CLAIMS, VALID_BODY), None)

        self.assertEqual(response["statusCode"], 201)
        body = json.loads(response["body"])
        self.assertEqual(body["serialNumber"], "BMS-2026-000007")
        self.assertEqual(body["createdBy"], "admin@baruch.io")
        create.assert_called_once()

    @mock.patch("products.create.next_serial_number")
    def test_operator_is_forbidden_before_a_serial_is_taken(self, next_serial) -> None:
        response = create_handler.handler(_event(OPERATOR_CLAIMS, VALID_BODY), None)
        self.assertEqual(response["statusCode"], 403)
        next_serial.assert_not_called()

    @mock.patch("products.create.next_serial_number")
    def test_invalid_body_does_not_consume_a_serial(self, next_serial) -> None:
        response = create_handler.handler(_event(ADMIN_CLAIMS, {**VALID_BODY, "chemistry": "Unknown"}), None)
        self.assertEqual(response["statusCode"], 400)
        next_serial.assert_not_called()


class GetProductTests(unittest.TestCase):
    @mock.patch("products.get.get_product", return_value={"serialNumber": "BMS-2026-000001"})
    def test_lowercase_serial_is_normalized(self, get_product) -> None:
        response = get_handler.handler(_event(OPERATOR_CLAIMS, path={"serialNumber": "bms-2026-000001"}), None)
        self.assertEqual(response["statusCode"], 200)
        get_product.assert_called_once_with("BMS-2026-000001")

    @mock.patch("products.get.get_product", return_value=None)
    def test_unknown_serial_is_404(self, _get) -> None:
        response = get_handler.handler(_event(OPERATOR_CLAIMS, path={"serialNumber": "BMS-2026-999999"}), None)
        self.assertEqual(response["statusCode"], 404)

    def test_malformed_serial_is_400(self) -> None:
        response = get_handler.handler(_event(OPERATOR_CLAIMS, path={"serialNumber": "nope"}), None)
        self.assertEqual(response["statusCode"], 400)


class ListProductsTests(unittest.TestCase):
    @mock.patch("products.list.list_products_by_batch", return_value=[{"serialNumber": "BMS-2026-000001"}])
    def test_list_by_batch(self, by_batch) -> None:
        response = list_handler.handler(_event(OPERATOR_CLAIMS, query={"batch": "B2026-11-A"}), None)
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(json.loads(response["body"])["count"], 1)
        by_batch.assert_called_once_with("B2026-11-A", 50)

    def test_requires_a_filter(self) -> None:
        response = list_handler.handler(_event(OPERATOR_CLAIMS, query=None), None)
        self.assertEqual(response["statusCode"], 400)

    def test_rejects_unknown_status(self) -> None:
        response = list_handler.handler(_event(OPERATOR_CLAIMS, query={"status": "LOST"}), None)
        self.assertEqual(response["statusCode"], 400)

    def test_requires_sign_in(self) -> None:
        response = list_handler.handler({"queryStringParameters": {"batch": "x"}}, None)
        self.assertEqual(response["statusCode"], 401)


if __name__ == "__main__":
    unittest.main()
