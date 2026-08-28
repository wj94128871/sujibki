"""PII 필터 (NFR-06 · TC-06 · AC-01-2).
- 'client_id'(이메일)·개인정보를 raw data/문자열에서 제거한다.
- freemoa 원천의 client_id 컬럼은 projects 스키마에 미생성(스키마 차단) + 여기서도 raw에서 제거.
"""
from __future__ import annotations
import re

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PII_KEYS = {"client_id", "email", "mail", "phone", "hp", "tel", "mobile", "passwd", "password"}


def sanitize_text(text) -> str:
    """도메인/본문 텍스트에서 이메일을 치환. 이메일이 아닌 토큰은 유지."""
    return EMAIL_RE.sub("[email]", text)


def filter_dict(obj, _key=""):
    """dict/JSON raw에서 PII 키와 이메일 값을 제거(중첩 포함). TC-06 목표."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            lk = str(k).lower()
            if lk in PII_KEYS:
                continue  # client_id 등 키 자체를 제거
            if isinstance(v, dict):
                out[k] = filter_dict(v, lk)
            elif isinstance(v, list):
                out[k] = [filter_dict(i, lk) for i in v]
            elif isinstance(v, str):
                out[k] = sanitize_text(v)
            else:
                out[k] = v
        return out
    elif isinstance(obj, list):
        return [filter_dict(i, _key) for i in obj]
    elif isinstance(obj, str):
        return sanitize_text(obj)
    return obj


def has_email(any_obj) -> bool:
    """검증용: 어떤 구조에 이메일 패턴이 남아있는지. TC-06 검증."""
    hit = {"found": False}

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if isinstance(v, (dict, list)):
                    walk(v)
                elif isinstance(v, str) and EMAIL_RE.search(v):
                    hit["found"] = True
                elif isinstance(k, str) and EMAIL_RE.search(k):
                    hit["found"] = True
        elif isinstance(o, list):
            for i in o:
                walk(i)
        elif isinstance(o, str) and EMAIL_RE.search(o):
            hit["found"] = True
    walk(any_obj)
    return hit["found"]
