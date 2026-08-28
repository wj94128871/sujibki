#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
페르소나 14개 카드 metric을 실제 Neon 7,810건(2026-08, hackathon 4635+devpost 2400+u300 417+wishket 314+freemoa 44)에서 직접 재계산.
4개 분석 테이블(analysis_category/budget/keyword/insights)을 TRUNCATE 후 INSERT.
- 2026-08 기준 14개로 축소(기존 18개 중 중복/저신호 4개 통합, sig-01~14)
- persona_origin/agreed_by/consensus는 app/worker/src/analysis_items.json에 기록

실행:
  PG_DSN=... python3 scripts/analyze_persona.py
"""
import os, json, sys
import psycopg

DSN = os.environ.get('PG_DSN')
if not DSN:
    print('PG_DSN 환경변수 필요', file=sys.stderr); sys.exit(1)
PERIOD = "2026-08"
KR = ["wishket", "freemoa", "u300", "idea"]

def q(sql, args=None):
    with psycopg.connect(DSN, connect_timeout=10) as c:
        with c.cursor() as cur:
            cur.execute(sql, args or ())
            cols = [d.name for d in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]

def scalar(sql, args=None):
    with psycopg.connect(DSN, connect_timeout=10) as c:
        with c.cursor() as cur:
            cur.execute(sql, args or ())
            return cur.fetchone()[0]

# === 1. 카테고리 (전체) ===
print("=== 카테고리 집계 ===")
cat_rows = q("""
    SELECT COALESCE(NULLIF(category, ''), '(미분류)') AS cat, COUNT(*) AS n
    FROM projects GROUP BY 1 ORDER BY n DESC;
""")
cat_total = sum(r['n'] for r in cat_rows)
print(f"  total: {cat_total}")

# === 2. 예산 (한국) ===
print("\n=== 예산 집계 (한국) ===")
bud_rows = q("""
    WITH b AS (
      SELECT
        CASE
          WHEN budget_min IS NULL THEN '(미공개)'
          WHEN budget_min < 1000000 THEN '0-100만'
          WHEN budget_min < 5000000 THEN '100-500만'
          WHEN budget_min < 10000000 THEN '500-1000만'
          WHEN budget_min < 30000000 THEN '1000-3000만'
          WHEN budget_min < 50000000 THEN '3000-5000만'
          WHEN budget_min < 100000000 THEN '5000만-1억'
          ELSE '1억+'
        END AS bucket,
        CASE
          WHEN budget_min IS NULL THEN 9
          WHEN budget_min < 1000000 THEN 0
          WHEN budget_min < 5000000 THEN 1
          WHEN budget_min < 10000000 THEN 2
          WHEN budget_min < 30000000 THEN 3
          WHEN budget_min < 50000000 THEN 4
          WHEN budget_min < 100000000 THEN 5
          ELSE 6
        END AS ord
      FROM projects WHERE source = ANY(%s)
    )
    SELECT bucket, COUNT(*) AS n FROM b GROUP BY bucket, ord ORDER BY ord;
""", [KR])

# === 3. 키워드 (통합) ===
print("\n=== 키워드 집계 (통합) ===")
kw_rows = q("""
    SELECT kw, COUNT(*) AS n
    FROM projects, UNNEST(tech_keywords) AS kw
    GROUP BY 1 ORDER BY n DESC, kw ASC LIMIT 30;
""")

# === 4. 페르소나 카드 evidence용 metric ===
print("\n=== 페르소나 카드별 metric 재계산 ===")

# 한국 AI·데이터 8/21 이전/이후
ai_cat = q("""
    SELECT
      SUM(CASE WHEN registered_at <= '2026-08-21 23:59:59+00' THEN 1 ELSE 0 END) AS before,
      SUM(CASE WHEN registered_at >  '2026-08-21 23:59:59+00' THEN 1 ELSE 0 END) AS after
    FROM projects
    WHERE source = ANY(%s) AND category = 'AI·데이터';
""", [KR])
ai_before, ai_after = ai_cat[0]['before'], ai_cat[0]['after']

# 한국 (미분류)
unclass = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND (category IS NULL OR category = '');
""", [KR])

# 한국 1000-3000만 sweet spot
sweet = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s)
      AND budget_min >= 1000000 AND budget_min < 30000000;
""", [KR])

# 한국 1-3개월 단기 도급
short_term = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s)
      AND period_days IS NOT NULL AND period_days > 0 AND period_days < 90;
""", [KR])

# 한국 기타 카테고리
etc_cnt = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND category = '기타';
""", [KR])

# 한국 region 미공개
region_unknown = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND (region IS NULL OR region = '');
""", [KR])

