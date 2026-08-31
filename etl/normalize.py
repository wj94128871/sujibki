"""
채널별 원본 dict → etl.schema.NormalizedItem 변환.

원칙
  - title/org/prize는 원문 보존, prize_usd는 best-effort 환산(USD 가정)
  - phase: open/upcoming/finished/unknown
  - URL이 비어있으면 source_id+source 해시 fallback
  - 중복 키: (source, source_id)
"""
from __future__ import annotations
import hashlib
import re
import time
from datetime import datetime, timezone
from typing import Any

from etl.schema import NormalizedItem

COLLECTED_AT = time.strftime("%Y-%m-%dT%H:%M:%S%z")

# ----- helpers -----

# 통화 환산 — 2026-08 시세 가정(외부 API 안 쓰고 단순 매핑). 실패 시 None.
FX_TO_USD = {
    "USD": 1.0, "$": 1.0,
    "EUR": 1.08, "€": 1.08,
    "GBP": 1.27, "£": 1.27,
    "JPY": 0.0067, "¥": 0.0067,
    "KRW": 0.00075, "₩": 0.00075,
    "ZAR": 0.054, "R": 0.054,  # 남아공 랜드
    "INR": 0.012, "₹": 0.012,
    "CNY": 0.14, "¥CNY": 0.14,
    "BRL": 0.20, "R$": 0.20,
    "CAD": 0.74, "C$": 0.74,
    "AUD": 0.66, "A$": 0.66,
    "CHF": 1.13,
    "SEK": 0.094, "kr": 0.094,
    "NOK": 0.093,
    "DKK": 0.145,
    "PLN": 0.25,
    "MXN": 0.055,
    "SGD": 0.74, "S$": 0.74,
    "HKD": 0.13, "HK$": 0.13,
    "TWD": 0.031, "NT$": 0.031,
    "THB": 0.029, "฿": 0.029,
    "PHP": 0.018,
    "IDR": 0.000063,
    "VND": 0.000040,
    "TRY": 0.029,
    "RUB": 0.011,
    "AED": 0.272,
    "SAR": 0.267,
    "ILS": 0.275, "₪": 0.275,
    "NZD": 0.60, "NZ$": 0.60,
}

# 통화 기호/코드 매핑(텍스트 → 코드)
CURRENCY_TOKENS = sorted(
    [(code, code) for code in FX_TO_USD] +
    [("$", "USD"), ("€", "EUR"), ("£", "GBP"), ("¥", "JPY"), ("₩", "KRW"),
     ("₹", "INR"), ("₪", "ILS"), ("฿", "THB"), ("R$", "BRL"),
     ("C$", "CAD"), ("A$", "AUD"), ("S$", "SGD"), ("HK$", "HKD"),
     ("NT$", "TWD"), ("NZ$", "NZD")],
    key=lambda x: -len(x[0]),
)


def _strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s or "").strip()


