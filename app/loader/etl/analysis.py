"""분석 재계산 (Epic2 · FR-06/07/08 · TC-22~29).
모든 함수는 순수(projects list → 분석 행/인사이트). SqliteAdapter로 집계 테이블 적재.
confidence 체계(TC-29): high/mid/low — 근거 데이터 규모·기간에 따라 산정, 단정 금지 표현은 UI에서 강제.
"""
from __future__ import annotations
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Optional
from .schema_std import StandardProject
from .store import DatabaseAdapter

PERIOD = datetime.now(timezone.utc).strftime("%Y-%m")


def _bucket_budget(v):
    """예산(원) → 구간 라벨. AC-06-2 히스토그램."""
    if v is None:
        return None
    m = v / 10_000  # 만원
    if m < 500:
        return "0-500만"
    if m < 1000:
        return "500-1000만"
    if m < 3000:
        return "1000-3000만"
    if m < 5000:
        return "3000-5000만"
    return "5000만+"


def _bucket_period(days):
    if days is None:
        return None
    if days < 30:
        return "1개월 미만"
    if days < 60:
        return "1-2개월"
    if days < 120:
        return "2-4개월"
    if days < 365:
        return "4-12개월"
    return "12개월+"


# ---------------- 1) 카테고리 점유율 (AC-06-1) ----------------
def category_share(projects: list[StandardProject], source: str = "*"):
    c = Counter((p.category or "기타") for p in projects)
    total = sum(c.values()) or 1
    rows = []
    for cat, cnt in c.most_common():
        rows.append({
            "source": source, "category": cat, "cnt": cnt,
            "share_pct": round(cnt / total * 100, 1),
            "prev_cnt": None, "growth": None, "period": PERIOD,
        })
    return rows


# ---------------- 2) 예산/기간 분포 (AC-06-2) ----------------
def budget_buckets(projects, source="*"):
    buckets = Counter()
    null_cnt = 0
    for p in projects:
        b = _bucket_budget(p.budget_min or p.budget_max)
        if b is None:
            null_cnt += 1
        else:
            buckets[b] += 1
    # null은 별도 카운트(AC-06-2: null 제외 + 건수 카운트 표기)
    rows = [{"source": source, "bucket": k, "cnt": v, "period": PERIOD} for k, v in buckets.items()]
    if null_cnt:
        rows.append({"source": source, "bucket": f"(null {null_cnt})", "cnt": null_cnt, "period": PERIOD})
    return rows


def period_buckets(projects, source="*"):
    buckets = Counter()
    null_cnt = 0
    for p in projects:
        b = _bucket_period(p.period_days)
        if b is None:
            null_cnt += 1
        else:
            buckets[b] += 1
    rows = [{"source": source, "bucket": k, "cnt": v, "period": PERIOD} for k, v in buckets.items()]
    if null_cnt:
        rows.append({"source": source, "bucket": f"(null {null_cnt})", "cnt": null_cnt, "period": PERIOD})
    return rows


# ---------------- 3) 상주 vs 도급 비중 (AC-06-3) ----------------
def work_type_share(projects, source="*"):
    c = Counter((p.work_type or "other") for p in projects)
    total = sum(c.values()) or 1
    return [{"source": source, "work_type": k, "cnt": v,
             "share_pct": round(v / total * 100, 1), "period": PERIOD} for k, v in c.most_common()]


# ---------------- 4) 키워드 랭킹·월간(AC-06-4) ----------------
def keyword_ranking(projects, source="*", top_n=30):
    from .normalize.keyword import normalize_keywords
    c = Counter()
    for p in projects:
        for k in normalize_keywords(p.tech_keywords or []):
            c[k] += 1
    rows = []
    for kw, cnt in c.most_common(top_n):
        rows.append({"source": source, "keyword": kw, "cnt": cnt,
                     "prev_cnt": None, "growth_rate": None, "period": PERIOD})
    return rows


# ---------------- 5) 월간 신규 등록 추이 (AC-06-5) ----------------
def monthly_trend(projects, source="*"):
    c = Counter()
    for p in projects:
        if not p.registered_at:
            continue
        try:
            month = datetime.fromisoformat(p.registered_at).strftime("%Y-%m")
        except ValueError:
            continue
        c[month] += 1
    return [{"month": m, "cnt": c[m]} for m in sorted(c)]


