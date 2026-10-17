"""Tests for the sliding-window rate limiter used by company lookup."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import server  # noqa: E402


class RateLimitTests(unittest.TestCase):
    def setUp(self):
        with server.RATE_LIMIT_LOCK:
            server.RATE_LIMIT_BUCKETS.clear()

    def test_allows_up_to_the_limit_then_blocks(self):
        for i in range(5):
            allowed, retry = server.rate_limit_hit("k", limit=5, window_seconds=60)
            self.assertTrue(allowed, f"hit {i} should be allowed")
            self.assertEqual(retry, 0)
        allowed, retry = server.rate_limit_hit("k", limit=5, window_seconds=60)
        self.assertFalse(allowed)
        self.assertGreaterEqual(retry, 1)

    def test_buckets_are_independent(self):
        for _ in range(5):
            server.rate_limit_hit("a", limit=5, window_seconds=60)
        allowed, _ = server.rate_limit_hit("b", limit=5, window_seconds=60)
        self.assertTrue(allowed)

    def test_expired_hits_age_out(self):
        server.rate_limit_hit("k", limit=1, window_seconds=0.01)
        allowed, _ = server.rate_limit_hit("k", limit=1, window_seconds=0.01)
        self.assertFalse(allowed)
        import time
        time.sleep(0.05)
        allowed, _ = server.rate_limit_hit("k", limit=1, window_seconds=0.01)
        self.assertTrue(allowed)

    def test_non_positive_limit_disables_limiting(self):
        for _ in range(100):
            allowed, retry = server.rate_limit_hit("k", limit=0, window_seconds=60)
            self.assertTrue(allowed)
            self.assertEqual(retry, 0)


if __name__ == "__main__":
    unittest.main()
