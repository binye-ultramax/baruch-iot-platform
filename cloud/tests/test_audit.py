import os
import sys
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.audit import PRODUCT_CREATED, build_entry, summarize, transact_put_item

CALLER = {"email": "admin@baruch.io", "name": "Admin", "role": "Administrator"}
EVENT = {
    "requestContext": {
        "requestId": "req-123",
        "http": {"sourceIp": "81.2.69.142", "userAgent": "PowerShell/7"},
    }
}


class BuildEntryTests(unittest.TestCase):
    def test_entry_records_who_what_when_and_where(self) -> None:
        when = datetime(2026, 11, 12, 14, 30, 0, 123000, tzinfo=timezone.utc)
        entry = build_entry("BMS-2026-000001", PRODUCT_CREATED, CALLER, EVENT, {"model": "X"}, now=when)

        self.assertEqual(entry["serialNumber"], "BMS-2026-000001")
        self.assertTrue(entry["occurredAt"].startswith("2026-11-12T14:30:00.123Z#"))
        self.assertEqual(len(entry["occurredAt"].split("#")[1]), 6)
        self.assertEqual(entry["action"], PRODUCT_CREATED)
        self.assertEqual(entry["actorEmail"], "admin@baruch.io")
        self.assertEqual(entry["actorRole"], "Administrator")
        self.assertEqual(entry["sourceIp"], "81.2.69.142")
        self.assertEqual(entry["userAgent"], "PowerShell/7")
        self.assertEqual(entry["requestId"], "req-123")
        self.assertEqual(entry["details"], {"model": "X"})

    def test_two_entries_in_the_same_millisecond_get_different_keys(self) -> None:
        when = datetime(2026, 11, 12, tzinfo=timezone.utc)
        first = build_entry("BMS-2026-000001", PRODUCT_CREATED, CALLER, {}, now=when)
        second = build_entry("BMS-2026-000001", PRODUCT_CREATED, CALLER, {}, now=when)
        self.assertNotEqual(first["occurredAt"], second["occurredAt"])

    def test_request_fields_are_optional(self) -> None:
        entry = build_entry("BMS-2026-000001", PRODUCT_CREATED, CALLER, {})
        self.assertNotIn("sourceIp", entry)
        self.assertNotIn("userAgent", entry)
        self.assertNotIn("requestId", entry)
        self.assertNotIn("details", entry)

    def test_summarize_keeps_only_identifying_fields(self) -> None:
        summary = summarize(
            {"model": "M", "batchNumber": "B", "cellCount": 16, "chemistry": "LiFePO4", "notes": "secret", "capacityAh": 100.0}
        )
        self.assertEqual(summary, {"model": "M", "batchNumber": "B", "cellCount": 16, "chemistry": "LiFePO4", "capacityAh": 100.0})


class TransactPutTests(unittest.TestCase):
    def test_put_targets_the_log_table_and_refuses_overwrites(self) -> None:
        previous = os.environ.get("AUDIT_LOG_TABLE")
        os.environ["AUDIT_LOG_TABLE"] = "BmsProductAuditLog"
        try:
            put = transact_put_item({"serialNumber": "S", "occurredAt": "T", "details": {"capacityAh": 100.5}})["Put"]
        finally:
            if previous is None:
                os.environ.pop("AUDIT_LOG_TABLE", None)
            else:
                os.environ["AUDIT_LOG_TABLE"] = previous

        self.assertEqual(put["TableName"], "BmsProductAuditLog")
        self.assertIn("attribute_not_exists(occurredAt)", put["ConditionExpression"])
        self.assertEqual(put["Item"]["details"]["capacityAh"], Decimal("100.5"))


if __name__ == "__main__":
    unittest.main()
