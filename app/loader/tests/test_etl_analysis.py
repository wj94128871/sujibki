# -*- coding: utf-8 -*-
"""Epic1 적재·멱등(TC-15)·파이프라인 통합 테스트 (실제 crawled 샘플)."""
import os, pytest
from etl.store import SqliteAdapter
from etl.pipeline import collect_all, load_all_samples, apply_pii_filter, CRAWLED_DFLT
from etl.analysis import (category_share, budget_buckets, work_type_share,
                          keyword_ranking, monthly_trend, feature_candidates,
                          market_insights, recompute_analysis)
from etl.piifilter import has_email

CRAWLED = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "crawled"))


@pytest.fixture
def db():
    a = SqliteAdapter(":memory:")
    a.init_schema()
    return a


def test_collect_all_returns_sources():
    col = collect_all(CRAWLED, {"u300/current": 3, "u300/past1": 3})
    assert set(col) == {"wishket", "freemoa", "u300/current", "u300/past1", "devpost"}
    assert col["freemoa"]  # list_1.json 존재
    assert len(col["u300/current"]) == 3
    assert len(col["u300/past1"]) == 3
    assert col["devpost"]  # meta.json detail
    # wishket: 2026-08-21 전체 수집 완료(wishket_oauth) — 실데이터 존재 확인
    assert isinstance(col["wishket"], list) and len(col["wishket"]) > 0


def test_no_pii_in_collected():
    col = collect_all(CRAWLED, {"u300/current": 2, "u300/past1": 2})
    for key, projs in col.items():
        if not projs:
            continue
        clean = apply_pii_filter(projs)
        for p in clean:
            assert has_email(p.raw) is False
            assert "client_id" not in str(p.raw).lower()


def test_upsert_idempotent_tc15(db):
    col = collect_all(CRAWLED, {"u300/current": 2, "u300/past1": 2, "devpost": 4})
    allp = [p for v in col.values() for p in v]
    # tmp -> sqlite는 memory로 idempotency 검증
    n1 = db.upsert_projects(allp)
    db2count = db.count_projects()
    # 재실행(같은 키) → 행 증가 없음(TC-15)
    n2 = db.upsert_projects(allp)
    assert db.count_projects() == db2count  # 중복 적재 0


def test_load_all_samples_records_runs(db):
    report = load_all_samples(db, CRAWLED, {"u300/current": 2, "u300/past1": 2})
    runs = db.get_collection_runs()
    assert runs, "런 기록 존재"
    statuses = {r["status"] for r in runs}
    assert statuses <= {"success", "partial", "failed"}


def test_normalized_projects_have_std_fields(db):
    col = collect_all(CRAWLED, {"u300/current": 2, "u300/past1": 2, "devpost": 4})
    for projs in col.values():
        for p in projs:
            assert p.source_url
            assert p.group_type in ("si_contract", "startup", "hackathon")


def test_category_share_insights(db):
    projs = [p for v in collect_all(CRAWLED, {"u300/current": 5, "u300/past1": 5, "devpost": 4}).values() for p in v]
    rows = category_share(projs)
    assert rows and abs(sum(r["share_pct"] for r in rows) - 100) < 1.5
    insights = market_insights(projs)
    assert insights and all(i["confidence"] in ("high", "mid", "low") for i in insights)
    feats = feature_candidates(projs)
    assert feats and all(isinstance(f["metric"], dict) for f in feats)


def test_recompute_analysis_writes_tables(db):
    load_all_samples(db, CRAWLED, {"u300/current": 3, "u300/past1": 3})
    counts = recompute_analysis(db)
    assert counts["category"] >= 1
    assert counts["insights"] >= 1


# ---------------- [2026-08-25] B1: 키워드 스냅샷·성장률 ----------------
def _mk_project(keywords):
    from etl.schema_std import StandardProject
    return StandardProject(source="wishket", source_ref="t-%s" % str(abs(hash(tuple(keywords))))[:8],
                           group_type="si_contract", title="t", tech_keywords=keywords,
                           source_url="https://x")


def test_keyword_growth_from_prev_snapshot(db):
    from etl.analysis import keyword_ranking, keyword_rows_with_growth
    # 직전 기간(2026-07) 스냅샷 수동 적재
    db.upsert_keyword_snapshots([
        {"keyword": "react", "period": "2026-07", "cnt": 10},
        {"keyword": "rag", "period": "2026-07", "cnt": 4},
    ])
    projects = [_mk_project(["React"]) for _ in range(15)] + [_mk_project(["rag"]) for _ in range(6)]
    rows = keyword_rows_with_growth(db, projects, "*", "2026-08")
    by_kw = {r["keyword"]: r for r in rows}
    assert by_kw["react"]["cnt"] == 15
    assert by_kw["react"]["prev_cnt"] == 10
    assert by_kw["react"]["growth_rate"] == 50.0   # (15-10)/10*100
    assert by_kw["rag"]["growth_rate"] == 50.0     # (6-4)/4*100
    # 신규 키워드(prev 없음)는 None
    assert by_kw.get("python", {}).get("prev_cnt") in (None, 0)


def test_keyword_growth_first_period_is_null(db):
    from etl.analysis import keyword_rows_with_growth
    projects = [_mk_project(["vue"]) ]
    rows = keyword_rows_with_growth(db, projects, "*", "2026-08")
    assert rows[0]["prev_cnt"] is None and rows[0]["growth_rate"] is None
    # 스냅샷 저장 확인
    prev = db.get_prev_keyword_snapshot("2026-09")
    assert prev["period"] == "2026-08" and prev["counts"]["vue"] == 1