# 한국 work_type
wt_rows = q("""
    SELECT COALESCE(NULLIF(work_type,''),'(미공개)') AS w, COUNT(*) AS n
    FROM projects WHERE source = ANY(%s) GROUP BY 1 ORDER BY n DESC;
""", [KR])

# 한국 sub_category top 5
sub_rows = q("""
    SELECT COALESCE(NULLIF(category_sub,''),'(미분류)') AS s, COUNT(*) AS n
    FROM projects WHERE source = ANY(%s) AND category_sub IS NOT NULL AND category_sub <> ''
    GROUP BY 1 ORDER BY n DESC LIMIT 5;
""", [KR])

# 한국 재발주 후보 그룹 수
repeat_groups = scalar("""
    WITH t AS (
      SELECT id, source, title,
        LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[\\s\\-\\(\\)\\[\\]·,./]+', '', 'g'),
          '(구축|개발|신규|웹앱|플랫폼|시스템|서비스|솔루션|어플|앱|제작|구축의|고도화|리뉴얼|유지보수|운영|관리)$', '', 'g')) AS tnorm
      FROM projects WHERE source = ANY(%s) AND title IS NOT NULL
    )
    SELECT COUNT(*) FROM (SELECT tnorm FROM t WHERE LENGTH(tnorm) >= 6 GROUP BY 1 HAVING COUNT(*) >= 2) x;
""", [KR])

# 한국 1억+
big1 = scalar("SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND budget_min >= 100000000;", [KR])

# 한국 5000만+
big5 = scalar("SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND budget_min >= 50000000;", [KR])

# 한국 300-3000만 SMB sweet spot
smb = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s)
      AND budget_min >= 3000000 AND budget_min < 30000000;
""", [KR])

# 한국 applicants 50+
appl_50 = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND applicants >= 50;
""", [KR])

# 한국 1년+ 장기
long_term = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s)
      AND period_days IS NOT NULL AND period_days >= 365;
""", [KR])

# hackathon ai/mcp/llm
hack_ai = scalar("SELECT COUNT(*) FROM projects, UNNEST(tech_keywords) kw WHERE source = 'hackathon' AND kw = 'ai';")
hack_mcp = scalar("SELECT COUNT(*) FROM projects, UNNEST(tech_keywords) kw WHERE source = 'hackathon' AND kw = 'mcp';")
hack_llm = scalar("SELECT COUNT(*) FROM projects, UNNEST(tech_keywords) kw WHERE source = 'hackathon' AND kw = 'llm';")

# 한국 tech_keywords top 5
kr_kw_rows = q("""
    SELECT kw, COUNT(*) AS n
    FROM projects, UNNEST(tech_keywords) AS kw
    WHERE source = ANY(%s)
    GROUP BY 1 ORDER BY n DESC, kw ASC LIMIT 5;
""", [KR])

# 한국 바이오·의료 sub
biomed = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s)
      AND category_sub = '바이오·의료(생명·식품)';
""", [KR])

# 한국 정보·통신 sub
info = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s)
      AND category_sub = '정보·통신';
""", [KR])

# hackathon top tech 4
hack_top_rows = q("""
    SELECT kw, COUNT(*) AS n
    FROM projects, UNNEST(tech_keywords) AS kw
    WHERE source = 'hackathon'
    GROUP BY 1 ORDER BY n DESC LIMIT 4;
""")

# 한국 web+app
webapp = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND category IN ('웹', '앱');
""", [KR])

# 한국 1-2개월
m12 = scalar("SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND period_days >= 30 AND period_days < 60;", [KR])

# 한국 applicants 20-49 / 1-19
appl_2049 = scalar("SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND applicants >= 20 AND applicants < 50;", [KR])
appl_119 = scalar("SELECT COUNT(*) FROM projects WHERE source = ANY(%s) AND applicants >= 1 AND applicants < 20;", [KR])

# 한국 8/26~8/28 wishket 신규
w_new_rows = q("""
    SELECT id, title, budget_min FROM projects
    WHERE source='wishket' AND registered_at >= '2026-08-26'
    ORDER BY registered_at DESC;
""")

# 한국 8/28 u300 신규 (icNo > 7000)
u_new = scalar("""
    SELECT COUNT(*) FROM projects WHERE source = 'u300' AND id::int > 7000;
""")

