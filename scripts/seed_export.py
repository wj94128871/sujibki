#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sqlite (app/loader/data/market_dashboard.db) → Worker seed JSON 변환.
- 입력: sqlite DB
- 출력: app/worker/src/seed_projects.json (기존 형식 + hackathon 4635건 포함)
"""
from __future__ import annotations
import json, os, sqlite3, time, re

DB = os.environ.get("DB", "app/loader/data/market_dashboard.db")
OUT = os.environ.get("OUT", "app/worker/src/seed_projects.json")
OUT_RUNS = "app/worker/src/seed_runs.json"

# 필드 매핑
def row_to_item(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "source": r["source"],
        "runtime": r.get("runtime") or "",
        "title": r.get("title") or "",
        "category": r.get("category"),
        "categorySub": r.get("category_sub"),
        "budgetMin": r.get("budget_min"),
        "budgetMax": r.get("budget_max"),
        "budgetUnit": r.get("budget_unit") or "KRW",
        "periodDays": r.get("period_days"),
        "region": r.get("region"),
        "workType": r.get("work_type"),
        "role": r.get("role"),
        "level": r.get("level"),
        "techKeywords": r.get("tech_keywords") or [],
        "registeredAt": r.get("registered_at"),
        "deadline": r.get("deadline"),
        "applicants": r.get("applicants"),
        "sourceUrl": r.get("source_url") or "",
        "description": (r.get("description") or ""),
        "recruitCondition": (r.get("recruit_condition") or ""),
    }

def main() -> None:
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    rows = c.execute("SELECT * FROM projects").fetchall()
    print(f"DB rows: {len(rows)}")
    items = [row_to_item(dict(r)) for r in rows]
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False)
    print(f"  saved: {OUT} ({len(items)} items)")

    # collection_runs도 갱신
    runs = [dict(r) for r in c.execute("SELECT * FROM collection_runs ORDER BY id DESC LIMIT 50").fetchall()]
    # MemoryDataSource가 기대하는 형태로
    runs_norm = []
    for r in runs:
        runs_norm.append({
            "id": r["id"],
            "source": r["source"],
            "runtime": r.get("runtime") or "",
            "status": r.get("status") or "success",
            "total": r.get("total") or 0,
            "success": r.get("success") or 0,
            "failed": r.get("failed") or 0,
            "error": r.get("error"),
            "startedAt": r.get("started_at"),
            "finishedAt": r.get("finished_at"),
        })
    with open(OUT_RUNS, "w", encoding="utf-8") as f:
        json.dump(runs_norm, f, ensure_ascii=False, default=str)
    print(f"  saved: {OUT_RUNS} ({len(runs_norm)} runs)")

if __name__ == "__main__":
    main()
