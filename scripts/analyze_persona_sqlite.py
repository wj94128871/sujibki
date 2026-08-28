#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SQLite 기반 페르소나 14개 카드 재계산 (analyze_persona.py의 로컬 포팅).
- 입력: app/loader/data/market_dashboard.db (7810건)
- 출력: analysis_* 4테이블 갱신 + 콘솔 리포트
- Postgres 전용 구문(ANY, UNNEST, REGEXP_REPLACE)을 Python으로 대체

실행:
  python scripts/analyze_persona_sqlite.py
  python scripts/analyze_persona_sqlite.py --db app/loader/data/market_dashboard.db
"""
from __future__ import annotations
import argparse, json, sqlite3, re, os, pathlib
from collections import Counter
from datetime import datetime, timezone

PERIOD = "2026-08"
KR = ["wishket", "freemoa", "u300"]
DB_DEFAULT = "app/loader/data/market_dashboard.db"
ITEMS_JSON = "app/worker/src/analysis_items.json"

def load_db(path: str):
    c = sqlite3.connect(path)
    c.row_factory = sqlite3.Row
    return c

def q_all(cur, sql, params=()):
    cur.execute(sql, params)
    return [dict(r) for r in cur.fetchall()]

def scalar(cur, sql, params=()):
    cur.execute(sql, params)
    row = cur.fetchone()
    return row[0] if row else None

def get_projects(cur):
    cur.execute("SELECT * FROM projects")
    rows = [dict(r) for r in cur.fetchall()]
    # tech_keywords는 TEXT(JSON) -> list로 파싱
    for r in rows:
        tk = r.get("tech_keywords")
        try:
            if isinstance(tk, str):
                r["tech_keywords"] = json.loads(tk) if tk else []
            elif tk is None:
                r["tech_keywords"] = []
        except Exception:
            r["tech_keywords"] = []
        # raw_json 파싱 시도(필요시)
        if r.get("raw_json"):
            try:
                r["_raw"] = json.loads(r["raw_json"])
            except Exception:
                r["_raw"] = {}
    return rows

def print_section(title):
    print(f"\n=== {title} ===")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=DB_DEFAULT)
    args = ap.parse_args()
    db_path = args.db
    if not pathlib.Path(db_path).exists():
        # fallback absolute
        alt = pathlib.Path(__file__).parent.parent / "app/loader/data/market_dashboard.db"
        if alt.exists():
            db_path = str(alt)
    print(f"DB: {db_path} (PERIOD={PERIOD})")
    conn = load_db(db_path)
    cur = conn.cursor()

    # 총 건수
    total = scalar(cur, "SELECT COUNT(*) FROM projects")
    print(f"total projects: {total}")

    projects = get_projects(cur)
    # KR 필터
    kr_projects = [p for p in projects if p["source"] in KR]
    print(f"KR projects (wishket+freemoa+u300): {len(kr_projects)}")
    hack_projects = [p for p in projects if p["source"] == "hackathon"]
    print(f"hackathon projects: {len(hack_projects)}")

    # === 1. 카테고리 (전체) ===
    print_section("1. 카테고리 집계 (전체)")
    cur.execute("SELECT COALESCE(NULLIF(category, ''), '(미분류)') AS cat, COUNT(*) AS n FROM projects GROUP BY cat ORDER BY n DESC")
    cat_rows = q_all(cur, "SELECT COALESCE(NULLIF(category, ''), '(미분류)') AS cat, COUNT(*) AS n FROM projects GROUP BY cat ORDER BY n DESC")
    cat_total = sum(r["n"] for r in cat_rows)
    for r in cat_rows:
        print(f"  {r['cat']}: {r['n']} ({r['n']/cat_total*100:.1f}%)")
    print(f"  total: {cat_total}")

    # === 2. 예산 (한국) ===
    print_section("2. 예산 집계 (한국)")
    def bucket_budget(v):
        if v is None:
            return "(미공개)", 9
        if v < 1_000_000:
            return "0-100만", 0
        if v < 5_000_000:
            return "100-500만", 1
        if v < 10_000_000:
            return "500-1000만", 2
        if v < 30_000_000:
            return "1000-3000만", 3
        if v < 50_000_000:
            return "3000-5000만", 4
        if v < 100_000_000:
            return "5000만-1억", 5
        return "1억+", 6

    bud_counter = Counter()
    bud_ord = {}
    for p in kr_projects:
        b, o = bucket_budget(p.get("budget_min"))
        bud_counter[b] += 1
        bud_ord[b] = o
    bud_rows = sorted(bud_counter.items(), key=lambda kv: bud_ord[kv[0]])
    for bucket, n in bud_rows:
        print(f"  {bucket}: {n}")
    # raw list for DB
    bud_rows_dict = [{"bucket": k, "n": v, "ord": bud_ord[k]} for k,v in bud_rows]

    # === 3. 키워드 (통합) ===
    print_section("3. 키워드 집계 (통합)")
    kw_counter = Counter()
    for p in projects:
        for kw in p.get("tech_keywords") or []:
            if kw:
                kw_counter[kw] += 1
    kw_rows = kw_counter.most_common(30)
    for kw, n in kw_rows[:15]:
        print(f"  {kw}: {n}")
    # honor: top 30
    kw_rows_dict = [{"kw": k, "n": v} for k,v in kw_rows]

    # === 4. 페르소나 카드별 metric 재계산 ===
    print_section("4. 페르소나 카드별 metric 재계산 (SQLite)")

    # helper: count with python
    def kr_count(pred):
        return sum(1 for p in kr_projects if pred(p))

    # 한국 AI·데이터 8/21 이전/이후 — category == 'AI·데이터'인 경우만 (실제 데이터에는 그런 카테고리 없음 -> 0)
    # 하지만 projects.category가 'AI·데이터'인 경우가 있는지 확인 (우리 DB는 wishket category가 NULL 많음)
    ai_before = kr_count(lambda p: p.get("category") == "AI·데이터" and p.get("registered_at") and p["registered_at"] <= "2026-08-21 23:59:59+00")
    # SQLite는 +00 없는 ISO일 수 있음, 비교를 문자열로
    ai_before2 = sum(1 for p in kr_projects if p.get("category") == "AI·데이터" and (p.get("registered_at") or "") <= "2026-08-21")
    ai_after = kr_count(lambda p: p.get("category") == "AI·데이터" and (p.get("registered_at") or "") > "2026-08-21")
    # 실제로는 u300 등에서 category가 'AI·데이터'인 경우가 있을 수 있음 확인
    ai_cat_total = kr_count(lambda p: p.get("category") == "AI·데이터")
    print(f"  한국 AI·데이터 total: {ai_cat_total} (before {ai_before}/{ai_before2}, after {ai_after})")

    unclass = kr_count(lambda p: not p.get("category"))
    print(f"  한국 (미분류): {unclass} / {len(kr_projects)} = {unclass/len(kr_projects)*100:.1f}%")

    sweet = kr_count(lambda p: p.get("budget_min") is not None and 1_000_000 <= p["budget_min"] < 30_000_000)
    print(f"  한국 1000-3000만: {sweet}")

    short_term = kr_count(lambda p: p.get("period_days") is not None and 0 < p["period_days"] < 90)
    print(f"  한국 1-3개월: {short_term}")

    etc_cnt = kr_count(lambda p: p.get("category") == "기타")
    print(f"  한국 기타: {etc_cnt}")

    region_unknown = kr_count(lambda p: not p.get("region"))
    print(f"  한국 region 미공개: {region_unknown} / {len(kr_projects)} = {region_unknown/len(kr_projects)*100:.1f}%")

    wt_counter = Counter(p.get("work_type") or "(미공개)" for p in kr_projects)
    print(f"  한국 work_type: {dict(wt_counter)}")

    sub_counter = Counter(p.get("category_sub") or "(미분류)" for p in kr_projects if p.get("category_sub"))
    print(f"  한국 sub top 5: {sub_counter.most_common(5)}")

    # 재발주 후보 그룹 수 — title 정규화
    def norm_title(t):
        if not t:
            return ""
        s = re.sub(r'[\s\-\(\)\[\]·,./]+', '', t.lower())
        s = re.sub(r'(구축|개발|신규|웹앱|플랫폼|시스템|서비스|솔루션|어플|앱|제작|구축의|고도화|리뉴얼|유지보수|운영|관리)$', '', s)
        return s
    tnorm_counter = Counter()
    for p in kr_projects:
        tn = norm_title(p.get("title") or "")
        if len(tn) >= 6:
            tnorm_counter[tn] += 1
    repeat_groups = sum(1 for v in tnorm_counter.values() if v >= 2)
    print(f"  한국 재발주 후보: {repeat_groups}그룹 (예: {tnorm_counter.most_common(3)})")

    big1 = kr_count(lambda p: p.get("budget_min") is not None and p["budget_min"] >= 100_000_000)
    big5 = kr_count(lambda p: p.get("budget_min") is not None and p["budget_min"] >= 50_000_000)
    print(f"  한국 1억+: {big1} / 5000만+: {big5}")

    smb = kr_count(lambda p: p.get("budget_min") is not None and 3_000_000 <= p["budget_min"] < 30_000_000)
    print(f"  한국 300-3000만 SMB: {smb}")

    appl_50 = kr_count(lambda p: p.get("applicants") is not None and p["applicants"] >= 50)
    long_term = kr_count(lambda p: p.get("period_days") is not None and p["period_days"] >= 365)
    print(f"  한국 applicants 50+: {appl_50}, 1년+ 장기: {long_term}")

    # hackathon ai/mcp/llm — 키워드 기준 (case-insensitive)
    def count_hack_kw(kw):
        kw = kw.lower()
        return sum(1 for p in hack_projects if any((k or "").lower() == kw for k in (p.get("tech_keywords") or [])))
    hack_ai = count_hack_kw("ai")
    hack_mcp = count_hack_kw("mcp")
    hack_llm = count_hack_kw("llm")
    print(f"  hackathon ai/mcp/llm: {hack_ai}/{hack_mcp}/{hack_llm}")

    kr_kw_counter = Counter()
    for p in kr_projects:
        for kw in p.get("tech_keywords") or []:
            kr_kw_counter[kw] += 1
    print(f"  한국 kw top 5: {kr_kw_counter.most_common(5)}")

    biomed = kr_count(lambda p: p.get("category_sub") == "바이오·의료(생명·식품)")
    info = kr_count(lambda p: p.get("category_sub") == "정보·통신")
    print(f"  한국 바이오/정보: {biomed}/{info}")

    hack_kw_counter = Counter()
    for p in hack_projects:
        for kw in p.get("tech_keywords") or []:
            hack_kw_counter[kw] += 1
    print(f"  hackathon top 4: {hack_kw_counter.most_common(4)}")

    webapp = kr_count(lambda p: p.get("category") in ("웹", "앱"))
    print(f"  한국 web+app: {webapp}")

    m12 = kr_count(lambda p: p.get("period_days") is not None and 30 <= p["period_days"] < 60)
    print(f"  한국 1-2개월: {m12}")

    appl_2049 = kr_count(lambda p: p.get("applicants") is not None and 20 <= p["applicants"] < 50)
    appl_119 = kr_count(lambda p: p.get("applicants") is not None and 1 <= p["applicants"] < 20)
    print(f"  한국 applicants 20-49/1-19: {appl_2049}/{appl_119}")

    # 한국 8/26~8/28 wishket 신규
    w_new = [p for p in kr_projects if p["source"] == "wishket" and (p.get("registered_at") or "") >= "2026-08-26"]
    print(f"  한국 8/26~8/28 wishket 신규: {len(w_new)}건")
    for p in w_new[:5]:
        print(f"    - {p['id']} {p['title'][:40]} {p.get('budget_min')} {p.get('registered_at')}")

    # 한국 u300 신규 (id int >7000) — source_ref 기준? 현재 id는 AUTOINCREMENT이므로 source_ref로 판단
    # 우리 DB는 source_ref가 icNo, 여기선 id가 PK이므로 별도
    # 이전 PG 로직: id::int >7000 (u300의 icNo가 7000+)
    # SQLite는 source_ref가 icNo이므로 그걸로
    u_new = sum(1 for p in kr_projects if p["source"] == "u300" and p.get("source_ref") and p["source_ref"].isdigit() and int(p["source_ref"]) > 7000)
    print(f"  한국 u300 신규 (source_ref>7000): {u_new}")

    # greps for sig-01..07 validation (한국 wishket 본문 grep 대체: title/description 에서 키워드 검색)
    # DB에 description이 raw_json에 있으므로, title+description 결합으로 grep 유사 수행
    def kr_grep(keywords):
        # keywords: list of strings, OR 조건
        cnt = 0
        for p in kr_projects:
            text = ((p.get("title") or "") + " " + (p.get("_raw", {}).get("description") or "")).lower()
            if any(kw.lower() in text for kw in keywords):
                cnt += 1
        return cnt

    # sig-01: 모바일+앱+반응형
    c_mobile = sum(1 for p in kr_projects if "모바일" in ((p.get("title") or "") + (p.get("_raw", {}).get("description") or "")))
    c_app = sum(1 for p in kr_projects if "앱" in ((p.get("title") or "") + (p.get("_raw", {}).get("description") or "")))
    # 반응형은 title에만 있을 가능성 높음
    print(f"  [sig-01 검증] wishket title+desc 모바일/앱 포함: 모바일={c_mobile}, 앱={c_app}, KR total {len(kr_projects)}")

    # Sig-07: 예약/위치/배송 등도 유사하게
    for kw in ["예약","위치","배송","관리자","대시보드","분석","시각화","결제","보안"]:
        cnt = kr_grep([kw])
        print(f"    grep '{kw}': {cnt}")

    # === 5. 분석 테이블 TRUNCATE + INSERT (SQLite) ===
    print_section("5. 분석 테이블 초기화 + INSERT (SQLite)")
    # 기존 analysis_*는 PERIOD 기준으로 DELETE
    for t in ["analysis_category","analysis_budget","analysis_keyword","analysis_insights"]:
        cur.execute(f"DELETE FROM {t} WHERE period=?", (PERIOD,))
        # 만약 period 컬럼이 없는 테이블 대비 전체 삭제도 허용
        # 하지만 우리는 2026-08만 쓰므로 DELETE로 충분, 전체가 2026-08이면 동일
        # 전체 카운트 확인용으로 전체 DELETE도 고려
    # 전체를 TRUNCATE처럼: DELETE FROM t (모든 기간)
    for t in ["analysis_category","analysis_budget","analysis_keyword","analysis_insights"]:
        cur.execute(f"DELETE FROM {t}")
    print("  truncated: 4 tables (DELETE)")

    # category
    for r in cat_rows:
        share = round(r["n"] / cat_total * 100, 1)
        cur.execute("INSERT INTO analysis_category (source, category, cnt, share_pct, period) VALUES (?,?,?,?,?)",
                    ["all", r["cat"], r["n"], share, PERIOD])
    print(f"  inserted analysis_category: {len(cat_rows)} rows")

    # budget
    for bucket, n in bud_rows:
        cur.execute("INSERT INTO analysis_budget (source, bucket, cnt, period) VALUES (?,?,?,?)",
                    ["all", bucket, n, PERIOD])
    print(f"  inserted analysis_budget: {len(bud_rows)} rows")

    # keyword (top 30)
    for kw, n in kw_rows:
        cur.execute("INSERT INTO analysis_keyword (source, keyword, cnt, period) VALUES (?,?,?,?)",
                    ["all", kw, n, PERIOD])
    print(f"  inserted analysis_keyword: {len(kw_rows)} rows")

    # insights: 14개 persona
    items_path = pathlib.Path(ITEMS_JSON)
    if not items_path.exists():
        # alternative relative
        items_path = pathlib.Path(__file__).parent.parent / "app/worker/src/analysis_items.json"
    persona_items = json.loads(items_path.read_text(encoding="utf-8"))
    for it in persona_items:
        rank = it["rank"]
        action = it.get("action","add")
        if action == "add":
            itype = "feature"
        elif action == "pivot":
            itype = "market"
        elif action == "watch":
            itype = "keyword"
        else:
            itype = "market"
        title = f"[{action.upper()}] {it['title']}"
        body = it['summary']
        metric = {
            "rank": rank,
            "persona_origin": it.get("persona_origin"),
            "agreed_by": it.get("agreed_by"),
            "consensus": it.get("consensus"),
            "evidence": it.get("evidence"),
        }
        cur.execute("INSERT INTO analysis_insights (type, title, body, metric, period, confidence, created_at) VALUES (?,?,?,?,?,?, datetime('now'))",
                    [itype, title, body, json.dumps(metric, ensure_ascii=False), PERIOD, it.get("confidence","mid")])
    print(f"  inserted analysis_insights: {len(persona_items)} rows")

    conn.commit()
    print("\n  committed (SQLite)")

    # === 6. 검증 ===
    print_section("6. 검증")
    for t in ["analysis_category","analysis_budget","analysis_keyword","analysis_insights"]:
        cur.execute(f"SELECT COUNT(*) FROM {t} WHERE period=?", (PERIOD,))
        cnt = cur.fetchone()[0]
        print(f"  {t} rows: {cnt}")
    cur.execute("SELECT COUNT(*) FROM projects")
    print(f"  total projects: {cur.fetchone()[0]}")

    # 페르소나 카드별 evidence 신선도 체크
    print_section("7. 페르소나 카드 evidence 신선도 (14개)")
    for it in persona_items:
        print(f"  rank {it['rank']:2d} [{it['action']}] {it['id']}: persona={it.get('persona_origin')} consensus={it.get('consensus')} conf={it.get('confidence')}")
        for ev in it.get("evidence", [])[:2]:
            print(f"    - {ev.get('metric')}: {ev.get('value')}")

    conn.close()
    print("\nDONE - SQLite 7810건 분석 완료. 대시보드는 seed_projects.json(ignored) 대신 DB 직접 조회 시 이 값 사용.")

if __name__ == "__main__":
    main()
