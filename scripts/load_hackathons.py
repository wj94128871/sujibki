#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
해커톤/챌린지 적재 진입점.
- 입력: crawled/_runs/hackathons_normalized.json (etl_hackathons.py 산출물)
- 변환: etl/parsers.from_hackathon → StandardProject
- 적재: SqliteAdapter(기본) / PostgresAdapter(PG_DSN env)
- 멱등 upsert = ON CONFLICT (source, runtime, source_ref) DO UPDATE
사용법:
  python load_hackathons.py                       # 기본 sqlite
  python load_hackathons.py --db /path/to.db
  PG_DSN=postgres://... python load_hackathons.py  # Neon 프로덕션
"""
from __future__ import annotations
import argparse, json, os, sys, time, logging

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
APP_LOADER = os.path.join(ROOT, "app", "loader")

# project root의 etl/과 app/loader/etl/이 이름 충돌. APP_LOADER를 sys.path[0]에 둔다.
# 단, 현재 cwd가 project root라면 Python은 sys.path[0]이 '\(empty string\)' = cwd라서
# 우리 etl/을 먼저 찾는다. 그래서 sys.path[0] 자리에 APP_LOADER를 강제 삽입.
sys.path.insert(0, APP_LOADER)
# 그리고 ROOT의 etl/이 import되지 않도록 ROOT가 sys.path[0]보다 뒤에 가게 한다.
# (이미 ROOT는 들어있지 않으므로 안전)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("load_hackathons")

from etl.parsers import from_hackathon  # app/loader/etl/parsers.py
from etl.store import SqliteAdapter, PostgresAdapter
from etl.piifilter import filter_dict, has_email


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default="crawled/_runs/hackathons_normalized.json")
    ap.add_argument("--db", default=os.path.join(APP_LOADER, "data", "market_dashboard.db"))
    args = ap.parse_args()

    if not os.path.exists(args.inp):
        log.error("입력 없음: %s (먼저 etl_hackathons.py 실행)", args.inp)
        sys.exit(1)
    data = json.load(open(args.inp, "r", encoding="utf-8"))
    items = data.get("items", [])
    log.info("입력: %d건", len(items))

    # DB 어댑터
    if os.environ.get("PG_DSN"):
        adapter = PostgresAdapter(os.environ["PG_DSN"])
        log.info("Postgres(Neon) 어댑터 사용")
    else:
        os.makedirs(os.path.dirname(args.db), exist_ok=True) if os.path.dirname(args.db) else None
        adapter = SqliteAdapter(args.db)
        log.info("Sqlite 어댑터 사용: %s", args.db)
    adapter.init_schema()

    # PII 필터 + StandardProject 변환
    projects = []
    pii_dropped = 0
    for it in items:
        if has_email(it.get("title", "") or "") or has_email(it.get("brief", "") or ""):
            pii_dropped += 1
        # PII sanitize
        sanitized = filter_dict(it)
        sp = from_hackathon(sanitized)
        sp.runtime = f"hackathon/{it.get('source','unknown')}"
        projects.append(sp)
    log.info("변환: %d건 (PII 포함 %d)", len(projects), pii_dropped)

    # 런 기록
    run_id = adapter.start_run("hackathon", runtime="hackathon", run_type="manual")
    log.info("런 시작 id=%d", run_id)

    try:
        written = adapter.upsert_projects(projects)
        adapter.finish_run(run_id, "success", total=len(projects),
                           success=len(projects), failed=0, error=None)
        log.info("적재 완료: %d건 (런 %d)", written, run_id)
    except Exception as e:
        adapter.finish_run(run_id, "failed", total=len(projects),
                           success=0, failed=len(projects), error=str(e))
        raise

    # 카운트
    total = adapter.count_projects("hackathon")
    log.info("hackathon 총 적재: %d건", total)


if __name__ == "__main__":
    main()
