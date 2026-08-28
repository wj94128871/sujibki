"""날짜 정규화 (AC-03-1). 여러 raw 포맷을 ISO8601로. 파싱 실패는 None 허용.
"""
from __future__ import annotations
from typing import Optional
from datetime import datetime, timezone

FORMATS = [
    "%Y-%m-%dT%H:%M:%S%z",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
    "%Y-%m-%dT%H:%M:%S",
    "%Y.%m.%d",
    "%Y/%m/%d",
]


def normalize_date(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    s = str(value).strip()
    if not s:
        return None
    # ISO
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
    except ValueError:
        pass
    for fmt in FORMATS:
        try:
            return datetime.strptime(s, fmt).astimezone(timezone.utc).isoformat()
        except ValueError:
            continue
    return None
