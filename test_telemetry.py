"""Tests for AI cost/latency/cache telemetry (feature 4)."""
import unittest

import server


class CostEstimateTests(unittest.TestCase):
    def test_known_model_pricing(self):
        # 1M input + 1M output on gpt-4.1-mini = 0.40 + 1.60
        self.assertAlmostEqual(server.estimate_ai_cost("gpt-4.1-mini", 1_000_000, 1_000_000), 2.00, places=4)

    def test_model_substring_match(self):
        # a versioned id still resolves to the base price
        self.assertGreater(server.estimate_ai_cost("sonar-pro-2024", 1_000_000, 0), 0)

    def test_unknown_model_uses_fallback(self):
        self.assertGreater(server.estimate_ai_cost("mystery-model", 1_000_000, 1_000_000), 0)

    def test_zero_tokens_zero_cost(self):
        self.assertEqual(server.estimate_ai_cost("gpt-4.1-mini", 0, 0), 0)


class UsageRecordingTests(unittest.TestCase):
    def test_summary_reflects_recorded_events(self):
        before = server.ai_usage_summary()["totals"]["calls"]
        server.record_ai_usage(
            "openai", "gpt-4.1-mini",
            {"usage": {"prompt_tokens": 1000, "completion_tokens": 500, "total_tokens": 1500}},
            latency_ms=1234,
        )
        after = server.ai_usage_summary()
        self.assertEqual(after["totals"]["calls"], before + 1)
        self.assertGreaterEqual(after["totals"]["tokens"], 1500)
        openai = next((p for p in after["providers"] if p["provider"] == "openai"), None)
        self.assertIsNotNone(openai)
        self.assertGreater(openai["estCostUsd"], 0)

    def test_cache_hits_counted_separately(self):
        before = server.ai_usage_summary()["totals"]["cacheHits"]
        server.record_cache_hit("company_lookup")
        after = server.ai_usage_summary()
        self.assertEqual(after["totals"]["cacheHits"], before + 1)

    def test_recording_never_raises_on_bad_data(self):
        # must not throw even if the response has no usage block
        server.record_ai_usage("perplexity", "sonar-pro", {"choices": []}, latency_ms=0)
        server.record_ai_usage("perplexity", None, "not a dict", latency_ms=0)


if __name__ == "__main__":
    unittest.main()
