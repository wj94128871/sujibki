# -*- coding: utf-8 -*-
"""Epic1 정규화·파서·PII 단위 테스트 (TC-06/07, AC-03)."""
import pytest
from etl.normalize.budget import normalize_freemoa, normalize_wishket
from etl.normalize.category import normalize_freemoa as ncat_fm, normalize_u300, normalize_devpost
from etl.normalize.date import normalize_date
from etl.normalize.keyword import normalize_keywords
from etl.parsers import from_freemoa, from_u300_current, from_u300_past1, from_devpost
from etl.piifilter import filter_dict, has_email


def test_budget_freemoa_manwon_to_won():
    lo, hi = normalize_freemoa("2500", "3500")
    assert lo == 25_000_000 and hi == 35_000_000  # 만원→원
    assert normalize_freemoa("0", None) == (None, None)
    assert normalize_freemoa(None, "100") == (None, 1_000_000)


def test_budget_wishket():
    lo, hi, unit = normalize_wishket("1,200만원")
    assert (lo, hi) == (12_000_000, 12_000_000) and unit == "KRW"
    lo, hi, unit = normalize_wishket("5,000원/월")
    assert unit == "KRW_MONTH"
    assert normalize_wishket("협의 후 결정")[0] is None


def test_category_maps():
    assert ncat_fm("개발", "웹") == "웹"
    assert ncat_fm("개발", "웹", "개발,디자인,기획") == "웹"  # 2차 분류 우선
    assert normalize_u300("정보·통신") == "AI·데이터"
    assert normalize_devpost(["python", "react"]) == "웹"
    assert normalize_u300("기타영역") == "기타"


def test_date():
    assert normalize_date("2026-08-20 14:25:51").startswith("2026-08-20")
    assert normalize_date("2026-08-20T17:18:46+0900").startswith("2026-08-20")
    assert normalize_date("notadate") is None
    assert normalize_date(None) is None


def test_keywords_dedup_synonym():
    kws = normalize_keywords(["Python, JavaScript, JS, React", "PYTHON"])
    assert "js" not in kws and "javascript" in kws
    assert kws.count("python") == 1


def test_piifilter_removes_email():
    raw = {"client_id": "ok@mail.net", "title": "프로젝트 abc", "nested": {"email": "x@y.com"}}
    out = filter_dict(raw)
    assert has_email(out) is False
    assert "client_id" not in out and "email" not in out


def test_piifilter_keeps_non_email_token():
    # TC-06 경계: client_id가 비이메일 토큰(예: 'lduckh')인 경우 — 원칙상 제거(저장 제외)
    out = filter_dict({"client_id": "lduckh"})
    assert out == {}
    out2 = filter_dict({"title": "lduckh 파트너"})
    assert out2 == {"title": "lduckh 파트너"}


def test_freemoa_parser_excludes_pii():
    item = {
        "proj_idx": "48384", "title": "중고 명품 매입 웹앱", "cost_min": "2500", "cost_max": "3500",
        "during": "90", "fld": "개발", "fld_nm_2nd": "웹", "pv_smallnm": "서울",
        "workType": "1", "proj_language": "웹앱, 플랫폼", "INS_TIME": "2026-08-20 14:25:51",
        "ALL_APPLY_COUNT": "5", "client_id": "ok@mail.net",
    }
    p = from_freemoa(item)
    assert p.source == "freemoa" and p.budget_min == 25_000_000
    assert p.period_days == 90 and p.category == "웹" and p.applicants == 5
    # raw에 client_id가 남아있으므로 적재 직전 PII 필터 필요 권장 — 여기서는 필터 적용 확인
    out = filter_dict(p.raw)
    assert has_email(out) is False


# ---------------- [2026-08-25] 시계열 복원: u300 uploadCreatedAt · Devpost submitted_date ----------------
def test_u300_current_registered_at_from_upload_created_at():
    data = {
        "icNo": 381, "teamName": "마니도", "companyTitle": "RAG 영어학습",
        "topTrackName": "(2026)모집 및 선발", "ipoPart": "정보·통신", "teamRegion": "호남제주권",
        "hashTags": ["rag"], "companyContent": "<p>소개</p>",
        "uploadFiles": [
            {"createdAt": "2026-07-16 17:02:53"},
            {"createdAt": "2026-07-10 09:00:00"},  # 최소값이 등록일 프록시
        ],
    }
    p = from_u300_current(data)
    assert p.registered_at is not None and p.registered_at.startswith("2026-07-10")
    assert p.raw["date_source"] == "upload_created_at"


def test_u300_current_no_dates_keeps_year_only():
    data = {
        "icNo": 999, "teamName": "테스트", "companyTitle": "t",
        "topTrackName": "(2026)모집 및 선발", "ipoPart": "정보·통신",
        "uploadFiles": [],
    }
    p = from_u300_current(data)
    assert p.registered_at is None          # 연도를 날짜로 위조하지 않음
    assert p.raw.get("track_year") == "2026"
    assert p.raw["date_source"] == "track_year"


def test_devpost_registered_at_from_time_tag_iso():
    d = {"slug": "x", "title": "X | Devpost", "built_with": ["react"],
         "submitted_date": "2026-08-16T13:58:03-04:00", "url": "https://devpost.com/software/x"}
    p = from_devpost(d)
    assert p.registered_at is not None and p.registered_at.startswith("2026-08-16")


def test_devpost_registered_at_from_header_text_fallback():
    d = {"slug": "y", "title": "Y | Devpost", "built_with": ["python"],
         "submitted_date": "August 17, 2026", "url": "https://devpost.com/software/y"}
    p = from_devpost(d)
    assert p.registered_at == "2026-08-17T00:00:00+00:00"


def test_devpost_bogus_body_date_rejected():
    # 본문 오염 날짜(예: "January 1, 2015")는 구조적 신호가 아니므로 정규화 실패 시 None 유지
    d = {"slug": "z", "title": "Z | Devpost", "built_with": [],
         "submitted_date": None, "url": "https://devpost.com/software/z"}
    p = from_devpost(d)
    assert p.registered_at is None
