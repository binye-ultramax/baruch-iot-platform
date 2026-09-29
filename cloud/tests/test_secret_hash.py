import base64
import hashlib
import hmac
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.env import MissingConfigError
from shared.secret_hash import secret_hash


class SecretHashTests(unittest.TestCase):
    def test_secret_hash_is_the_cognito_hmac_of_username_plus_client_id(self) -> None:
        previous_id = os.environ.get("USER_POOL_CLIENT_ID")
        previous_secret = os.environ.get("USER_POOL_CLIENT_SECRET")
        try:
            os.environ["USER_POOL_CLIENT_ID"] = "client"
            os.environ["USER_POOL_CLIENT_SECRET"] = "secret"
            expected = base64.b64encode(
                hmac.new(b"secret", b"user@example.comclient", hashlib.sha256).digest()
            ).decode()
            self.assertEqual(secret_hash("user@example.com"), expected)

            del os.environ["USER_POOL_CLIENT_SECRET"]
            with self.assertRaises(MissingConfigError):
                secret_hash("user@example.com")
        finally:
            _restore("USER_POOL_CLIENT_ID", previous_id)
            _restore("USER_POOL_CLIENT_SECRET", previous_secret)


def _restore(name: str, value: str | None) -> None:
    if value is None:
        os.environ.pop(name, None)
        return
    os.environ[name] = value


if __name__ == "__main__":
    unittest.main()
