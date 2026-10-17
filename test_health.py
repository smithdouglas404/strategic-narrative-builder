"""Tests for the /api/health payload: version, uptime and DB reachability."""
import os
import sys
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import server  # noqa: E402


class HealthPayloadTests(unittest.TestCase):
    def test_healthy_payload_reports_ok(self):
        payload, status = server.health_payload()
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["app"], "Strategic Narrative Builder 2.0")
        self.assertEqual(payload["appVersion"], server.APP_VERSION)
        self.assertGreaterEqual(payload["uptimeSeconds"], 0)
        self.assertTrue(payload["database"]["ok"])
        self.assertNotIn("error", payload["database"])

    def test_unreachable_database_reports_degraded_503(self):
        with mock.patch.object(server, "connect", side_effect=RuntimeError("db down")):
            payload, status = server.health_payload()
        self.assertEqual(status, 503)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["status"], "degraded")
        self.assertFalse(payload["database"]["ok"])
        self.assertEqual(payload["database"]["error"], "db down")

    def test_uptime_is_monotonic_across_calls(self):
        first, _ = server.health_payload()
        second, _ = server.health_payload()
        self.assertGreaterEqual(second["uptimeSeconds"], first["uptimeSeconds"])


if __name__ == "__main__":
    unittest.main()