def _norm_phase(phase: str | None, end_at: str = "", open_flag: bool | None = None) -> tuple[str, bool]:
    p = (phase or "").upper()
    if open_flag is True or p in {"BEFORE", "CODING", "PENDING_SYSTEM_TEST"} or p.lower() == "open":
        if p == "BEFORE":
            return "upcoming", True
        return "open", True
    if p in {"FINISHED"} or p.lower() == "closed":
        return "finished", False
    if end_at:
        try:
            dt = datetime.fromisoformat(end_at.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            return ("open" if dt > now else "finished"), (dt > now)
        except Exception:
            pass
    return "unknown", False


def _to_int(x: Any) -> int | None:
    try:
        s = str(x).replace(",", "").replace(" ", "")
        return int(float(s)) if s else None
    except Exception:
        return None


def _parse_prize(prize_str: str) -> tuple[int | None, str]:
    """Zindi '$11 000 USD' / '€35 000 EUR' / 'R 100 000' 등 → (usd, normalized_str)."""
    if not prize_str:
        return None, ""
    raw = prize_str
    s = prize_str
    # 통화 토큰 찾기
    code = ""
    for sym, c in CURRENCY_TOKENS:
        if sym in s:
            code = c
            s = s.replace(sym, " ")
            break
    # 숫자
    m = re.search(r"([0-9][0-9 ,.]*)", s)
    if not m:
        return None, raw
    amt_str = m.group(1).replace(",", "").replace(" ", "").rstrip(".")
    try:
        amt = float(amt_str)
    except Exception:
        return None, raw
    rate = FX_TO_USD.get(code, 1.0) if code else 1.0
    usd = int(amt * rate)
    return usd, raw


def _id_fallback(source: str, url: str) -> str:
    if url:
        return hashlib.md5(url.encode()).hexdigest()[:12]
    return hashlib.md5(f"{source}|{time.time()}".encode()).hexdigest()[:12]


def _iso(value: Any) -> str:
    """원본이 epoch seconds 또는 ISO8601 둘 다 가능. ISO8601로 정규화."""
    if not value:
        return ""
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat()
        except Exception:
            return ""
    s = str(value)
    if re.match(r"^\d+$", s):
        try:
            return datetime.fromtimestamp(int(s), tz=timezone.utc).isoformat()
        except Exception:
            return ""
    # ISO8601 가정
    return s


# ----- per-source normalizers -----

def normalize_drivendata(raw: dict) -> NormalizedItem:
    title = re.sub(r"^Competition:\s*", "", raw.get("title") or raw.get("slug") or "")
    tags = list(raw.get("tags") or [])
    category = tags[0] if tags else ""
    prize_str = raw.get("prize_usd") or raw.get("prize") or ""
    # prize가 "50,000" 같은 경우 USD로 가정
    if prize_str and re.fullmatch(r"[\d,]+", prize_str.strip()):
        prize_norm = f"${prize_str} USD"
    else:
        prize_norm = prize_str
    usd, _ = _parse_prize(prize_norm)
    deadline = _iso(raw.get("deadline"))
    phase, is_open = _norm_phase(None, deadline)
    return NormalizedItem(
        source="drivendata",
        source_id=raw.get("slug") or _id_fallback("drivendata", raw.get("url", "")),
        title=title.strip(),
        url=raw.get("url") or "",
        brief=_strip_html(raw.get("brief") or ""),
        category=category,
        tags=tags,
        org="",
        prize=prize_norm,
        prize_usd=usd,
        start_at="",
        end_at=deadline,
        phase=phase,
        is_open=is_open,
        collected_at=COLLECTED_AT,
        extra={"prize_raw": prize_str},
    )


def normalize_zindi(raw: dict) -> NormalizedItem:
    prize = raw.get("reward") or ""
    usd, _ = _parse_prize(prize)
    start = _iso(raw.get("start_time"))
    end = _iso(raw.get("end_time"))
    is_open = bool(raw.get("open"))
    phase, is_open2 = _norm_phase("OPEN" if is_open else "CLOSED", end, is_open)
    return NormalizedItem(
        source="zindi",
        source_id=raw.get("id") or _id_fallback("zindi", raw.get("url", "")),
        title=(raw.get("title") or "").strip(),
        url=raw.get("url") or "",
        brief="",
        category=raw.get("kind") or "",
        tags=[],
        org=raw.get("organization") or "",
        prize=prize,
        prize_usd=usd,
        start_at=start,
        end_at=end,
        phase=phase,
        is_open=is_open2,
        collected_at=COLLECTED_AT,
        extra={
            "kind": raw.get("kind"),
            "participations_count": raw.get("participations_count"),
            "is_beginner_friendly": raw.get("is_beginner_friendly"),
            "reward_type": raw.get("reward_type"),
        },
    )


def normalize_codeforces(raw: dict) -> NormalizedItem:
    start = _iso(raw.get("startTimeSeconds"))
    duration = raw.get("durationSeconds") or 0
    end_at = ""
    if raw.get("startTimeSeconds") and duration:
        try:
            end_dt = datetime.fromtimestamp(int(raw["startTimeSeconds"]) + int(duration), tz=timezone.utc)
            end_at = end_dt.isoformat()
        except Exception:
            pass
    phase_raw = raw.get("phase") or ""
    phase, is_open = _norm_phase(phase_raw, end_at)
    name = (raw.get("name") or "").strip()
    title = f"[{raw.get('type') or 'CF'}] {name}".strip()
    return NormalizedItem(
        source="codeforces",
        source_id=str(raw.get("id") or _id_fallback("codeforces", raw.get("url", ""))),
        title=title,
        url=raw.get("url") or "",
        brief="",
        category="competitive-programming",
        tags=[raw.get("type") or "CF"],
        org="Codeforces",
        prize="",
        prize_usd=None,
        start_at=start,
        end_at=end_at,
        phase=phase,
        is_open=is_open,
        collected_at=COLLECTED_AT,
        extra={"durationSeconds": duration, "frozen": raw.get("frozen")},
    )


def normalize_hackerone(raw: dict) -> NormalizedItem:
    handle = raw.get("handle") or ""
    title = (raw.get("title") or "").strip()
    # 제목이 "HackerOne" 같은 generic이면 handle로 대체
    if not title or title.lower() in {"hackerone"}:
        title = handle
    return NormalizedItem(
        source="hackerone",
        source_id=handle or _id_fallback("hackerone", raw.get("url", "")),
        title=title,
        url=raw.get("url") or f"https://hackerone.com/{handle}",
        brief=_strip_html(raw.get("text_excerpt") or ""),
        category="bug-bounty",
        tags=["bug-bounty", "security"],
        org=title,
        prize=raw.get("bounty_usd") or "",
        prize_usd=_to_int((raw.get("bounty_usd") or "").split("-")[0]) if raw.get("bounty_usd") else None,
        start_at="",
        end_at="",
        phase="unknown",
        is_open=False,
        collected_at=COLLECTED_AT,
        extra={},
    )


def normalize_hackerearth(raw: dict) -> NormalizedItem:
    title = (raw.get("title") or raw.get("slug") or "").strip()
    return NormalizedItem(
        source="hackerearth",
        source_id=raw.get("slug") or _id_fallback("hackerearth", raw.get("url", "")),
        title=title,
        url=raw.get("url") or "",
        brief=_strip_html(raw.get("brief") or ""),
        category=raw.get("kind") or "",
        tags=[],
        org=raw.get("organization") or "",
        prize=raw.get("prize") or "",
        prize_usd=_parse_prize(raw.get("prize") or "")[0],
        start_at="",
        end_at="",
        phase="unknown",
        is_open=False,
        collected_at=COLLECTED_AT,
        extra=raw.get("extra") or {},
    )


def normalize_herox(raw: dict) -> NormalizedItem:
    title = (raw.get("title") or raw.get("slug") or "").strip()
    prize = raw.get("prize_usd") or raw.get("prize") or ""
    usd, _ = _parse_prize(prize) if prize and re.search(r"\$", prize) else (None, prize)
    return NormalizedItem(
        source="herox",
        source_id=raw.get("slug") or _id_fallback("herox", raw.get("url", "")),
        title=title,
        url=raw.get("url") or "",
        brief=_strip_html(raw.get("brief") or ""),
        category="crowdsourcing",
        tags=[],
        org=raw.get("org") or "",
        prize=prize,
        prize_usd=usd,
        start_at="",
        end_at="",
        phase="unknown",
        is_open=False,
        collected_at=COLLECTED_AT,
        extra=raw.get("extra") or {},
    )


def normalize_topcoder(raw: dict) -> NormalizedItem:
    title = (raw.get("title") or raw.get("slug") or "").strip()
    prize = raw.get("prize_usd") or raw.get("prize") or ""
    usd, _ = _parse_prize(prize) if prize else (None, prize)
    return NormalizedItem(
        source="topcoder",
        source_id=raw.get("slug") or _id_fallback("topcoder", raw.get("url", "")),
        title=title,
        url=raw.get("url") or "",
        brief=_strip_html(raw.get("brief") or ""),
        category="competitive-programming",
        tags=[],
        org=raw.get("org") or "Topcoder",
        prize=prize,
        prize_usd=usd,
        start_at="",
        end_at="",
        phase="unknown",
        is_open=False,
        collected_at=COLLECTED_AT,
        extra=raw.get("extra") or {},
    )


def normalize_openideo(raw: dict) -> NormalizedItem:
    title = (raw.get("title") or raw.get("slug") or "").strip()
    return NormalizedItem(
        source="openideo",
        source_id=raw.get("slug") or _id_fallback("openideo", raw.get("url", "")),
        title=title,
        url=raw.get("url") or "",
        brief=_strip_html(raw.get("brief") or ""),
        category="social-impact",
        tags=[],
        org="OpenIDEO",
        prize="",
        prize_usd=None,
        start_at="",
        end_at="",
        phase="unknown",
        is_open=False,
        collected_at=COLLECTED_AT,
        extra=raw.get("extra") or {},
    )


# ----- registry -----

# ----- devpost normalizer (appended) -----
import re
import time
from etl.schema import NormalizedItem
_DEVPOST_COLLECTED_AT = time.strftime("%Y-%m-%dT%H:%M:%S%z")

def _strip(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()

def normalize_devpost(raw: dict) -> NormalizedItem:
    title = _strip(raw.get("title") or raw.get("slug") or "")
    bw = raw.get("built_with") or []
    if not isinstance(bw, list):
        bw = [str(bw)]
    tags = [t for t in bw if isinstance(t, str) and t.strip()][:20]
    url = raw.get("url") or ""
    return NormalizedItem(
        source="devpost",
        source_id=raw.get("slug") or _strip(url).split("/")[-1] or "unknown",
        title=title,
        url=url,
        brief="",
        category="hackathon-project",
        tags=tags,
        org="Devpost",
        prize="",
        prize_usd=None,
        start_at="",
        end_at="",
        phase="finished",
        is_open=False,
        collected_at=_DEVPOST_COLLECTED_AT,
        extra={"dev_score": raw.get("dev_score"), "len": raw.get("len")},
    )

def normalize_k_hackathon(raw: dict) -> NormalizedItem:
    title = (raw.get("title") or "").strip()
    pub = raw.get("pub") or ""
    phase = "finished"
    if pub:
        try:
            from datetime import datetime, timezone
            dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            phase = "finished" if dt < now else "open"
        except Exception:
            pass
    return NormalizedItem(
        source="k_hackathon",
        source_id=(raw.get("source") or "k") + ":" + (raw.get("url") or raw.get("title",""))[:120],
        title=title,
        url=raw.get("url") or "",
        brief=_strip_html(raw.get("summary") or ""),
        category="hackathon",
        tags=[raw.get("source") or "kr"],
        org=raw.get("source") or "",
        prize="",
        prize_usd=None,
        start_at="",
        end_at=pub,
        phase=phase,
        is_open=phase == "open",
        collected_at=COLLECTED_AT,
        extra={"origin": raw.get("source")},
    )



NORMALIZERS = {
    "drivendata":  normalize_drivendata,
    "zindi":       normalize_zindi,
    "codeforces":  normalize_codeforces,
    "hackerone":   normalize_hackerone,
    "hackerearth": normalize_hackerearth,
    "herox":       normalize_herox,
    "topcoder":    normalize_topcoder,
    "openideo":    normalize_openideo,
    "devpost":     normalize_devpost,
    "k_hackathon": normalize_k_hackathon,
}