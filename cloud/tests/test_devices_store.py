import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared import devices
from shared.errors import HttpError

ENV = {
    "DEVICES_TABLE": "BmsDevices",
    "DEVICE_MACS_TABLE": "BmsDeviceMacs",
    "PRODUCTS_TABLE": "BmsProducts",
    "AUDIT_LOG_TABLE": "BmsAuditLog",
    "DEVICE_KEY_KMS_ARN": "arn:aws:kms:eu-west-2:1:key/abc",
}


class _CancelledTransaction(Exception):
    def __init__(self, codes):
        super().__init__("TransactionCanceledException")
        self.response = {"CancellationReasons": [{"Code": code} for code in codes]}


@mock.patch.dict(os.environ, ENV)
class RegisterDeviceStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        devices._dynamodb = None
        devices._kms = None
        self.resource = mock.MagicMock()
        self.kms = mock.MagicMock()
        self.kms.encrypt.return_value = {"CiphertextBlob": b"cipher"}
        patcher_r = mock.patch.object(devices, "_resource", return_value=self.resource)
        patcher_k = mock.patch.object(devices, "_kms_client", return_value=self.kms)
        patcher_r.start()
        patcher_k.start()
        self.addCleanup(patcher_r.stop)
        self.addCleanup(patcher_k.stop)

    def _audit(self, device_id):
        return {"subjectId": device_id, "occurredAt": "t", "action": "DEVICE_REGISTERED"}

    def test_external_unit_writes_device_mac_and_audit_but_not_product(self) -> None:
        result = devices.register_device(
            {"macAddress": "AA:BB:CC:DD:EE:FF", "manufacturer": "Daly"}, "admin@x", self._audit
        )

        writes = self.resource.meta.client.transact_write_items.call_args.kwargs["TransactItems"]
        self.assertEqual(len(writes), 3)
        self.assertEqual(writes[0]["Put"]["TableName"], "BmsDevices")
        self.assertEqual(writes[1]["Put"]["TableName"], "BmsDeviceMacs")
        self.assertEqual(writes[2]["Put"]["TableName"], "BmsAuditLog")
        self.assertEqual(result["origin"], "EXTERNAL")
        self.assertEqual(result["manufacturer"], "Daly")
        self.assertIn("instantReadingKey", result)
        self.assertIn("activationKey", result)
        self.assertNotIn("activationKeyHash", result)
        # The stored row holds ciphertext, not the plaintext key.
        stored = writes[0]["Put"]["Item"]
        self.assertNotEqual(stored["instantReadingKey"], result["instantReadingKey"])
        self.kms.encrypt.assert_called_once()
        self.assertEqual(self.kms.encrypt.call_args.kwargs["EncryptionContext"]["deviceId"], result["deviceId"])

    def test_factory_unit_marks_product_shipped(self) -> None:
        self.resource.Table.return_value.get_item.return_value = {
            "Item": {"serialNumber": "BMS-2026-000001", "status": "MANUFACTURED", "model": "BMS-16S", "firmwareVersion": "1.0"}
        }
        result = devices.register_device(
            {"macAddress": "AA:BB:CC:DD:EE:FF", "serialNumber": "BMS-2026-000001", "manufacturer": "Other", "model": "Wrong"},
            "admin@x",
            self._audit,
        )

        writes = self.resource.meta.client.transact_write_items.call_args.kwargs["TransactItems"]
        self.assertEqual(len(writes), 4)
        update = writes[3]["Update"]
        self.assertEqual(update["TableName"], "BmsProducts")
        self.assertEqual(update["ExpressionAttributeValues"][":shipped"], "SHIPPED")
        self.assertEqual(result["origin"], "FACTORY")
        # The product record wins over whatever the body said.
        self.assertEqual(result["model"], "BMS-16S")
        self.assertEqual(result["manufacturer"], "Baruch")
        self.assertEqual(result["firmwareVersion"], "1.0")

    def test_factory_unit_accepts_newer_firmware_from_body(self) -> None:
        self.resource.Table.return_value.get_item.return_value = {"Item": {"status": "MANUFACTURED", "firmwareVersion": "1.0"}}
        result = devices.register_device(
            {"macAddress": "AA:BB:CC:DD:EE:FF", "serialNumber": "BMS-2026-000001", "firmwareVersion": "1.1"}, "a", self._audit
        )
        self.assertEqual(result["firmwareVersion"], "1.1")

    def test_unknown_serial_is_404(self) -> None:
        self.resource.Table.return_value.get_item.return_value = {}
        with self.assertRaises(HttpError) as caught:
            devices.register_device({"macAddress": "AA:BB:CC:DD:EE:FF", "serialNumber": "BMS-2026-000009"}, "a", self._audit)
        self.assertEqual(caught.exception.status_code, 404)

    def test_retired_product_is_409(self) -> None:
        self.resource.Table.return_value.get_item.return_value = {"Item": {"status": "RETIRED"}}
        with self.assertRaises(HttpError) as caught:
            devices.register_device({"macAddress": "AA:BB:CC:DD:EE:FF", "serialNumber": "BMS-2026-000001"}, "a", self._audit)
        self.assertEqual(caught.exception.status_code, 409)

    def test_duplicate_mac_is_reported(self) -> None:
        self.resource.meta.client.transact_write_items.side_effect = _CancelledTransaction(["None", "ConditionalCheckFailed", "None"])
        with self.assertRaises(HttpError) as caught:
            devices.register_device({"macAddress": "AA:BB:CC:DD:EE:FF", "manufacturer": "X"}, "a", self._audit)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIn("MAC address", str(caught.exception))

    def test_already_registered_product_is_reported(self) -> None:
        self.resource.Table.return_value.get_item.return_value = {"Item": {"status": "MANUFACTURED"}}
        self.resource.meta.client.transact_write_items.side_effect = _CancelledTransaction(
            ["None", "None", "None", "ConditionalCheckFailed"]
        )
        with self.assertRaises(HttpError) as caught:
            devices.register_device({"macAddress": "AA:BB:CC:DD:EE:FF", "serialNumber": "BMS-2026-000001"}, "a", self._audit)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIn("already been registered", str(caught.exception))


class PublicViewTests(unittest.TestCase):
    def test_secrets_are_stripped(self) -> None:
        view = devices.public_view({"deviceId": "d", "instantReadingKey": "x", "activationKeyHash": "y", "macAddress": "m"})
        self.assertEqual(view, {"deviceId": "d", "macAddress": "m"})


if __name__ == "__main__":
    unittest.main()
