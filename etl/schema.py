"""
해커톤/챌린지 표준 스키마 (etl/schema.py)

수집 채널별 원본 필드를 아래 단일 스키마로 정규화한다.

표준 스키마 (normalized dict)
  - source        : str  # "drivendata" | "zindi" | "codeforces" | "hackerone" | "hackerearth" | "herox" | "topcoder" | "openideo" | "devpost" | ...
  - source_id     : str  # 원본 id/slug/handle (없으면 url hash)
  - title         : str  # 영문 위주
  - url           : str  # 사람 확인용 원본 URL
  - brief         : str  # 1~2줄 요약 (없으면 "")
  - category      : str  # 단일 카테고리(첫 번째 태그) 또는 ""
  - tags          : list[str]
  - org           : str  # 주최/스폰서 또는 ""
  - prize         : str  # "$10,000" / "€35 000 EUR" / "" — 단일 표기
  - prize_usd     : int|None  # 환산 시도 (best-effort, 실패 시 None)
  - start_at      : str  # ISO8601 또는 ""
  - end_at        : str  # ISO8601 또는 ""
  - phase         : str  # "open" | "upcoming" | "finished" | "unknown"
  - is_open       : bool
  - language      : str  # "en" | "ko" | "" (현재는 en 가정)
  - collected_at  : str  # ISO8601
  - extra         : dict  # 채널 한정 추가 필드

정제기는 etl/normalize.py에 위치하며, 채널별 함수:
  normalize_drivendata(raw)  -> NormalizedItem
  normalize_zindi(raw)       -> NormalizedItem
  normalize_codeforces(raw)  -> NormalizedItem
  normalize_hackerone(raw)   -> NormalizedItem
  normalize_hackerearth(raw) -> NormalizedItem
  normalize_herox(raw)       -> NormalizedItem
  normalize_topcoder(raw)    -> NormalizedItem
  normalize_openideo(raw)    -> NormalizedItem
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Any

@dataclass
class NormalizedItem:
    source: str
    source_id: str
    title: str
    url: str
    brief: str = ""
    category: str = ""
    tags: list[str] = field(default_factory=list)
    org: str = ""
    prize: str = ""
    prize_usd: int | None = None
    start_at: str = ""
    end_at: str = ""
    phase: str = "unknown"
    is_open: bool = False
    language: str = "en"
    collected_at: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)
