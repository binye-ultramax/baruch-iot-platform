import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.auth_context import caller_from_event, require_administrator
from shared.errors import HttpError


def _event(claims: dict) -> dict:
    return {"requestContext": {"authorizer": {"jwt": {"claims": claims}}}}


class AuthContextTests(unittest.TestCase):
    def test_reads_email_name_and_role_from_claims(self) -> None:
        caller = caller_from_event(
            _event({"email": "a@b.co", "name": "Ada", "cognito:groups": "[Operator Administrator]"})
        )
        self.assertEqual(caller, {"email": "a@b.co", "name": "Ada", "role": "Administrator"})

    def test_groups_as_list_also_work(self) -> None:
        caller = caller_from_event(_event({"email": "a@b.co", "cognito:groups": ["Operator"]}))
        self.assertEqual(caller["role"], "Operator")

    def test_no_groups_means_operator(self) -> None:
        caller = caller_from_event(_event({"email": "a@b.co"}))
        self.assertEqual(caller["role"], "Operator")
        self.assertEqual(caller["name"], "a@b.co")

    def test_missing_claims_is_unauthorized(self) -> None:
        with self.assertRaises(HttpError) as caught:
            caller_from_event({})
        self.assertEqual(caught.exception.status_code, 401)

    def test_require_administrator_rejects_operators(self) -> None:
        with self.assertRaises(HttpError) as caught:
            require_administrator({"role": "Operator"})
        self.assertEqual(caught.exception.status_code, 403)
        require_administrator({"role": "Administrator"})


if __name__ == "__main__":
    unittest.main()
