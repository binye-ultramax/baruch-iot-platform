import base64
import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from auth import refresh as refresh_handler
from fakes import NamedError
from shared import cognito
from shared.errors import HttpError, map_cognito_error
from shared.validate import parse_refresh_body

ENV = {"USER_POOL_ID": "eu-west-2_test", "USER_POOL_CLIENT_ID": "client", "USER_POOL_CLIENT_SECRET": "secret"}
SUB = "36a25274-6001-706d-5913-adf36a8d1e90"


def _id_token(**claims) -> str:
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    return f"header.{payload}.signature"


class RefreshBodyTests(unittest.TestCase):
    def test_requires_both_fields(self) -> None:
        for body in ({}, {"userId": SUB}, {"refreshToken": "abc"}, {"userId": "", "refreshToken": "abc"}):
            with self.assertRaises(HttpError, msg=str(body)):
                parse_refresh_body(body)

    def test_trims_and_returns_fields(self) -> None:
        body = parse_refresh_body({"userId": f" {SUB} ", "refreshToken": "abc.def "})
        self.assertEqual(body, {"userId": SUB, "refreshToken": "abc.def"})

    def test_rejects_tokens_with_spaces(self) -> None:
        with self.assertRaises(HttpError):
            parse_refresh_body({"userId": SUB, "refreshToken": "a b"})


@mock.patch.dict(os.environ, ENV)
class RefreshFlowTests(unittest.TestCase):
    def setUp(self) -> None:
        cognito._client = None
        self.client = mock.MagicMock()
        patcher = mock.patch.object(cognito, "_cognito", return_value=self.client)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_refresh_uses_sub_for_secret_hash_and_returns_session(self) -> None:
        token = _id_token(sub=SUB, email="op@example.com", name="Op", **{"cognito:groups": ["Administrator"]})
        self.client.admin_initiate_auth.return_value = {
            "AuthenticationResult": {"IdToken": token, "AccessToken": "access", "ExpiresIn": 3600}
        }

        session = cognito.refresh(SUB, "refresh-token")

        call = self.client.admin_initiate_auth.call_args.kwargs
        self.assertEqual(call["AuthFlow"], "REFRESH_TOKEN_AUTH")
        self.assertEqual(call["AuthParameters"]["REFRESH_TOKEN"], "refresh-token")
        with mock.patch.dict(os.environ, ENV):
            from shared.secret_hash import secret_hash

            self.assertEqual(call["AuthParameters"]["SECRET_HASH"], secret_hash(SUB))
        self.assertEqual(session["user"], {"id": SUB, "email": "op@example.com", "name": "Op", "role": "Administrator"})
        self.assertEqual(session["tokens"], {"idToken": token, "accessToken": "access", "expiresIn": 3600})
        self.assertNotIn("refreshToken", session["tokens"])

    def test_login_returns_user_id(self) -> None:
        token = _id_token(sub=SUB, email="op@example.com", name="Op")
        self.client.admin_initiate_auth.return_value = {
            "AuthenticationResult": {"IdToken": token, "AccessToken": "a", "RefreshToken": "r", "ExpiresIn": 3600}
        }
        self.client.admin_list_groups_for_user.return_value = {"Groups": [{"GroupName": "Operator"}]}

        session = cognito.login("op@example.com", "pw")

        self.assertEqual(session["user"]["id"], SUB)
        self.assertEqual(session["user"]["role"], "Operator")
        self.assertEqual(session["tokens"]["refreshToken"], "r")


class RefreshHandlerTests(unittest.TestCase):
    @mock.patch("auth.refresh.refresh", return_value={"user": {}, "tokens": {}})
    def test_ok(self, refresh) -> None:
        response = refresh_handler.handler({"body": json.dumps({"userId": SUB, "refreshToken": "r"})}, None)
        self.assertEqual(response["statusCode"], 200)
        refresh.assert_called_once_with(SUB, "r")

    @mock.patch("auth.refresh.refresh", side_effect=NamedError("NotAuthorizedException"))
    def test_expired_refresh_token_is_401(self, _refresh) -> None:
        response = refresh_handler.handler({"body": json.dumps({"userId": SUB, "refreshToken": "r"})}, None)
        self.assertEqual(response["statusCode"], 401)
        self.assertIn("Sign in again", json.loads(response["body"])["message"])

    def test_missing_body_is_400(self) -> None:
        response = refresh_handler.handler({"body": json.dumps({"userId": SUB})}, None)
        self.assertEqual(response["statusCode"], 400)


class RefreshErrorMappingTests(unittest.TestCase):
    def test_revoked_and_unknown_look_the_same(self) -> None:
        a = map_cognito_error(NamedError("NotAuthorizedException"), "refresh")
        b = map_cognito_error(NamedError("UserNotFoundException"), "refresh")
        assert a is not None and b is not None
        self.assertEqual((a.status_code, str(a)), (b.status_code, str(b)))


if __name__ == "__main__":
    unittest.main()