# ---------------- 6) 기능 개선 방향 (FR-07 · AC-07-1) ----------------
def feature_candidates(projects, source="*"):
    """수요 많고 공급 부족(=지원자 많은/레벨 높은) 신호 → 후보 도출."""
    by_cat = defaultdict(list)
    for p in projects:
        by_cat[(p.category or "기타")].append(p)
    rows = []
    for (cat, items), idx in zip(sorted(by_cat.items(), key=lambda kv: -len(kv[1])), range(10)):
        applicants = [p.applicants for p in items if p.applicants is not None]
        avg_app = round(sum(applicants) / len(applicants)) if applicants else None
        rows.append({
            "type": "feature", "title": f"{cat} — 수요·공급 신호",
            "body": f"{cat} 카테고리 안건 {len(items)}건 (평균 지원자 {avg_app if avg_app is not None else '정보 없음'}).",
            "metric": {"category": cat, "cnt": len(items), "avg_applicants": avg_app},
            "period": PERIOD,
            "confidence": "high" if len(items) >= 30 else ("mid" if len(items) >= 10 else "low"),
        })
    return rows


# ---------------- 7) 시장성 인사이트 (FR-08 · AC-08-1/2) ----------------
def market_insights(projects, source="*"):
    """고성장 카테고리·키워드. 성장률은 2시점 필요 → 현재 샘플은 '추이 미확인' low/mid 주석.
    단정 표현 금지(TC-29)는 body의 '~로 추정' 표현으로 반영."""
    shares = category_share(projects, source)
    rows = []
    for s in shares[:8]:
        confidence = "mid" if s["cnt"] >= 20 else "low"
        rows.append({
            "type": "market", "title": f"{s['category']} 수요 점유율 {s['share_pct']}%",
            "body": f"{s['category']} 카테고리가 전체의 {s['share_pct']}%로 추정(건수 {s['cnt']}). 단일 시점 데이터로 추이 미확인 — 추가 수집 후 재계산 필요.",
            "metric": {"category": s["category"], "cnt": s["cnt"], "share_pct": s["share_pct"]},
            "period": PERIOD, "confidence": confidence,
        })
    kws = keyword_ranking(projects, source, top_n=6)
    for k in kws:
        if k["cnt"] < 3:
            continue
        rows.append({
            "type": "keyword", "title": f"키워드 '{k['keyword']}' {k['cnt']}건",
            "body": f"기술 키워드 {k['keyword']}가 {k['cnt']}건에서 관찰됨(추정). 월간 변화는 데이터 누적 후 산출.",
            "metric": k, "period": PERIOD, "confidence": "low",
        })
    return rows


# ---------------- 재계산 진입점 ----------------
def keyword_rows_with_growth(adapter: DatabaseAdapter, projects, source: str, period: str):
    """키워드 랭킹 + 직전 스냅샷 대비 성장률. 현재 카운트는 이번 기간 스냅샷으로 저장."""
    rows = keyword_ranking(projects, source)
    prev = adapter.get_prev_keyword_snapshot(period)
    prev_map = (prev or {}).get("counts", {})
    enriched = []
    for r in rows:
        pc = prev_map.get(r["keyword"])
        gr = None
        if pc is not None and pc > 0:
            gr = round((r["cnt"] - pc) / pc * 100, 1)
        enriched.append({**r, "prev_cnt": pc, "growth_rate": gr})
    adapter.upsert_keyword_snapshots(
        [{"keyword": r["keyword"], "period": period, "cnt": r["cnt"]} for r in rows])
    return enriched


def recompute_analysis(adapter: DatabaseAdapter, source: str = "*"):
    """projects에서 분석 테이블·인사이트를 재계산해 적재. ADR-2 precompute."""
    projects = adapter.get_projects()
    kw_rows = keyword_rows_with_growth(adapter, projects, source, PERIOD)
    adapter.write_analysis("analysis_category", category_share(projects, source))
    adapter.write_analysis("analysis_budget", budget_buckets(projects, source) + period_buckets(projects, source))
    adapter.write_analysis("analysis_keyword", kw_rows)
    adapter.write_analysis("analysis_insights", feature_candidates(projects, source) + market_insights(projects, source))
    return {
        "category": len(category_share(projects, source)),
        "budget": len(budget_buckets(projects, source)),
        "keyword": len(kw_rows),
        "insights": len(feature_candidates(projects, source)) + len(market_insights(projects, source)),
    }
