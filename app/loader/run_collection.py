#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MVP 수동 수집·적재 wrapper (Epic1 · FR-02 · tasks T1.3.2).
로컬 검증 기본은 SqliteAdapter(APP_LOADER_DB), 프로덕션은 PG_DSN 환경변수로 PostgresAdapter.
유의: 크롤러는 venv A/B 격리 — 실제 전체 수집은 개발 단계에서 각 소스별 실행(인계서 방침,
코딩 §3.2). 여기서는 (a) 이미 수집된 crawled/ 샘플을 적재 + (b) 분석 재계산을 기본 수행.
"""
from __future__ import annotations
import os, sys, json, argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from etl.pipeline import load_all_samples
from etl.analysis import recompute_analysis
from etl.store import SqliteAdapter, PostgresAdapter

DEFAULT_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "market_dashboard.db")
CRAWLED = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "crawled"))


def main():
    ap = argparse.ArgumentParser(description="시장조사 대시보드 수집·적재·분석 wrapper")
    ap.add_argument("--crawled", default=CRAWLED)
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--limit", type=int, default=None, help="소스별 샘플 견본 수 제한(테스트)")
    ap.add_argument("--analysis-only", action="store_true")
    ap.add_argument("--init", action="store_true", help="DB 스키마 초기화")
    args = ap.parse_args()

    if os.environ.get("PG_DSN"):
        adapter = PostgresAdapter(os.environ["PG_DSN"])
    else:
        os.makedirs(os.path.dirname(args.db), exist_ok=True) if os.path.dirname(args.db) else None
        adapter = SqliteAdapter(args.db)
    adapter.init_schema()

    if not args.analysis_only:
        limits = {"u300/current": args.limit, "u300/past1": args.limit} if args.limit else None
        report = load_all_samples(adapter, args.crawled, limits)
        print("=== 수집·적재 리포트 ===")
        for k, v in report.items():
            print(f"  {k:14s} total={v['total']} success={v['success']} failed={v['failed']} status={v['status']}")

    print("=== 분석 재계산 ===")
    counts = recompute_analysis(adapter)
    print("  category rows:", counts["category"], "| budget rows:", counts["budget"],
          "| keyword rows:", counts["keyword"], "| insights:", counts["insights"])

    print("=== 수집 이력(collection_runs) ===")
    for r in adapter.get_collection_runs(limit=10):
        print(f"  [{r['id']}] {r['source']} {r['runtime']} status={r['status']} "
              f"total={r['total']} success={r['success']}")

    print("=== 프로젝트 총계 ===")
    for src in ("wishket", "freemoa", "u300", "devpost"):
        print(f"  {src}: {adapter.count_projects(src)}")
    print("  TOTAL:", adapter.count_projects())
    print("DB:", args.db)


if __name__ == "__main__":
    main()
