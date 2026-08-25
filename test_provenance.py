"""Tests for field-level provenance (feature 1) and source precedence."""
import unittest
from unittest import mock

import server


class ProvenanceTests(unittest.TestCase):
    def test_merge_records_source_and_confidence(self):
        target = {"revenue": ""}
        server.merge_profile_fields(target, {"revenue": "USD 1.2B"}, "Yahoo Finance profile enrichment")
        meta = target["fieldSources"]["revenue"]
        self.assertEqual(meta["source"], "Yahoo Finance profile enrichment")
        self.assertEqual(meta["confidence"], "high")

    def test_authoritative_override_updates_provenance(self):
        target = {
            "revenue": "$500M (AI)",
            "fieldSources": {"revenue": {"source": "Perplexity company lookup", "confidence": "medium"}},
        }
        server.merge_profile_fields(target, {"revenue": "USD 1.23B"}, "SEC EDGAR ticker and companyfacts")
        self.assertEqual(target["revenue"], "USD 1.23B")
        self.assertEqual(target["fieldSources"]["revenue"]["confidence"], "high")

    def test_non_authoritative_cannot_override_or_restamp(self):
        target = {
            "revenue": "USD 1.2B",
            "fieldSources": {"revenue": {"source": "Yahoo Finance", "confidence": "high"}},
        }
        server.merge_profile_fields(target, {"revenue": "USD 9.9B"}, "Google revenue snippet")
        self.assertEqual(target["revenue"], "USD 1.2B")
        self.assertEqual(target["fieldSources"]["revenue"]["source"], "Yahoo Finance")

    def test_dedupe_stamps_single_source_result(self):
        ai = {"name": "Acme", "ticker": "ACME", "confidence": 90, "revenue": "$500M",
              "industry": "Software", "source": "Perplexity company lookup"}
        ranked = server.dedupe_and_rank_company_results([ai])
        self.assertEqual(ranked[0]["fieldSources"]["revenue"]["source"], "Perplexity company lookup")
        self.assertEqual(ranked[0]["fieldSources"]["industry"]["confidence"], "medium")

    def test_confidence_tiers(self):
        self.assertEqual(server.source_confidence_level("SEC EDGAR companyfacts"), "high")
        self.assertEqual(server.source_confidence_level("Yahoo Finance profile enrichment"), "high")
        self.assertEqual(server.source_confidence_level("Companies House web lookup"), "high")
        self.assertEqual(server.source_confidence_level("Perplexity company lookup"), "medium")
        self.assertEqual(server.source_confidence_level("Google revenue snippet"), "low")

    def test_field_sources_does_not_pollute_value_resolution(self):
        profile = {"revenue": "USD 9B", "fieldSources": {"revenue": {"source": "SEC", "confidence": "high"}}}
        self.assertEqual(server.profile_revenue_value(profile), "USD 9B")
        # fieldSources must not surface as a value candidate
        keys = {k for k, _ in server.profile_field_candidates(profile)}
        self.assertNotIn("fieldsources_revenue", keys)

    def test_normalized_lookup_profile_preserves_provenance(self):
        n = server.normalized_lookup_profile({
            "name": "Acme", "revenue": "USD 9B", "source": "SEC EDGAR",
            "fieldSources": {"revenue": {"source": "SEC EDGAR", "confidence": "high"}},
        })
        self.assertIn("fieldSources", n)
        self.assertEqual(n["fieldSources"]["revenue"]["confidence"], "high")


class DisputeDetectionTests(unittest.TestCase):
    def test_material_percent_conflict_recorded(self):
        target = {
            "ebitdaMargin": "32%",
            "fieldSources": {"ebitdaMargin": {"source": "Perplexity company lookup", "confidence": "medium"}},
        }
        server.merge_profile_fields(target, {"ebitdaMargin": "31%"}, "SEC EDGAR companyfacts")
        entries = target["fieldDisputes"]["ebitdaMargin"]
        self.assertEqual(len(entries), 2)
        values = {e["value"] for e in entries}
        self.assertEqual(values, {"32%", "31%"})

    def test_material_money_conflict_recorded(self):
        target = {
            "netProfit": "USD 500M",
            "fieldSources": {"netProfit": {"source": "Perplexity company lookup", "confidence": "medium"}},
        }
        server.merge_profile_fields(target, {"netProfit": "USD 900M"}, "SEC EDGAR companyfacts")
        self.assertEqual(len(target["fieldDisputes"]["netProfit"]), 2)

    def test_formatting_only_difference_is_not_a_dispute(self):
        target = {"revenue": "USD 1.20B"}
        server.merge_profile_fields(target, {"revenue": "1,200 million"}, "SEC EDGAR")
        self.assertNotIn("fieldDisputes", target)

    def test_small_difference_within_tolerance_not_disputed(self):
        # 14.4B vs 13.9B is ~3.5% apart -> under the 5% money threshold
        self.assertFalse(server.financial_values_conflict("revenue", "USD 14.4B", "USD 13.9B"))

    def test_dispute_recorded_even_when_incoming_loses(self):
        # authoritative already present; non-authoritative differing value loses
        # but the disagreement is still surfaced
        target = {
            "revenue": "USD 1.2B",
            "fieldSources": {"revenue": {"source": "Yahoo Finance", "confidence": "high"}},
        }
        server.merge_profile_fields(target, {"revenue": "USD 3.0B"}, "Perplexity company lookup")
        self.assertEqual(target["revenue"], "USD 1.2B")  # winner unchanged
        self.assertIn("revenue", target["fieldDisputes"])

    def test_field_disputes_not_a_value_candidate(self):
        profile = {"revenue": "USD 9B", "fieldDisputes": {"revenue": [{"value": "USD 9B"}, {"value": "USD 8B"}]}}
        keys = {k for k, _ in server.profile_field_candidates(profile)}
        self.assertFalse(any("dispute" in k for k in keys))


