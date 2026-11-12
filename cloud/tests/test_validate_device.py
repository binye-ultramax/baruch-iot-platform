import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.errors import HttpError
from shared.validate_device import normalize_mac, parse_register_device_body


class MacTests(unittest.TestCase):
    def test_accepts_common_formats(self) -> None:
        for raw in ("aa:bb:cc:dd:ee:ff", "AA-BB-CC-DD-EE-FF", "aabb.ccdd.eeff", "AABBCCDDEEFF"):
            self.assertEqual(normalize_mac(raw), "AA:BB:CC:DD:EE:FF", raw)

    def test_rejects_wrong_length_and_reserved(self) -> None:
        for raw in ("AA:BB:CC", "AA:BB:CC:DD:EE:FF:00", "00:00:00:00:00:00", "FF:FF:FF:FF:FF:FF", "GG:BB:CC:DD:EE:FF", None):
            with self.assertRaises(HttpError, msg=str(raw)):
                normalize_mac(raw)


class RegisterBodyTests(unittest.TestCase):
    def test_factory_unit_needs_mac_and_serial(self) -> None:
        body = parse_register_device_body({"macAddress": "aa:bb:cc:dd:ee:ff", "serialNumber": "bms-2026-000001"})
        self.assertEqual(body, {"macAddress": "AA:BB:CC:DD:EE:FF", "serialNumber": "BMS-2026-000001"})

    def test_external_unit_needs_mac_and_manufacturer(self) -> None:
        body = parse_register_device_body(
            {"macAddress": "AA:BB:CC:DD:EE:FF", "manufacturer": " Daly ", "model": "16S 100A", "firmwareVersion": "2.1"}
        )
        self.assertEqual(body["manufacturer"], "Daly")
        self.assertEqual(body["model"], "16S 100A")
        self.assertEqual(body["firmwareVersion"], "2.1")
        self.assertNotIn("serialNumber", body)

    def test_mac_alone_is_not_enough(self) -> None:
        with self.assertRaises(HttpError) as caught:
            parse_register_device_body({"macAddress": "AA:BB:CC:DD:EE:FF"})
        self.assertEqual(caught.exception.status_code, 400)
        self.assertIn("serialNumber", str(caught.exception))

    def test_bad_serial_is_rejected(self) -> None:
        with self.assertRaises(HttpError):
            parse_register_device_body({"macAddress": "AA:BB:CC:DD:EE:FF", "serialNumber": "nope"})

    def test_empty_serial_is_treated_as_absent(self) -> None:
        body = parse_register_device_body({"macAddress": "AA:BB:CC:DD:EE:FF", "serialNumber": "", "manufacturer": "Daly"})
        self.assertNotIn("serialNumber", body)


if __name__ == "__main__":
    unittest.main()
