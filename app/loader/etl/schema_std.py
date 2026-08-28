"""공통 안건 표준 스키마 (StandardProject).
각 크롤러 원천(위시켓/프리모아/u300/Devpost) raw 데이터를 이 표준 형태로 정규화한다.
PII(client_id/이메일)는 절대 포함하지 않는다(NFR-06 · TC-06).
"""
from __future__ import annotations
import dataclasses
import re
import json
from typing import Optional

# group_type 상수
SI_CONTRACT = "si_contract"   # 도급/기간제 (위시켓·프리모아)
STARTUP = "startup"           # 스타트업 공모 (u300)
HACKATHON = "hackathon"       # 해커톤 (Devpost)

# work_type 정규화
WORK_CONTRACT = "contract"
WORK_TERM = "term"
WORK_ONSITE = "onsite"
WORK_STARTUP = "startup"
WORK_HACKATHON = "hackathon"


@dataclasses.dataclass
class StandardProject:
    """표준 안건 1건. 컬럼 = projects 테이블(tech-design §5.1)과 1:1."""
    source: str                 # wishket|freemoa|u300|devpost
    runtime: str = ""           # u300: current|past1
    source_ref: str = ""        # 원본 ID(proj_idx/icNo/peNo/slug)
    group_type: str = ""
    title: str = ""
    category: Optional[str] = None
    category_sub: Optional[str] = None
    budget_min: Optional[int] = None   # KRW
    budget_max: Optional[int] = None
    budget_unit: str = "KRW"           # KRW|KRW_MONTH
    period_days: Optional[int] = None
    region: Optional[str] = None
    work_type: str = ""
    role: Optional[str] = None
    level: Optional[str] = None
    tech_keywords: list = dataclasses.field(default_factory=list)
    registered_at: Optional[str] = None
    deadline: Optional[str] = None
    applicants: Optional[int] = None
    source_url: str = ""
    raw: dict = dataclasses.field(default_factory=dict)  # raw_json(적재 전 PII 필터 통과)

    @property
    def dedupe_key(self) -> tuple:
        return (self.source, self.runtime, self.source_ref)

    def to_dict(self):
        d = dataclasses.asdict(self)
        d["raw"] = dict(d["raw"]) if self.raw else None
        return d
