import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.errors import HttpError
from shared.validate_product import parse_limit, parse_product_body

VALID = {
    "model": " BMS-16S-100A ",
    "batchNumber": "B2026-11-A",
    "cellCount": 16,
    "chemistry": "LiFePO4",
}


class ValidateProductTests(unittest.TestCase):
    def test_required_fields_are_kept_and_trimmed(self) -> None:
        self.assertEqual(
            parse_product_body(VALID),
            {"model": "BMS-16S-100A", "batchNumber": "B2026-11-A", "cellCount": 16, "chemistry": "LiFePO4"},
        )

    def test_optional_fields_are_included_when_present(self) -> None:
        body = parse_product_body(
            {**VALID, "firmwareVersion": "1.4.2", "capacityAh": 100, "hardwareRevision": "rev C",
             "manufacturedAt": "2026-11-12", "notes": "first run"}
        )
        self.assertEqual(body["firmwareVersion"], "1.4.2")
        self.assertEqual(body["capacityAh"], 100.0)
        self.assertEqual(body["hardwareRevision"], "rev C")
        self.assertEqual(body["manufacturedAt"], "2026-11-12")
        self.assertEqual(body["notes"], "first run")

    def test_missing_model_is_rejected(self) -> None:
        with self.assertRaises(HttpError) as caught:
            parse_product_body({**VALID, "model": ""})
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(str(caught.exception), "model is required.")

    def test_unknown_chemistry_is_rejected(self) -> None:
        with self.assertRaises(HttpError):
            parse_product_body({**VALID, "chemistry": "Unknown"})

    def test_cell_count_must_be_a_whole_number(self) -> None:
        with self.assertRaises(HttpError):
            parse_product_body({**VALID, "cellCount": "16"})
        with self.assertRaises(HttpError):
            parse_product_body({**VALID, "cellCount": True})

    def test_bad_firmware_version_is_rejected(self) -> None:
        with self.assertRaises(HttpError):
            parse_product_body({**VALID, "firmwareVersion": "not a version!"})

    def test_parse_limit_defaults_and_bounds(self) -> None:
        self.assertEqual(parse_limit(None), 50)
        self.assertEqual(parse_limit("10"), 10)
        with self.assertRaises(HttpError):
            parse_limit("0")
        with self.assertRaises(HttpError):
            parse_limit("abc")


if __name__ == "__main__":
    unittest.main()
