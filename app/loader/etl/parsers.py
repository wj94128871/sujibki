"""소스별 raw → StandardProject 파서 (tech-design §3.3·§5.1 정규화 매핑).
실제 crawled/ 원천 구조를 기준으로 작성(2026-08-20 세션 실측).
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional
from .schema_std import (
    StandardProject, SI_CONTRACT, STARTUP, HACKATHON,
    WORK_CONTRACT, WORK_STARTUP, WORK_HACKATHON,
)
from .normalize.budget import normalize_freemoa as normalize_freemoa_budget, normalize_wishket
from .normalize.category import normalize_freemoa as normalize_freemoa_cat, normalize_u300, normalize_devpost
from .normalize.date import normalize_date
from .normalize.keyword import normalize_keywords
import re, json


# ---------------- 프리모아 ----------------
def _bool_to_int(v):
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def from_freemoa(item: dict) -> StandardProject:
    """POST /m4a/s41a 목록 항목(workType==1 도급) → 표준."""
    p = StandardProject(
        source="freemoa",
        source_ref=str(item.get("proj_idx") or ""),
        group_type=SI_CONTRACT,
        title=(item.get("title") or "").strip(),
        region=item.get("pv_smallnm"),
        source_url=f"https://www.freemoa.net/m4/s41?pno={item.get('proj_idx')}",
        raw=dict(item),  # PII 필터는 dedupe/적재 직전에 적용
    )
    lo, hi = normalize_freemoa_budget(item.get("cost_min"), item.get("cost_max"))
    p.budget_min, p.budget_max = lo, hi
    p.budget_unit = "KRW"
    try:
        p.period_days = int(item["during"]) if item.get("during") else None
    except (ValueError, TypeError):
        p.period_days = None
    wt = str(item.get("workType") or "")
    p.work_type = WORK_CONTRACT if wt == "1" else ("term" if wt == "2" else "onsite" if wt == "3" else "contract")
    p.category = normalize_freemoa_cat(str(item.get("fld") or ""), str(item.get("fld_nm_2nd") or ""),
                                   str(item.get("proj_filed_new") or ""))
    p.category_sub = item.get("fld_nm_2nd")
    p.tech_keywords = normalize_keywords([item.get("proj_language")] if item.get("proj_language") else [])
    p.registered_at = normalize_date(item.get("INS_TIME"))
    ap = item.get("ALL_APPLY_COUNT")
    p.applicants = _bool_to_int(ap)
    # 상세 내용(txt)을 description으로
    txt = (item.get("txt") or "").strip()
    if txt:
        p.raw["description"] = txt[:3000]
    return p


# ---------------- u300 현재 (2기) ----------------
def from_u300_current(data: dict) -> StandardProject:
    """get-ipo-company-data 상세 응답(data) → 표준."""
    p = StandardProject(
        source="u300", runtime="current",
        source_ref=str(data.get("icNo") or ""),
        group_type=STARTUP,
        title=(data.get("companyTitle") or data.get("teamName") or "").strip(),
        region=data.get("teamRegion"),
        work_type=WORK_STARTUP,
        source_url=f"https://u300.kr/ipo/{data.get('icNo')}",
        raw=dict(data),
    )
    p.category = normalize_u300(data.get("ipoPart"), data.get("hashTags"))
    p.category_sub = data.get("ipoPart")
    p.tech_keywords = normalize_keywords(data.get("hashTags") or [])
    # 등록일: 출품 자료 uploadFiles[].createdAt 최소값을 출품 시각 프록시로 사용
    # (API에 createdAt 필드 없음 — 2026-08-25 실측, 357건 중 185건 커버).
    # 미보유 시 기수 연도만 raw에 보존(registered_at 조작 금지 — 연도를 1월로 위조하지 않음).
    ups = [u.get("createdAt") for u in (data.get("uploadFiles") or []) if u.get("createdAt")]
    date_source = None
    if ups:
        p.registered_at = normalize_date(min(ups))
        date_source = "upload_created_at"
    else:
        mt = re.search(r"\((20\d{2})\)", str(data.get("topTrackName") or ""))
        if mt:
            p.raw["track_year"] = mt.group(1)
            date_source = "track_year"
    p.raw["date_source"] = date_source
    # 상세 내용(companyContent HTML) → description 텍스트
    cc = data.get("companyContent") or ""
    if cc:
        import re as _re
        desc = _re.sub(r"<[^>]+>", " ", cc)
        desc = _re.sub(r"\s+", " ", desc).strip()
        p.raw["description"] = desc[:3000]
    return p


# ---------------- u300 1기 (과거 전시) ----------------
def from_u300_past1(data: dict) -> StandardProject:
    """동문회전시관 pe_*.json 상세(data) → 표준."""
    p = StandardProject(
        source="u300", runtime="past1",
        source_ref=str(data.get("peNo") or ""),
        group_type=STARTUP,
        title=(data.get("companyTitle") or data.get("teamName") or "").strip(),
        region=data.get("teamRegion"),
        work_type=WORK_STARTUP,
        source_url=f"https://u300.kr/exhibition/detail?peNo={data.get('peNo')}",
        raw=dict(data),
    )
    p.category = normalize_u300(data.get("pePart"), data.get("hashTags"))
    p.category_sub = data.get("pePart")
    p.tech_keywords = normalize_keywords(data.get("hashTags") or [])
    cc = data.get("companyContent") or ""
    if cc:
        import re as _re
        desc = _re.sub(r"<[^>]+>", " ", cc)
        desc = _re.sub(r"\s+", " ", desc).strip()
        p.raw["description"] = desc[:3000]
    return p


# ---------------- Devpost ----------------
_MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"], 1)}


def _devpost_date(value) -> Optional[str]:
    """submitted_date 정규화 — ISO8601(time 태그) 또는 'August 17, 2026'(헤더 텍스트).
    타당성 가드: [2020-01-01, 오늘+45일] 밖은 본문 오염으로 간주하고 폐기."""
    if not value:
        return None
    s = str(value).strip()
    iso = normalize_date(s)
    if not iso:
        m = re.match(r"([A-Za-z]{3,9})\.?\s+(\d{1,2}),\s*(\d{4})", s)
        if m and m.group(1) in _MONTHS:
            iso = "%s-%02d-%02dT00:00:00+00:00" % (m.group(3), _MONTHS[m.group(1)], int(m.group(2)))
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso)
        lo = datetime(2020, 1, 1, tzinfo=dt.tzinfo) if dt.tzinfo else datetime(2020, 1, 1)
        hi_dt = datetime.now(timezone.utc) + timedelta(days=45)
        hi = hi_dt if dt.tzinfo else hi_dt.replace(tzinfo=None)
        if not (lo <= dt <= hi):
            return None
    except ValueError:
        return None
    return iso


def from_devpost(detail: dict) -> StandardProject:
    """devpost meta.json detail 항목(slug/title/built_with/url/submitted_date) → 표준."""
    p = StandardProject(
        source="devpost",
        source_ref=(detail.get("slug") or "").strip(),
        group_type=HACKATHON,
        title=(detail.get("title") or "").strip(),
        work_type=WORK_HACKATHON,
        source_url=detail.get("url") or "",
        raw=dict(detail),
    )
    p.tech_keywords = normalize_keywords(detail.get("built_with") or [])
    p.category = normalize_devpost(detail.get("built_with"))
    # 등록일: <time datetime> ISO(크롤러 v2) 또는 헤더 텍스트 폴백 → normalize
    p.registered_at = _devpost_date(detail.get("submitted_date"))
    desc = (detail.get("description") or "").strip()
    if desc:
        p.raw["description"] = desc[:3000]
    return p


# ---------------- 위시켓 (HTML 파싱) ----------------
_WISHKET_ID_RE = re.compile(r'href="/project/(\d+)/"')


def extract_wishket_ids(list_html: str) -> list:
    return list(dict.fromkeys(_WISHKET_ID_RE.findall(list_html or "")))


def from_wishket(id_: str, detail_text: str) -> StandardProject:
    """위시켓 상세 HTML → 표준 (예상금액/기간/지원자/마감일/업무내용/모집요건 파싱)."""
    p = StandardProject(
        source="wishket", source_ref=str(id_),
        group_type=SI_CONTRACT,
        source_url="https://www.wishket.com/project/%s/" % id_,
        raw={"id": id_},
    )
    txt = detail_text or ""
    mt = re.search(r"<title>([^<]+)</title>", txt)
    if mt:
        # "제목 · 위시켓(Wishket) - 프로젝트" → 제목만
        p.title = mt.group(1).split("·")[0].strip()
    # 조건 박스: 예상 금액 / 예상 기간 / 지원자 수
    names = re.findall(r'condition-box-name[^>]*>\s*([^<]+?)\s*<', txt)
    vals = re.findall(r'project-condition-data[^>]*>\s*([^<]+?)\s*<', txt)
    cond = dict(zip(names, vals))
    b = cond.get("예상 금액")
    if b:
        lo, hi, unit = normalize_wishket(b)
        p.budget_min, p.budget_max, p.budget_unit = lo, hi, unit
    tm = cond.get("예상 기간")
    if tm:
        m = re.search(r"(\d+)", tm)
        if m:
            p.period_days = int(m.group(1))
    ap = cond.get("지원자 수")
    if ap:
        m = re.search(r"(\d+)", ap)
        if m:
            p.applicants = int(m.group(1))
    # 모집 마감일 (등록일은 목록 기준으로 pipeline에서 주입)
    dm = re.search(r"모집 마감일</p><p[^>]*>([^<]+)<", txt)
    if dm:
        p.deadline = dm.group(1).strip().replace("년 ", "-").replace("월 ", "-").replace("일", "")
    p.work_type = WORK_CONTRACT
    # 상세 본문: 업무 내용 / 모집 요건 (raw에 저장, PII 필터는 HTML 텍스트 대상)
    desc = ""
    di = txt.find('id="description"')
    if di > 0:
        m = re.search(r'<div class="project-description-box[^>]*>(.*?)</div>\s*</div>', txt[di:], re.S)
        if m:
            desc = re.sub(r"<br\s*/?>", "\n", m.group(1))
            desc = re.sub(r"<[^>]+>", "", desc)
            desc = re.sub(r"\n{3,}", "\n\n", desc).strip()
    recruit = ""
    ri = txt.find('id="recruit_condition"')
    if ri > 0:
        m = re.search(r'<div class="recruit-condition-detail-box[^>]*>(.*?)</div>\s*</div>', txt[ri:], re.S)
        if m:
            recruit = re.sub(r"<[^>]+>", " ", m.group(1))
            recruit = re.sub(r"\s+", " ", recruit).strip()
    p.raw["description"] = desc[:3000]
    p.raw["recruit_condition"] = recruit[:1500]
    return p



# ---------------- 해커톤/챌린지 (도메인 무관) ----------------
def from_hackathon(item: dict) -> StandardProject:
    """ETL 정규화 결과(hackathons_normalized.json 항목) → 표준.
    source별: codeforces|hackerone|drivendata|zindi|hackerearth|herox|topcoder|openideo
    """
    p = StandardProject(
        source="hackathon",                # 적재 시 source 컬럼은 "hackathon"으로 묶고
        source_ref=f"{item.get('source','')}:{item.get('source_id','')}",  # 출처 구분용 prefix
        group_type=HACKATHON,
        title=(item.get("title") or "").strip(),
        work_type=WORK_HACKATHON,
        source_url=item.get("url") or "",
        raw=dict(item),
    )
    # 카테고리: 1차 카테고리(있으면)
    cat = item.get("category") or ""
    p.category = cat if cat and cat != "competition" else None
    p.category_sub = item.get("source") or None
    # tech keywords = tags
    tags = item.get("tags") or []
    p.tech_keywords = normalize_keywords(tags)
    # 마감
    p.deadline = item.get("end_at") or None
    # 등록일(없으면 None — 위조 금지)
    p.registered_at = item.get("start_at") or None
    # description
    desc = (item.get("brief") or "").strip()
    if desc:
        p.raw["description"] = desc[:3000]
    return p
