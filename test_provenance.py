"""Tests for field-level provenance (feature 1) and source precedence."""
import unittest

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


if __name__ == "__main__":
    unittest.main()
