import json
import re
import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).parent / "data" / "strategic_narrative.db"


def usable(value: object) -> bool:
    text = str(value or "").strip()
    return bool(text) and not re.fullmatch(
        r"(?:validate(?:\s+current\s+filing)?|revenue\s+pending|pending|unavailable|unknown|n/?a)",
        text,
        re.I,
    )


def main() -> None:
    repaired = 0
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            """
            SELECT value_cases.id, business_priorities.payload_json
            FROM value_cases
            JOIN business_priorities ON business_priorities.value_case_id = value_cases.id
            WHERE LOWER(value_cases.company_name) = 'aviva plc'
            """
        ).fetchall()
        for case_id, payload_json in rows:
            payload = json.loads(payload_json or "{}")
            snapshot = payload.setdefault("snapshot", {})
            trends = payload.get("financialTrends") if isinstance(payload.get("financialTrends"), list) else []
            latest_revenue = next(
                (row.get("revenue") for row in reversed(trends) if isinstance(row, dict) and usable(row.get("revenue"))),
                "",
            )
            snapshot.update(
                {
                    "industry": "Insurance",
                    "primaryIndustry": "Financial services",
                    "subSector": "Insurance, wealth and retirement",
                    "peerGroup": "insurance",
                }
            )
            if latest_revenue:
                snapshot["revenue"] = latest_revenue
            peers = payload.get("peers") if isinstance(payload.get("peers"), list) else []
            payload["peers"] = [
                peer
                for peer in peers
                if isinstance(peer, dict)
                and "hsbc" not in str(peer.get("company") or peer.get("name") or "").lower()
            ]
            conn.execute(
                "UPDATE business_priorities SET payload_json = ? WHERE value_case_id = ?",
                (json.dumps(payload, ensure_ascii=True), case_id),
            )
            conn.execute(
                "UPDATE value_cases SET ticker = 'AV.L', industry = 'Insurance' WHERE id = ?",
                (case_id,),
            )
            repaired += 1
    print(f"Repaired {repaired} Aviva value case(s).")


if __name__ == "__main__":
    main()
