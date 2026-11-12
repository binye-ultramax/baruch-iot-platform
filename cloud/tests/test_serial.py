import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.serial import MAX_SEQUENCE, current_year, format_serial, is_serial


class SerialTests(unittest.TestCase):
    def test_format_pads_sequence_to_six_digits(self) -> None:
        self.assertEqual(format_serial(2026, 1), "BMS-2026-000001")
        self.assertEqual(format_serial(2026, 123456), "BMS-2026-123456")

    def test_format_rejects_out_of_range_sequence(self) -> None:
        with self.assertRaises(ValueError):
            format_serial(2026, 0)
        with self.assertRaises(ValueError):
            format_serial(2026, MAX_SEQUENCE + 1)

    def test_is_serial_accepts_only_the_expected_shape(self) -> None:
        self.assertTrue(is_serial("BMS-2026-000001"))
        self.assertFalse(is_serial("bms-2026-000001"))
        self.assertFalse(is_serial("BMS-2026-1"))
        self.assertFalse(is_serial("BMS-26-000001"))
        self.assertFalse(is_serial(None))

    def test_current_year_uses_utc(self) -> None:
        self.assertEqual(current_year(datetime(2026, 12, 31, 23, 0, tzinfo=timezone.utc)), 2026)


if __name__ == "__main__":
    unittest.main()