class NarrativeSynthesisTests(unittest.TestCase):
    def _payload(self):
        return {
            "snapshot": {
                "name": "NatWest Group", "industry": "Financial services", "revenue": "GBP 14.4B",
                "fieldDisputes": {"ebitdaMargin": [
                    {"value": "32%", "source": "Perplexity company lookup"},
                    {"value": "31%", "source": "SEC EDGAR"},
                ]},
            },
            "financialTrends": [{"year": "2024", "revenue": "GBP 14.4B", "yoyGrowth": "3.1%"}],
            "priorityInsights": {"boardPriorities": [{"title": "Simplify the technology estate"}]},
            "csuitePriorities": [{"priority": "Grow net interest income"}],
            "signalScan": [{"label": "Lloyds cloud-core migration", "url": "https://example.com/lloyds"}],
        }

    def test_template_narrative_without_provider(self):
        # Force the no-provider fallback so the test is hermetic (no network).
        with mock.patch.object(server, "ai_provider_lookup_config", return_value={}):
            out = server.synthesize_business_narrative(self._payload())
        self.assertEqual(out["mode"], "template")
        self.assertIn("NatWest Group", out["executiveSummary"])
        self.assertTrue(out["paragraphs"])
        # disputed ebitda margin should surface as a caveat
        self.assertTrue(any("EBITDA margin" in d["field"] for d in out["disputes"]))

    def test_citations_collected_from_payload(self):
        with mock.patch.object(server, "ai_provider_lookup_config", return_value={}):
            out = server.synthesize_business_narrative(self._payload())
        urls = [c["url"] for c in out["citations"]]
        self.assertIn("https://example.com/lloyds", urls)
        self.assertEqual(out["citations"][0]["n"], 1)

    def test_empty_payload_is_safe(self):
        with mock.patch.object(server, "ai_provider_lookup_config", return_value={}):
            out = server.synthesize_business_narrative({})
        self.assertEqual(out["mode"], "template")
        self.assertTrue(out["executiveSummary"])


class CombinedSourceConfidenceTests(unittest.TestCase):
    """A merged source string must not lend its best provider's tier to every field."""

    MERGED = (
        "Perplexity company lookup; extracted structured fields from API result.; "
        "Yahoo Finance global company lookup; validate against annual report and market data.; "
        "Companies House public search; validate against annual report and market data."
    )

    def test_multi_provider_label_takes_the_weakest_tier(self):
        self.assertEqual(server.combined_source_confidence_level(self.MERGED), "medium")

    def test_single_authoritative_provider_stays_high(self):
        self.assertEqual(
            server.combined_source_confidence_level(
                "Yahoo Finance global company lookup; validate against annual report and market data."
            ),
            "high",
        )

    def test_google_drags_a_mixed_label_down_to_low(self):
        self.assertEqual(
            server.combined_source_confidence_level(
                "Google Search snippets; Yahoo Finance global company lookup"
            ),
            "low",
        )

    def test_backfilled_fields_use_the_combined_tier(self):
        result = {"revenue": "$94.83 billion (FY2025)", "ticker": "NASDAQ: TSLA", "source": self.MERGED}
        server.stamp_field_provenance(result)
        self.assertEqual(result["fieldSources"]["revenue"]["confidence"], "medium")
        self.assertEqual(result["fieldSources"]["ticker"]["confidence"], "medium")

    def test_merge_recorded_field_keeps_its_own_provider_tier(self):
        # A field the merge layer attributed is not touched by the backfill.
        result = {
            "revenue": "$1bn",
            "source": self.MERGED,
            "fieldSources": {"revenue": {"source": "SEC EDGAR companyfacts", "confidence": "high"}},
        }
        server.stamp_field_provenance(result)
        self.assertEqual(result["fieldSources"]["revenue"]["confidence"], "high")


if __name__ == "__main__":
    unittest.main()
