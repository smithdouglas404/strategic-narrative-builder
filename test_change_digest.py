"""Tests for the change digest (feature 5)."""
import unittest

import server


class ChangeDigestTests(unittest.TestCase):
    def test_revenue_change_with_percentage(self):
        old = {"snapshot": {"revenue": "GBP 14.0B"}}
        new = {"snapshot": {"revenue": "GBP 14.4B"}}
        changes = server.compute_change_digest(old, new)["changes"]
        rev = next(c for c in changes if c["type"] == "financial")
        self.assertIn("14.4B", rev["detail"])
        self.assertIn("%", rev["detail"])

    def test_no_change_yields_empty(self):
        payload = {"snapshot": {"revenue": "GBP 14.4B", "employees": "62000"}}
        self.assertEqual(server.compute_change_digest(payload, dict(payload))["changes"], [])

    def test_new_priority_detected(self):
        old = {"csuitePriorities": [{"priority": "Grow NII"}]}
        new = {"csuitePriorities": [{"priority": "Grow NII"}, {"priority": "Simplify tech estate"}]}
        changes = server.compute_change_digest(old, new)["changes"]
        self.assertTrue(any(c["type"] == "priority" and "Simplify" in c["detail"] for c in changes))

    def test_new_signal_detected(self):
        old = {"signalScan": []}
        new = {"signalScan": [{"label": "Lloyds cloud-core migration"}]}
        changes = server.compute_change_digest(old, new)["changes"]
        self.assertTrue(any(c["type"] == "signal" for c in changes))

    def test_employees_and_fiscal_year_changes(self):
        old = {"snapshot": {"employees": "60000", "fiscalYear": "2023"}}
        new = {"snapshot": {"employees": "62000", "fiscalYear": "2024"}}
        labels = {c["label"] for c in server.compute_change_digest(old, new)["changes"]}
        self.assertIn("Employees updated", labels)
        self.assertIn("Fiscal year updated", labels)

    def test_handles_non_dict_inputs(self):
        self.assertEqual(server.compute_change_digest(None, "nope")["changes"], [])


if __name__ == "__main__":
    unittest.main()
