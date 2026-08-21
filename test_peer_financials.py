import unittest
from unittest.mock import patch

import server


class PeerFinancialRegressionTests(unittest.TestCase):
    def test_market_research_peer_group_and_fallback(self) -> None:
        self.assertEqual(
            server.prominent_industry_peer_group({"industry": "Market research", "subSector": "Consumer insights"}),
            "market-research",
        )
        seeds = server.private_equity_public_peer_seeds("market-research")
        self.assertEqual(len(seeds), 5)
        self.assertTrue(all(row.get("ticker") for row in seeds))
        self.assertTrue(all(row.get("peerGroup") == "market-research" for row in seeds))
        self.assertTrue(all(not row.get("revenue") for row in seeds))

        requested = [{"company": "Kantar Group Limited", "peerGroup": "market-research"}]
        with (
            patch.object(server, "ai_provider_lookup_config", return_value={}),
            patch.object(server, "yahoo_profile_for_ticker", return_value={}),
            patch.object(server, "yahoo_company_lookup_results", return_value=[]),
        ):
            profiles, _stats = server.private_equity_peer_profiles(
                requested,
                company_name="Kantar Group Limited",
                industry="Market research",
                sub_sector="Market research and insights",
                peer_group="market-research",
            )
        names = {row.get("company") for row in profiles}
        self.assertIn("Kantar Group Limited", names)
        self.assertTrue({row.get("company") for row in seeds}.issubset(names))

    def test_hsbc_is_banking_not_insurance(self) -> None:
        hsbc = next(row for row in server.COMPANY_LOOKUP_FIXTURES if row.get("name") == "HSBC Holdings plc")
        self.assertEqual(server.prominent_industry_peer_group(hsbc), "financial-services")

    def test_aviva_peer_refresh_rejects_hsbc(self) -> None:
        requested = [
            {"company": "Aviva plc", "ticker": "AV.L", "peerGroup": "insurance"},
            {"company": "HSBC Holdings plc", "ticker": "HSBA.L", "peerGroup": "insurance"},
            {"company": "Legal & General Group plc", "ticker": "LGEN.L", "peerGroup": "insurance"},
        ]
        with (
            patch.object(server, "ai_provider_lookup_config", return_value={}),
            patch.object(server, "yahoo_profile_for_ticker", return_value={}),
            patch.object(server, "yahoo_company_lookup_results", return_value=[]),
        ):
            profiles, _stats = server.private_equity_peer_profiles(
                requested,
                company_name="Aviva plc",
                industry="Insurance",
                sub_sector="Insurance, wealth and retirement",
                peer_group="insurance",
            )
        names = {row.get("company") for row in profiles}
        self.assertIn("Aviva plc", names)
        self.assertIn("Legal & General Group plc", names)
        self.assertNotIn("HSBC Holdings plc", names)

    def test_fbd_saved_profile_is_enriched_from_official_results(self) -> None:
        enriched = server.enrich_saved_company_profile({
            "name": "FBD Holdings plc",
            "ticker": "EG7.L",
            "revenue": "",
            "annualRevenueUsd": "",
            "employees": "",
        })
        self.assertEqual(enriched["ticker"], "EG7.IR")
        self.assertEqual(enriched["revenue"], "EUR 486.8M")
        self.assertEqual(enriched["annualRevenueUsd"], "550084000")
        self.assertEqual(enriched["employees"], "900")
        self.assertEqual(enriched["fiscalYear"], "FY2025")
        self.assertEqual(len(enriched["sourceSnippets"]), 3)

    def test_cached_company_lookup_skips_external_providers(self) -> None:
        cached = [{
            "name": "Cached Company plc", "legalName": "Cached Company plc",
            "industry": "Insurance", "annualRevenueUsd": "750000000", "confidence": 90,
            "source": "Cached shared company lookup",
        }]
        with (
            patch.object(server, "cached_company_lookup_results", return_value=cached),
            patch.object(server, "perplexity_company_lookup_results") as perplexity,
            patch.object(server, "chatgpt_company_lookup_results") as chatgpt,
            patch.object(server, "global_company_lookup_results") as public_lookup,
        ):
            results = server.company_lookup_results("Cached Company")
        self.assertEqual(results[0]["name"], "Cached Company plc")
        perplexity.assert_not_called()
        chatgpt.assert_not_called()
        public_lookup.assert_not_called()

    def test_benchmarking_company_profile_is_reused(self) -> None:
        profile = {
            "name": "Benchmark Company plc", "industry": "Retail and Wholesale",
            "annualRevenueUsd": 500_000_000, "employees": "2500",
            "savedBenchmarkScenarioId": "benchmark-case-1",
        }
        with patch.object(server, "benchmarking_api_get", return_value={"matches": [profile]}):
            results = server.benchmarking_company_lookup_results("Benchmark Company")
        self.assertEqual(results[0]["name"], "Benchmark Company plc")
        self.assertEqual(results[0]["annualRevenueUsd"], "500000000")
        self.assertEqual(results[0]["savedBenchmarkScenarioId"], "benchmark-case-1")
        self.assertEqual(results[0]["sharedFrom"], "IT Spend Benchmarking Tool")

    def test_strategic_benefits_preserve_sources_and_group_outcomes(self) -> None:
        payload = {"priorityInsights": {"businessPriorities": [
            {"title": "Grow customer relationships", "summary": "Improve retention and cross-sell", "sources": [{"label": "Annual report", "url": "https://example.com/report"}]},
            {"title": "Improve operating efficiency", "summary": "Reduce cost and release capacity", "sources": []},
            {"title": "Strengthen cyber resilience", "summary": "Improve controls and continuity", "sources": []},
        ]}}
        benefits = server.strategic_benefits_from_payload(payload, "case-1", "2026-07-18T12:00:00Z")
        self.assertEqual([row["group"] for row in benefits], ["Revenue Growth", "Cost & Productivity", "Risk & Resilience"])
        self.assertEqual(benefits[0]["sources"][0]["label"], "Annual report")
        self.assertIn("excluded", benefits[0]["valueTreatment"])


if __name__ == "__main__":
    unittest.main()
