import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from shared.roles import role_from_groups


class RoleTests(unittest.TestCase):
    def test_administrator_membership_wins_when_both_groups_are_present(self) -> None:
        self.assertEqual(role_from_groups(["Operator", "Administrator"]), "Administrator")

    def test_everyone_else_is_an_operator(self) -> None:
        self.assertEqual(role_from_groups([]), "Operator")
        self.assertEqual(role_from_groups(["Operator"]), "Operator")


if __name__ == "__main__":
    unittest.main()
