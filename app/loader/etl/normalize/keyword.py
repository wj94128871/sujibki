"""기술 키워드 정규화 (AC-06-4). 소문자·trim·중복 제거, 동의어 사전 적용.
"""
from __future__ import annotations

SYNONYMS = {
    "javascript": ["js"],
    "typescript": ["ts"],
    "node.js": ["node", "nodejs"],
    "react native": ["reactnative"],
    "next.js": ["nextjs"],
    "postgresql": ["postgres", "pg"],
    "kubernetes": ["k8s"],
    "머신러닝": ["machine learning", "ml"],
    "딥러닝": ["deep learning"],
}


def normalize_keywords(values) -> list:
    """여러 원천(콤마 분리 문자열·list)을 통합해 표준 키워드 배열로."""
    out = []
    for v in (values or []):
        if isinstance(v, str):
            parts = [p.strip() for p in v.replace(";", ",").split(",")]
        else:
            parts = [str(v).strip()]
        for p in parts:
            p = p.strip().lower()
            if not p:
                continue
            canon = p
            for std, alts in SYNONYMS.items():
                if p in alts:
                    canon = std
                    break
            if canon not in out:
                out.append(canon)
    return out
