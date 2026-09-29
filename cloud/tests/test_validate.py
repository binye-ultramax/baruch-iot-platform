import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.errors import HttpError
from shared.validate import parse_confirm_body, parse_login_body, parse_register_body

VALID_REGISTER = {
    "email": " Operator@Baruch.io ",
    "password": "Baruch2026!",
    "name": " Fleet Operator ",
}


class ValidateTests(unittest.TestCase):
    def test_parse_register_body_normalizes_email_and_name(self) -> None:
        self.assertEqual(
            parse_register_body(VALID_REGISTER),
            {
                "email": "operator@baruch.io",
                "password": "Baruch2026!",
                "name": "Fleet Operator",
            },
        )

    def test_parse_register_body_rejects_a_weak_password(self) -> None:
        body = {**VALID_REGISTER, "password": "baruch2026"}
        with self.assertRaises(HttpError) as caught:
            parse_register_body(body)
        self.assertEqual(caught.exception.status_code, 400)

    def test_parse_register_body_rejects_a_password_that_matches_the_email(self) -> None:
        with self.assertRaises(HttpError) as caught:
            parse_register_body(
                {"email": "User1@Baruch.io", "password": "User1@baruch.io", "name": "Ada"}
            )
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(str(caught.exception), "Password must not match the email address.")

    def test_parse_confirm_body_accepts_a_6_digit_code(self) -> None:
        self.assertEqual(
            parse_confirm_body({"email": "operator@baruch.io", "code": "123456"}),
            {"email": "operator@baruch.io", "code": "123456"},
        )

    def test_parse_login_body_does_not_enforce_the_registration_password_policy(self) -> None:
        self.assertEqual(
            parse_login_body({"email": "operator@baruch.io", "password": "short"}),
            {"email": "operator@baruch.io", "password": "short"},
        )

    def test_parsers_reject_a_non_object_body(self) -> None:
        with self.assertRaises(HttpError) as caught:
            parse_login_body(["nope"])
        self.assertEqual(caught.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
