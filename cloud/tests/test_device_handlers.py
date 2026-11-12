import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from devices import find as find_handler
from devices import get as get_handler
from devices import register as register_handler
from devices import rotate_key as rotate_handler
from products import history as history_handler

ADMIN = {"email": "admin@baruch.io", "name": "Admin", "cognito:groups": "[Administrator]"}
OPERATOR = {"email": "op@baruch.io", "name": "Op", "cognito:groups": "[Operator]"}
DEVICE_ID = "dev_01JCMK3Q7X8R2N5VBHT9AZW4E6"


def _event(claims, body=None, path=None, query=None):
    event = {"requestContext": {"authorizer": {"jwt": {"claims": claims}}, "requestId": "r1", "http": {"sourceIp": "1.2.3.4"}}}
    if body is not None:
        event["body"] = json.dumps(body)
    if path is not None:
        event["pathParameters"] = path
    if query is not None:
        event["queryStringParameters"] = query
    return event


class RegisterDeviceTests(unittest.TestCase):
    @mock.patch("devices.register.register_device")
    def test_admin_registers_and_audit_entry_is_built_with_the_new_id(self, register) -> None:
        def fake_register(body, registered_by, audit_entry_for):
            entry = audit_entry_for(DEVICE_ID)
            return {"deviceId": DEVICE_ID, "audit": entry, "registeredBy": registered_by, **body}

        register.side_effect = fake_register
        response = register_handler.handler(
            _event(ADMIN, {"macAddress": "aa:bb:cc:dd:ee:ff", "serialNumber": "BMS-2026-000001"}), None
        )

        self.assertEqual(response["statusCode"], 201)
        body = json.loads(response["body"])
        self.assertEqual(body["deviceId"], DEVICE_ID)
        self.assertEqual(body["macAddress"], "AA:BB:CC:DD:EE:FF")
        self.assertEqual(body["audit"]["subjectId"], DEVICE_ID)
        self.assertEqual(body["audit"]["action"], "DEVICE_REGISTERED")
        self.assertEqual(body["audit"]["details"]["macAddress"], "AA:BB:CC:DD:EE:FF")

    @mock.patch("devices.register.register_device")
    def test_operator_is_forbidden(self, register) -> None:
        response = register_handler.handler(_event(OPERATOR, {"macAddress": "AA:BB:CC:DD:EE:FF", "manufacturer": "X"}), None)
        self.assertEqual(response["statusCode"], 403)
        register.assert_not_called()

    @mock.patch("devices.register.register_device")
    def test_invalid_body_is_400(self, register) -> None:
        response = register_handler.handler(_event(ADMIN, {"macAddress": "bad"}), None)
        self.assertEqual(response["statusCode"], 400)
        register.assert_not_called()


class GetDeviceTests(unittest.TestCase):
    @mock.patch("devices.get.get_device", return_value={"deviceId": DEVICE_ID})
    def test_returns_device(self, _get) -> None:
        response = get_handler.handler(_event(OPERATOR, path={"deviceId": DEVICE_ID}), None)
        self.assertEqual(response["statusCode"], 200)

    @mock.patch("devices.get.get_device", return_value=None)
    def test_missing_is_404(self, _get) -> None:
        response = get_handler.handler(_event(OPERATOR, path={"deviceId": DEVICE_ID}), None)
        self.assertEqual(response["statusCode"], 404)

    def test_bad_id_is_400(self) -> None:
        response = get_handler.handler(_event(OPERATOR, path={"deviceId": "nope"}), None)
        self.assertEqual(response["statusCode"], 400)


class FindDeviceTests(unittest.TestCase):
    @mock.patch("devices.find.find_by_mac", return_value={"deviceId": DEVICE_ID})
    def test_find_by_mac_normalizes(self, by_mac) -> None:
        response = find_handler.handler(_event(OPERATOR, query={"mac": "aabb.ccdd.eeff"}), None)
        self.assertEqual(response["statusCode"], 200)
        by_mac.assert_called_once_with("AA:BB:CC:DD:EE:FF")

    @mock.patch("devices.find.find_by_serial", return_value=None)
    def test_find_by_serial_not_found(self, by_serial) -> None:
        response = find_handler.handler(_event(OPERATOR, query={"serial": "bms-2026-000009"}), None)
        self.assertEqual(response["statusCode"], 404)
        by_serial.assert_called_once_with("BMS-2026-000009")

    def test_needs_one_filter(self) -> None:
        self.assertEqual(find_handler.handler(_event(OPERATOR, query={}), None)["statusCode"], 400)
        self.assertEqual(
            find_handler.handler(_event(OPERATOR, query={"mac": "AA:BB:CC:DD:EE:FF", "serial": "BMS-2026-000001"}), None)["statusCode"],
            400,
        )


class RotateKeyTests(unittest.TestCase):
    @mock.patch("devices.rotate_key.rotate_activation_key", return_value={"deviceId": DEVICE_ID, "activationKey": "AAAA-BBBB-CCCC-DDDD"})
    def test_admin_rotates(self, rotate) -> None:
        response = rotate_handler.handler(_event(ADMIN, path={"deviceId": DEVICE_ID}), None)
        self.assertEqual(response["statusCode"], 200)
        entry = rotate.call_args.args[1]
        self.assertEqual(entry["action"], "ACTIVATION_KEY_ROTATED")
        self.assertEqual(entry["subjectId"], DEVICE_ID)

    def test_operator_forbidden(self) -> None:
        response = rotate_handler.handler(_event(OPERATOR, path={"deviceId": DEVICE_ID}), None)
        self.assertEqual(response["statusCode"], 403)


class DeviceHistoryTests(unittest.TestCase):
    @mock.patch("products.history.history_for_subject", return_value=[])
    def test_history_accepts_device_id_path(self, history) -> None:
        response = history_handler.handler(_event(OPERATOR, path={"deviceId": DEVICE_ID}), None)
        self.assertEqual(response["statusCode"], 200)
        history.assert_called_once_with(DEVICE_ID, 100)


if __name__ == "__main__":
    unittest.main()
