import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.device_ids import (
    ACTIVATION_KEY_PATTERN,
    hash_activation_key,
    is_device_id,
    new_activation_key,
    new_device_id,
    new_instant_reading_key,
    normalize_activation_key,
)


class DeviceIdTests(unittest.TestCase):
    def test_device_id_has_prefix_and_26_crockford_chars(self) -> None:
        device_id = new_device_id()
        self.assertTrue(is_device_id(device_id), device_id)
        self.assertEqual(len(device_id), 30)

    def test_device_ids_are_time_ordered(self) -> None:
        earlier = new_device_id(now_ms=1_700_000_000_000)
        later = new_device_id(now_ms=1_700_000_000_001)
        self.assertLess(earlier, later)

    def test_device_ids_are_unique(self) -> None:
        ids = {new_device_id(now_ms=1_700_000_000_000) for _ in range(1000)}
        self.assertEqual(len(ids), 1000)

    def test_is_device_id_rejects_bad_shapes(self) -> None:
        self.assertFalse(is_device_id("dev_short"))
        self.assertFalse(is_device_id("dev_01JCMK3Q7X8R2N5VBHT9AZW4EI"))  # I is not Crockford
        self.assertFalse(is_device_id("BMS-2026-000001"))
        self.assertFalse(is_device_id(None))


class KeyTests(unittest.TestCase):
    def test_instant_reading_key_is_long_and_url_safe(self) -> None:
        key = new_instant_reading_key()
        self.assertGreaterEqual(len(key), 40)
        self.assertRegex(key, r"^[A-Za-z0-9_-]+$")

    def test_activation_key_shape_and_alphabet(self) -> None:
        for _ in range(200):
            key = new_activation_key()
            self.assertRegex(key, ACTIVATION_KEY_PATTERN)
            for ambiguous in "0O1I":
                self.assertNotIn(ambiguous, key)

    def test_activation_keys_are_unique(self) -> None:
        self.assertEqual(len({new_activation_key() for _ in range(1000)}), 1000)

    def test_normalize_accepts_lowercase_and_missing_dashes(self) -> None:
        self.assertEqual(normalize_activation_key("k7pm3xqdr9htwb2n"), "K7PM-3XQD-R9HT-WB2N")
        self.assertEqual(normalize_activation_key("K7PM 3XQD R9HT WB2N"), "K7PM-3XQD-R9HT-WB2N")

    def test_hash_is_stable_across_formatting(self) -> None:
        self.assertEqual(hash_activation_key("K7PM-3XQD-R9HT-WB2N"), hash_activation_key("k7pm3xqdr9htwb2n"))
        self.assertNotEqual(hash_activation_key("K7PM-3XQD-R9HT-WB2N"), hash_activation_key("K7PM-3XQD-R9HT-WB2M"))


if __name__ == "__main__":
    unittest.main()
