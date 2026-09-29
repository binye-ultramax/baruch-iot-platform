import base64
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fakes import NamedError
from shared.errors import HttpError
from shared.http import read_json_body, respond_to_error


class HttpTests(unittest.TestCase):
    def test_read_json_body_parses_a_json_object(self) -> None:
        self.assertEqual(read_json_body({"body": '{"email":"a@b.co"}'}), {"email": "a@b.co"})

    def test_read_json_body_decodes_a_base64_body(self) -> None:
        body = base64.b64encode(b'{"ok":true}').decode()
        self.assertEqual(read_json_body({"body": body, "isBase64Encoded": True}), {"ok": True})

    def test_read_json_body_rejects_an_empty_body(self) -> None:
        with self.assertRaises(HttpError) as caught:
            read_json_body({"body": ""})
        self.assertEqual(caught.exception.status_code, 400)

    def test_read_json_body_rejects_invalid_json(self) -> None:
        with self.assertRaises(HttpError) as caught:
            read_json_body({"body": "{"})
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(str(caught.exception), "Request body must be JSON.")

    def test_read_json_body_rejects_an_oversized_body(self) -> None:
        with self.assertRaises(HttpError) as caught:
            read_json_body({"body": '{"name":"' + ("a" * 9000) + '"}'})
        self.assertEqual(caught.exception.status_code, 400)

    def test_respond_to_error_returns_the_mapped_cognito_status(self) -> None:
        response = respond_to_error(NamedError("UsernameExistsException"), "register")
        self.assertEqual(response["statusCode"], 409)
        self.assertEqual(
            json.loads(response["body"]),
            {"message": "An account with this email already exists."},
        )


if __name__ == "__main__":
    unittest.main()
