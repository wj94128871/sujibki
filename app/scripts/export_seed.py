#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SQLite(loader 결과) → worker seed JSON 재생성.

주간 갱신 루틴의 마지막 단계:
  crawl → run_collection.py(적재+분석재계산) → 본 스크립트(seed export)
출력:
  app/worker/src/seed_projects.json  (MemoryDataSource 시드)
  app/worker/src/seed_runs.json
사용법:
  python export_seed.py [--db data/market_dashboard.db]
"""
from __future__ import annotations
import os, sys, json, argparse, sqlite3

DEFAULT_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "loader", "data", "market_dashboard.db")
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "worker", "src"))


def row_to_seed(r: sqlite3.Row) -> dict:
    raw = json.loads(r["raw_json"] or "{}")
    return {
        "id": f"{r['source']}:{r['runtime']}:{r['source_ref']}",
        "source": r["source"],
        "runtime": r["runtime"] or None,
        "title": r["title"],
        "category": r["category"],
        "budgetMin": r["budget_min"],
        "budgetMax": r["budget_max"],
        "budgetUnit": r["budget_unit"] or "KRW",
        "periodDays": r["period_days"],
        "region": r["region"],
        "workType": r["work_type"],
        "registeredAt": r["registered_at"],
        "deadline": r["deadline"],
        "applicants": r["applicants"],
        "sourceUrl": r["source_url"],
        "techKeywords": json.loads(r["tech_keywords"] or "[]"),
        "description": (raw.get("description") or None),
        "recruitCondition": (raw.get("recruit_condition") or None),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=DEFAULT_DB)
    args = ap.parse_args()
    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print("DB 없음:", db_path, file=sys.stderr)
        sys.exit(1)

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    projects = [row_to_seed(r) for r in con.execute(
        "SELECT * FROM projects ORDER BY source, runtime, source_ref")]
    runs = [dict(r) for r in con.execute(
        "SELECT id, source, runtime, status, total, success, failed, error,"
        " started_at as startedAt, finished_at as finishedAt FROM collection_runs ORDER BY id")]
    # 소스별 최신 런만 유지(중복 런 정리 — A2)
    seen_rt = set()
    runs_latest = []
    for r in reversed(runs):
        key = (r["source"], r["runtime"])
        if key not in seen_rt:
            seen_rt.add(key)
            runs_latest.append(r)
    runs_latest.reverse()
    # 키워드 성장률(최신 기간) — B1
    kw_period_row = con.execute(
        "SELECT period FROM analysis_keyword ORDER BY period DESC LIMIT 1").fetchone()
    keywords = []
    if kw_period_row:
        keywords = [dict(r) for r in con.execute(
            "SELECT keyword, cnt, prev_cnt as prevCnt, growth_rate as growthRate"
            " FROM analysis_keyword WHERE period = ? ORDER BY cnt DESC", (kw_period_row["period"],))]
    con.close()

    os.makedirs(OUT_DIR, exist_ok=True)
    p1 = os.path.join(OUT_DIR, "seed_projects.json")
    p2 = os.path.join(OUT_DIR, "seed_runs.json")
    with open(p1, "w", encoding="utf-8") as f:
        json.dump(projects, f, ensure_ascii=False)
    with open(p2, "w", encoding="utf-8") as f:
        json.dump(runs_latest, f, ensure_ascii=False)

    by_src: dict[str, int] = {}
    dated = 0
    for p in projects:
        by_src[p["source"]] = by_src.get(p["source"], 0) + 1
        if p["registeredAt"]:
            dated += 1
    print("seed 재생성 완료:", p1)
    print("  총 %d건 | 등록일 보유 %d건 (%.0f%%)" % (len(projects), dated, dated / max(len(projects), 1) * 100))
    print("  소스별:", json.dumps(by_src, ensure_ascii=False))
    print("  런 이력 %d건(최신만) | 키워드 %d건" % (len(runs_latest), len(keywords)))

    # 키워드 성장률 seed (B1) — 스냅샷 2회차부터 growthRate 채워짐
    p3 = os.path.join(OUT_DIR, "seed_keywords.json")
    with open(p3, "w", encoding="utf-8") as f:
        json.dump({"period": kw_period_row["period"] if kw_period_row else None,
                   "keywords": keywords}, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