# 결과 모음
print()
print(f"  한국 AI·데이터: 8/21 이전 {ai_before}건 → 8/22 이후 {ai_after}건 ({(ai_after-ai_before)/max(1,ai_before)*100:+.1f}%)")
print(f"  한국 (미분류): {unclass}건 / 798 = {unclass/798*100:.1f}%")
print(f"  한국 1000-3000만: {sweet}건")
print(f"  한국 1-3개월: {short_term}건")
print(f"  한국 기타: {etc_cnt}건")
print(f"  한국 region 미공개: {region_unknown}건 / 798 = {region_unknown/798*100:.1f}%")
print(f"  한국 work_type: {[(r['w'], r['n']) for r in wt_rows]}")
print(f"  한국 sub top 5: {[(r['s'], r['n']) for r in sub_rows]}")
print(f"  한국 재발주 후보: {repeat_groups}그룹")
print(f"  한국 1억+: {big1}건 / 5000만+: {big5}건")
print(f"  한국 300-3000만 SMB: {smb}건")
print(f"  한국 1-2개월: {m12}건")
print(f"  한국 applicants 50+: {appl_50}건 (20-49={appl_2049}, 1-19={appl_119})")
print(f"  한국 1년+ 장기: {long_term}건")
print(f"  hackathon ai/mcp/llm: {hack_ai}/{hack_mcp}/{hack_llm}")
print(f"  한국 kw top 5: {[(r['kw'], r['n']) for r in kr_kw_rows]}")
print(f"  한국 바이오/정보: {biomed}/{info}")
print(f"  hackathon top 4: {[(r['kw'], r['n']) for r in hack_top_rows]}")
print(f"  한국 web+app: {webapp}건")
print(f"  한국 8/26~8/28 wishket 신규: {len(w_new_rows)}건")
print(f"  한국 8/28 u300 신규: {u_new}건")

# === 5. 분석 테이블 4개 TRUNCATE + INSERT ===
print("\n=== 5. 분석 테이블 초기화 + INSERT ===")
with psycopg.connect(DSN) as c:
    with c.cursor() as cur:
        for t in ['analysis_category', 'analysis_budget', 'analysis_keyword', 'analysis_insights']:
            cur.execute(f"TRUNCATE TABLE {t};")
        print("  truncated: 4 tables")

        for r in cat_rows:
            share = round(r['n'] / cat_total * 100, 1)
            cur.execute("""
                INSERT INTO analysis_category (source, category, cnt, share_pct, period)
                VALUES (%s, %s, %s, %s, %s)
            """, ['all', r['cat'], r['n'], share, PERIOD])
        print(f"  inserted analysis_category: {len(cat_rows)} rows")

        for r in bud_rows:
            cur.execute("""
                INSERT INTO analysis_budget (source, bucket, cnt, period)
                VALUES (%s, %s, %s, %s)
            """, ['all', r['bucket'], r['n'], PERIOD])
        print(f"  inserted analysis_budget: {len(bud_rows)} rows")

        for r in kw_rows:
            cur.execute("""
                INSERT INTO analysis_keyword (source, keyword, cnt, period)
                VALUES (%s, %s, %s, %s)
            """, ['all', r['kw'], r['n'], PERIOD])
        print(f"  inserted analysis_keyword: {len(kw_rows)} rows")

        persona_items = json.load(open('app/worker/src/analysis_items.json'))
        for it in persona_items:
            rank = it['rank']
            if it['action'] == 'add':
                itype = 'feature'
            elif it['action'] == 'pivot':
                itype = 'market'
            elif it['action'] == 'watch':
                itype = 'keyword'
            else:
                itype = 'market'
            title = f"[{it['action'].upper()}] {it['title']}"
            body = it['summary']
            metric = {
                "rank": rank,
                "persona_origin": it['persona_origin'],
                "agreed_by": it['agreed_by'],
                "consensus": it['consensus'],
                "evidence": it['evidence'],
            }
            cur.execute("""
                INSERT INTO analysis_insights (type, title, body, metric, period, confidence, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, now())
            """, [itype, title, body, json.dumps(metric, ensure_ascii=False), PERIOD, it['confidence']])
        print(f"  inserted analysis_insights: {len(persona_items)} rows")
    c.commit()
    print("\n  committed")

# === 6. 검증 ===
print("\n=== 6. 검증 ===")
print(f"  category rows: {scalar('SELECT COUNT(*) FROM analysis_category WHERE period=%s', [PERIOD])}")
print(f"  budget rows:   {scalar('SELECT COUNT(*) FROM analysis_budget WHERE period=%s', [PERIOD])}")
print(f"  keyword rows:  {scalar('SELECT COUNT(*) FROM analysis_keyword WHERE period=%s', [PERIOD])}")
print(f"  insights rows: {scalar('SELECT COUNT(*) FROM analysis_insights WHERE period=%s', [PERIOD])}")
print(f"  total projects: {scalar('SELECT COUNT(*) FROM projects')}")
