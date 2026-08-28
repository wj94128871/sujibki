"""표준 카테고리 맵 (FR-03 · AC-03-1 · AC-06-1).
각 소스별 원천 카테고리 값 → 표준 카테고리로 매핑.
미분류는 '기타'로 집계(AC-06-1). 사전은 meta_maps(DB)로 승격 가능(tech-design §5.4).
"""
from __future__ import annotations
from typing import Optional

STD_CATEGORIES = [
    "AI·데이터", "웹", "앱", "플랫폼", "블록체인", "게임",
    "디자인", "기획", "인프라", "하드웨어·IoT", "기타",
]

# 프리모아 fld(1차) / fld_nm_2nd(2차) 키워드 → 표준
FREEMOA_MAP = [
    (("인공지능", "AI", "머신러닝", "딥러닝", "LLM", "RAG", "데이터"), "AI·데이터"),
    (("웹", "웹앱", "프론트", "백엔드", "쇼핑몰", "홈페이지",
      "python", "javascript", "react", "node", "django", "flask", "fastapi",
      "typescript", "html", "css", "소프트웨어"), "웹"),
    (("앱", "모바일", "iOS", "안드로이드", "앱개발"), "앱"),
    (("플랫폼", "B2B", "SaaS", "중개", "매칭"), "플랫폼"),
    (("블록체인", "NFT", "가상자산", "DeFi"), "블록체인"),
    (("게임",), "게임"),
    (("디자인", "UI/UX", "그래픽", "편집"), "디자인"),
    (("기획", "PM", "PO", "기획"), "기획"),
    (("서버", "인프라", "AWS", "클라우드", "데브옵스", "DevOps"), "인프라"),
    (("하드웨어", "IoT", "펌웨어", "임베디드"), "하드웨어·IoT"),
]

U300_PART_MAP = {
    "정보·통신": "AI·데이터",
    "바이오·헬스": "플랫폼",
    "금융": "플랫폼",
    "교육": "플랫폼",
    "콘텐츠": "디자인",
    "소프트웨어": "웹",
    "제조": "하드웨어·IoT",
}


def _match_keywords(text: str) -> Optional[str]:
    t = (text or "").lower()
    if not t:
        return None
    for kws, std in FREEMOA_MAP:
        for k in kws:
            if k.lower() in t:
                return std
    return None


def normalize_freemoa(fld, fld_nm_2nd=None, fld_full=None):
    """프리모아 fld(1차)/fld_nm_2nd(2차)/proj_filed_new → 표준 카테고리.
    2차 분류가 더 구체적이므로 우선, 이후 1차, 끝으로 fld_full 순."""
    for txt in (fld_nm_2nd, fld, fld_full):
        if txt:
            r = _match_keywords(txt)
            if r:
                return r
    return "기타"


def normalize_u300(ipo_part, tags=None):
    """u300 ipoPart(정보·통신 등) → 표준. 매핑 없으면 키워드·기타."""
    key = (ipo_part or "").strip()
    if key in U300_PART_MAP:
        return U300_PART_MAP[key]
    t = (ipo_part or "") + " " + " ".join(tags or [])
    return _match_keywords(t) or "기타"


def normalize_devpost(built_with):
    """Devpost tech 스택 → 표준 카테고리(가장 관련 높은 것)."""
    return _match_keywords(" ".join(built_with or [])) or "기타"


def normalize_default(raw: Optional[str]) -> str:
    return _match_keywords(raw) or "기타"
