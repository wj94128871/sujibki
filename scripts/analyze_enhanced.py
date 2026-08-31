"""고도화 분석 (startup_strategy_report.md PART 9.5 구현) — 7,810건 전수 재분석.

PART 9.5의 5개 고도화 중 분석 가능한 4개를 구현한다:
  1) 갭 쿼드런트   : 한국 발주 클러스터(wishket+freemoa) × 글로벌 테마(devpost) 교차 매트릭스
                     → C티어 후보(해외 검증·한국 공백) 자동 태깅
  2) 투자 검증     : u300 fundingRound를 도메인별 트래킹 → "VC가 검증 중인 트랙" 플래그 산출
  3) 재발주 그래프 : 동일 제목(정규화)·재게시 그래프 → "지불 의지 반복" 스코어 + 폐업·해지 신호
  4) 수집 추이     : registered_at 주간 배치 집계 (분기 리포트 재계산의 시계열 기반)

출력:
  - _analysis_tmp/enhanced_analysis.json  (worker 번들용 기계 판독형)
  - _analysis_tmp/enhanced_report.md      (사람 판독형 요약)

실행: python scripts/analyze_enhanced.py
근거 데이터: app/loader/data/market_dashboard.db (실측 7,810건)
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "app", "loader", "data", "market_dashboard.db")
OUT_JSON = os.path.join(ROOT, "_analysis_tmp", "enhanced_analysis.json")
OUT_MD = os.path.join(ROOT, "_analysis_tmp", "enhanced_report.md")
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ---------------------------------------------------------------- 테마 사전
# 한국(발주 본문 한국어)과 글로벌(devpost 영어)에서 동일 테마를 잡기 위한 키워드 쌍.
THEMES: dict[str, dict[str, list[str]]] = {
    "AI 에이전트/MCP": {"kr": ["에이전트", "자율", "mcp"], "gl": ["agent", "autonomous", "mcp", "langgraph", "multi-agent"]},
    "챗봇/대화형": {"kr": ["챗봇", "대화", "상담 챗"], "gl": ["chatbot", "chatbot", "conversational", "chat bot"]},
    "음성/콜": {"kr": ["녹취", "콜센터", "cti", "음성", "통화"], "gl": ["voice", "speech", "audio", "asr", "transcri", "call "]},
    "생산성/업무자동화": {"kr": ["자동화", "업무", "관리자", "erp", "그룹웨어", "워크플로"], "gl": ["automation", "productivity", "workflow", "notion", "slack bot"]},
    "데이터/대시보드": {"kr": ["대시보드", "통계", "데이터 분석", "bi", "리포트"], "gl": ["dashboard", "analytics", "pipeline", "visualization", "etl"]},
    "교육/학습": {"kr": ["교육", "학습", "학원", "강의", "수강", "과외"], "gl": ["education", "learning", "tutor", "course", "quiz"]},
    "헬스케어": {"kr": ["의료", "병원", "환자", "건강", "진료", "치과"], "gl": ["health", "medical", "patient", "hospital", "clinic", "diagnos"]},
    "커머스": {"kr": ["쇼핑", "커머스", "자사몰", "몰 운영", "상품"], "gl": ["commerce", "shop", "storefront", "marketplace", "e-commerce", "shopify"]},
    "보안/사기탐지": {"kr": ["보안", "개인정보", "사기", "탐지", "isms"], "gl": ["security", "fraud", "phishing", "privacy", "deepfake", "detection"]},
    "접근성/돌봄": {"kr": ["돌봄", "시니어", "장애", "복지", "배리어프리", "노인"], "gl": ["accessibility", "care", "elderly", "disabilit", "companion"]},
    "기후/에너지": {"kr": ["에너지", "태양광", "전력", "충전", "ess", "전기차"], "gl": ["climate", "energy", "carbon", "solar", "sustainab", "grid"]},
    "커뮤니티/소셜": {"kr": ["커뮤니티", "카페", "동호회"], "gl": ["community", "social", "forum", "discord"]},
    "채용/HR": {"kr": ["채용", "이력서", "인사", "근태"], "gl": ["recruit", "resume", "hiring", "hr ", "interview"]},
    "법률/IP": {"kr": ["법률", "계약서", "특허", "법무"], "gl": ["legal", "law", "patent", "contract"]},
    "결제/정산": {"kr": ["결제", "정산", "수익배분", "pg"], "gl": ["payment", "billing", "settlement", "stripe"]},
    "예약/일정": {"kr": ["예약", "달력", "스케줄"], "gl": ["booking", "reservation", "scheduling", "calendar"]},
    "금융/투자": {"kr": ["금융", "투자", "대출", "펀드"], "gl": ["finance", "invest", "trading", "banking", "fintech"]},
    "IoT/펌웨어": {"kr": ["iot", "펌웨어", "센서", "회로"], "gl": ["iot", "firmware", "sensor", "arduino", "mqtt"]},
    "게임/미디어": {"kr": ["게임", "영상", "미디어", "콘텐츠"], "gl": ["game", "video", "media", "streaming", "avatar"]},
}
COMPILED = {t: {k: [re.compile(p, re.I) for p in ps] for k, ps in d.items()} for t, d in THEMES.items()}

KR_SOURCES = ("wishket", "freemoa")


def match_themes(text: str, side: str) -> list[str]:
    hits = []
    for theme, sides in COMPILED.items():
        for pat in sides[side]:
            if pat.search(text):
                hits.append(theme)
                break
    return hits


def load_rows():
    con = sqlite3.connect(DB)
    cur = con.cursor()
    cur.execute("SELECT source, title, budget_max, registered_at, raw_json FROM projects")
    rows = cur.fetchall()
    con.close()
    return rows


def desc_of(source: str, raw: str | None) -> str:
    if not raw:
        return ""
    try:
        d = json.loads(raw)
    except (ValueError, TypeError):
        return ""
    return (d.get("description") or d.get("companyContent") or d.get("brief") or "")


# ---------------------------------------------------------------- 1) 갭 쿼드런트
def gap_quadrant(rows) -> dict:
    gl_cnt: Counter = Counter()
    kr_cnt: Counter = Counter()
    kr_budget: Counter = Counter()
    gl_total = 0
    for source, title, budget_max, registered_at, raw in rows:
        text = f"{title or ''} {desc_of(source, raw)[:4000]}"
        if source == "devpost":
            gl_total += 1
            for t in match_themes(text, "gl"):
                gl_cnt[t] += 1
        elif source in KR_SOURCES:
            for t in match_themes(text, "kr"):
                kr_cnt[t] += 1
                kr_budget[t] += (budget_max or 0)

    themes = []
    # 임계값: 글로벌 점유 ≥10% = "글로벌 과열", 한국 15건↑ 또는 예산 1억↑ = "한국 수요 있음"
    for t in THEMES:
        g = gl_cnt.get(t, 0)
        k = kr_cnt.get(t, 0)
        budget = kr_budget.get(t, 0)
        share = round(g / gl_total * 100, 1) if gl_total else 0.0
        gl_hot = share >= 10
        kr_hot = k >= 15 or budget >= 100_000_000
        if gl_hot and kr_hot:
            q, note = "Q1", "검증된 공통 수요 — 양쪽 모두 강함"
        elif gl_hot and not kr_hot:
            q, note = "Q2", "글로벌 과열·한국 공백 — C티어 후보(진입 직전 신호)"
        elif not gl_hot and kr_hot:
            q, note = "Q3", "한국 특화 수요 — 로컬 웨지"
        else:
            q, note = "Q4", "양쪽 약함 — 배경 노이즈"
        themes.append({
            "theme": t,
            "global_cnt": g, "global_share_pct": share,
            "kr_cnt": k, "kr_budget_sum": budget,
            "quadrant": q, "note": note,
        })
    themes.sort(key=lambda x: (-x["global_share_pct"], -x["kr_cnt"]))
    return {"gl_total": gl_total, "themes": themes,
            "c_candidates": [t for t in themes if t["quadrant"] == "Q2"]}


# ---------------------------------------------------------------- 2) 투자 검증 (u300)
ROUND_LABEL = {"PRE_SEED": "프리시드", "SEED": "시드", "PRE_A": "프리A", "SERIES_A": "시리즈A", "SERIES_B": "시리즈B"}


def funding_tracks(rows) -> dict:
    by_round: Counter = Counter()
    track_rounds: dict[str, Counter] = defaultdict(Counter)
    track_examples: dict[str, list[str]] = defaultdict(list)
    total = 0
    for source, title, *_ , raw in [(r[0], r[1], r[2], r[3], r[4]) for r in rows]:
        if source != "u300":
            continue
        if not raw:
            continue
        try:
            d = json.loads(raw)
        except (ValueError, TypeError):
            continue
        rnd = (d.get("fundingRound") or "").strip().upper()
        if rnd in ("", "NONE"):  # 'NONE' 311건·빈값 60건은 투자 아님(실측 노이즈)
            continue
        rnd = "SERIES_A" if rnd == "SERIES_A_IDEAL" else rnd
        total += 1
        by_round[rnd] += 1
        text = f"{d.get('companyTitle') or ''} {d.get('teamName') or ''} {d.get('hashTags') or ''} {(d.get('companyContent') or '')[:3000]}"
        for t in match_themes(text, "kr"):
            track_rounds[t][rnd] += 1
            if len(track_examples[t]) < 3:
                track_examples[t].append(d.get("teamName") or d.get("companyTitle") or "(팀명 미공개)")
    tracks = sorted(
        ({"domain": t, "cnt": sum(c.values()), "rounds": dict(c),
          "rounds_label": ", ".join(f"{ROUND_LABEL.get(k, k)} {v}" for k, v in c.most_common()),
          "examples": track_examples[t]}
         for t, c in track_rounds.items()),
        key=lambda x: -x["cnt"])
    return {"total_rounds": total, "by_round": dict(by_round.most_common()), "tracks": tracks}


# ---------------------------------------------------------------- 3) 재발주 그래프
def _norm_title(t: str) -> str:
    return re.sub(r"[\s\W_]+", "", (t or "").lower())


def reorder_graph(rows) -> dict:
    groups: dict[str, dict] = defaultdict(lambda: {"cnt": 0, "budget_sum": 0, "channels": Counter(), "sample": ""})
    for source, title, budget_max, *_ in rows:
        if source not in KR_SOURCES or not title:
            continue
        key = _norm_title(title)
        if len(key) < 8:
            continue
        g = groups[key]
        g["cnt"] += 1
        g["budget_sum"] += (budget_max or 0)
        g["channels"][source] += 1
        g["sample"] = title
    repeated = [
        {"title": g["sample"], "cnt": g["cnt"], "budget_sum": g["budget_sum"],
         "channels": dict(g["channels"])}
        for g in groups.values() if g["cnt"] >= 2
    ]
    repeated.sort(key=lambda x: (-x["cnt"], -x["budget_sum"]))

    closure_kw = re.compile(r"폐업|계약\s*해지|계약\s*종료|더\s*이상\s*유지보수")
    closure_cnt = 0
    for source, title, budget_max, registered_at, raw in rows:
        if source not in KR_SOURCES:
            continue
        if closure_kw.search(f"{title or ''} {desc_of(source, raw)[:3000]}"):
            closure_cnt += 1
    return {"repeated_cnt": len(repeated), "top": repeated[:10], "closure_failures": closure_cnt}


# ---------------------------------------------------------------- 4) 수집 추이 (주간)
def weekly_trend(rows) -> dict:
    """주간 추이는 '지불 증거·기술 트렌드 계층'만 집계한다.
    - wishket/freemoa: registered_at (게시일)
    - devpost: raw submitted_date (제출일) — registered_at 부재 보완
    - hackathon 제외: raw start_at은 '행사 시작일'(2010년대 포함)이라 게시 흐름과 무관.
    - u300: registered_at 공백 다수로 신뢰 낮음 → 제외.
    """
    weeks: dict[str, Counter] = defaultdict(Counter)
    for source, title, budget_max, registered_at, raw in rows:
        if source not in ("wishket", "freemoa", "devpost"):
            continue
        date_str = registered_at or ""
        if source == "devpost" and raw:
            try:
                date_str = json.loads(raw).get("submitted_date") or date_str
            except (ValueError, TypeError):
                pass
        m = re.match(r"(\d{4}-\d{2}-\d{2})", date_str)
        if not m:
            continue
        try:
            dt = datetime.fromisoformat(m.group(1))
        except ValueError:
            continue
        iso = dt.isocalendar()
        weeks[f"{iso[0]}-W{iso[1]:02d}"][source] += 1
    out = [{"week": w, "counts": dict(c)} for w, c in sorted(weeks.items())]
    return {"note": "wishket·freemoa=게시일, devpost=제출일 기준. hackathon(행사 시작일)·u300(날짜 공백 다수) 제외.",
            "recent_weeks": out[-10:]}


# ---------------------------------------------------------------- 리포트
def to_report(r: dict) -> str:
    lines = [
        f"# 고도화 분석 결과 (PART 9.5 구현) — {NOW}",
        "",
        f"> 근거: market_dashboard.db 실측 {r['total']:,}건. 스크립트: `scripts/analyze_enhanced.py`.",
        "",
        "## 1) 갭 쿼드런트 — 한국 발주 × 글로벌 테마 교차",
        "",
        f"글로벌(Devpost) {r['gap_quadrant']['gl_total']:,}건 기준. Q2(글로벌 과열·한국 공백) = C티어 후보 자동 태깅.",
        "",
        "| 테마 | 글로벌 | 점유% | 한국 발주 | 한국 예산합 | 쿼드런트 |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for t in r["gap_quadrant"]["themes"]:
        lines.append(f"| {t['theme']} | {t['global_cnt']} | {t['global_share_pct']}% | {t['kr_cnt']} | "
                     f"{t['kr_budget_sum']/1e8:.2f}억 | {t['quadrant']} — {t['note']} |")
    lines += ["", "**C티어 후보(Q2)**: " + (", ".join(t["theme"] for t in r["gap_quadrant"]["c_candidates"]) or "없음"), ""]
    lines += [
        "## 2) 투자 검증 트랙 — u300 fundingRound 도메인 매핑",
        "",
        f"투자유치 표기 {r['funding']['total_rounds']}건. 라운드 분포: " +
        ", ".join(f"{ROUND_LABEL.get(k, k)} {v}" for k, v in r['funding']['by_round'].items()) + "",
        "",
        "| 도메인 | 투자건수 | 라운드 | 팀 예시 |",
        "|---|---:|---|---|",
    ]
    for t in r["funding"]["tracks"][:8]:
        lines.append(f"| {t['domain']} | {t['cnt']} | {t['rounds_label']} | {', '.join(t['examples'][:2])} |")
    lines += [
        "",
        "## 3) 재발주 그래프 — 지불 의지 반복 스코어",
        "",
        f"동일 제목(정규화) 2회 이상 재게시 {r['reorder']['repeated_cnt']}건. 폐업·계약해지 신호 {r['reorder']['closure_failures']}건 (조합 B 근거).",
        "",
        "| 제목 | 재게시 | 채널 | 예산합 |",
        "|---|---:|---|---:|",
    ]
    for g in r["reorder"]["top"]:
        lines.append(f"| {g['title'][:40]} | {g['cnt']} | {', '.join(g['channels'])} | {g['budget_sum']/1e8:.2f}억 |")
    lines += [
        "",
        "## 4) 수집 추이 — 최근 주간 배치",
        "",
        "| 주차 | " + " | ".join(s for s in ("wishket", "freemoa", "devpost", "u300", "hackathon")) + " |",
        "|---|" + "---:|" * 5,
    ]
    for w in r["weekly"]["recent_weeks"]:
        counts = w["counts"]
        lines.append(f"| {w['week']} | " + " | ".join(str(counts.get(s, 0)) for s in ("wishket", "freemoa", "devpost", "u300", "hackathon")) + " |")
    lines += ["", f"*생성: {NOW} · analyze_enhanced.py (stdlib only) · 분기마다 재실행 권고*", ""]
    return "\n".join(lines)


def main():
    rows = load_rows()
    result = {
        "generated_at": NOW,
        "total": len(rows),
        "gap_quadrant": gap_quadrant(rows),
        "funding": funding_tracks(rows),
        "reorder": reorder_graph(rows),
        "weekly": weekly_trend(rows),
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write(to_report(result))
    print(f"OK total={result['total']:,} -> {OUT_JSON}")
    print(f"C티어 후보(Q2): {[t['theme'] for t in result['gap_quadrant']['c_candidates']]}")
    print(f"재게시 그룹: {result['reorder']['repeated_cnt']} / 폐업·해지 신호: {result['reorder']['closure_failures']}")
    print(f"투자유치 표기: {result['funding']['total_rounds']}")


if __name__ == "__main__":
    main()
