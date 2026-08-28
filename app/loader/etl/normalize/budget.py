"""예산 정규화 (FR-03 · AC-03-1 · AC-06-2).
- 프리모아 cost_min/max는 '만원' 단위 → ×10,000 원으로 통일.
- 위시켓 '원/월'은 budget_unit='KRW_MONTH'로 구분, 총액 형태는 'KRW'.
- 값 0 / '협의 후 결정' / 공백/None → budget=None (분포 제외 + null 카운트).
"""
from __future__ import annotations
from typing import Optional

_MAN_WON = 10_000
_NEGOTIATION = {"협의", "협의 후", "협의후", "상담", "추후 협의", "0", ""}


def _to_int_robust(v) -> Optional[int]:
    if v is None:
        return None
    s = str(v).replace(",", "").strip()
    if s in _NEGOTIATION:
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        m = re_search_digits(s)
        return m


def re_search_digits(s: str) -> Optional[int]:
    import re
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    return int(float(m.group(1))) if m else None


def normalize_freemoa(cost_min, cost_max) -> tuple[Optional[int], Optional[int]]:
    """프리모아 cost_* 는 '만원' → 원으로 환산."""
    lo, hi = _to_int_robust(cost_min), _to_int_robust(cost_max)
    if lo is None and hi is None:
        return None, None
    lo = lo * _MAN_WON if lo is not None else None
    hi = hi * _MAN_WON if hi is not None else None
    return lo, hi


def normalize_wishket(budget_expr, unit: str = "KRW") -> tuple[Optional[int], Optional[int], str]:
    """위시켓 예산 문자열을 파싱. 예) '1,200만원', '5,000원/월', '협의 후 결정'."""
    if not budget_expr or str(budget_expr).strip() in {"", "0", "협의 후 결정", "협의"}:
        return None, None, unit
    s = str(budget_expr).replace(",", "").strip()
    is_month = ("월" in s and "원" in s) or "/월" in s
    u = "KRW_MONTH" if is_month else unit
    num = _to_int_robust(s)
    if num is None:
        return None, None, u
    if "만" in s:
        num = num * _MAN_WON
    return num, num, u
