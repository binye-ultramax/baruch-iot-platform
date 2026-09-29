import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fakes import NamedError
from shared.errors import HttpError, map_cognito_error


class ErrorMappingTests(unittest.TestCase):
    def test_register_maps_a_duplicate_email_to_a_conflict(self) -> None:
        error = map_cognito_error(NamedError("UsernameExistsException"), "register")
        self.assertIsInstance(error, HttpError)
        assert error is not None
        self.assertEqual(error.status_code, 409)

    def test_confirm_maps_a_bad_code_to_a_client_error(self) -> None:
        error = map_cognito_error(NamedError("CodeMismatchException"), "confirm")
        self.assertIsInstance(error, HttpError)
        assert error is not None
        self.assertEqual(error.status_code, 400)
        self.assertIn("not valid", str(error))

    def test_login_hides_whether_the_account_exists(self) -> None:
        missing = map_cognito_error(NamedError("UserNotFoundException"), "login")
        denied = map_cognito_error(NamedError("NotAuthorizedException"), "login")
        assert missing is not None and denied is not None
        self.assertEqual(missing.status_code, 401)
        self.assertEqual(str(missing), str(denied))

    def test_login_tells_an_unconfirmed_user_to_confirm_first(self) -> None:
        error = map_cognito_error(NamedError("UserNotConfirmedException"), "login")
        assert error is not None
        self.assertEqual(error.status_code, 403)

    def test_unknown_failures_stay_unmapped(self) -> None:
        self.assertIsNone(map_cognito_error(NamedError("InternalError"), "login"))

    def test_boto3_error_code_is_read_from_the_response(self) -> None:
        class ClientFailure(Exception):
            def __init__(self) -> None:
                super().__init__("user exists")
                self.response = {"Error": {"Code": "UsernameExistsException"}}

        error = map_cognito_error(ClientFailure(), "register")
        assert error is not None
        self.assertEqual(error.status_code, 409)


if __name__ == "__main__":
    unittest.main()
