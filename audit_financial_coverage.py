import json
import re
import sqlite3
import sys
from pathlib import Path


DB_PATH = Path(__file__).parent / "data" / "strategic_narrative.db"
FIELDS = (
    "revenue",
    "employees",
    "priorEmployees",
    "ebitda",
    "totalAssets",
    "netProfit",
    "freeCashFlow",
    "netDebt",
    "forecastRevenueUsd",
)


def missing(value: object) -> bool:
    text = str(value or "").strip()
    return not text or bool(
        re.fullmatch(
            r"(?:validate(?:\s+current\s+filing)?|revenue\s+pending|pending|unavailable|unknown|n/?a)",
            text,
            re.I,
        )
    )


def first_value(row: dict, field: str) -> object:
    aliases = {
        "revenue": ("revenue", "annualRevenueUsd"),
        "ebitda": ("ebitda", "ebitdaUsd"),
        "totalAssets": ("totalAssets", "totalAssetsUsd"),
        "freeCashFlow": ("freeCashFlow", "freeCashFlowUsd"),
        "netDebt": ("netDebt", "netDebtUsd"),
    }
    for key in aliases.get(field, (field,)):
        if not missing(row.get(key)):
            return row.get(key)
    return ""


def gaps(row: dict) -> list[str]:
    return [field for field in FIELDS if missing(first_value(row, field))]


def main() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        if "--providers" in sys.argv:
            providers = conn.execute(
                """
                SELECT provider, enabled, use_for_company_lookup, model, endpoint_url,
                       CASE WHEN LENGTH(COALESCE(api_key, '')) > 0 THEN 1 ELSE 0 END AS has_key
                FROM ai_provider_configs
                ORDER BY priority_order, provider
                """
            ).fetchall()
            print(
                json.dumps(
                    [
                        {
                            "provider": row[0],
                            "enabled": bool(row[1]),
                            "lookup_enabled": bool(row[2]),
                            "model": row[3] or "",
                            "endpoint": row[4] or "",
                            "has_stored_key": bool(row[5]),
                        }
                        for row in providers
                    ],
                    indent=2,
                )
            )
            return
        rows = conn.execute(
            """
            SELECT value_cases.company_name, value_cases.industry, business_priorities.payload_json
            FROM value_cases
            LEFT JOIN business_priorities ON business_priorities.value_case_id = value_cases.id
            ORDER BY value_cases.company_name
            """
        ).fetchall()

    report = []
    for company_name, industry, payload_json in rows:
        try:
            payload = json.loads(payload_json or "{}")
        except json.JSONDecodeError:
            payload = {}
        snapshot = payload.get("snapshot") if isinstance(payload.get("snapshot"), dict) else {}
        peers = payload.get("peers") if isinstance(payload.get("peers"), list) else []
        report.append(
            {
                "company": company_name,
                "industry": snapshot.get("peerGroup") or snapshot.get("subSector") or snapshot.get("industry") or industry,
                "company_gaps": gaps(snapshot),
                "peer_gaps": [
                    {
                        "company": peer.get("company") or peer.get("name") or "Unnamed peer",
                        "gaps": gaps(peer),
                    }
                    for peer in peers
                    if isinstance(peer, dict)
                ],
            }
        )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
