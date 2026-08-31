#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
해커톤/챌린지 통합 ETL
- 입력: crawled/<source>/competitions.json
- 변환: etl.normalize.NORMALIZERS[*] → etl.schema.NormalizedItem
- 출력: crawled/_runs/hackathons_normalized.json  (전체 + source별 통계)

사용법:
  python etl_hackathons.py                 # 기본 crawled/ 하위
  python etl_hackathons.py --crawled crawled --out crawled/_runs/hackathons_normalized.json
  python etl_hackathons.py --only zindi codeforces
"""
from __future__ import annotations
import argparse, json, os, sys, time, logging
from collections import Counter

# scripts/에서 etl/을 import할 수 있도록 경로 보강
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)  # so `import etl` works when cwd is project root
sys.path.insert(0, HERE)  # so `import etl` works when cwd is scripts/

from etl.normalize import NORMALIZERS  # noqa: E402
from etl.schema import NormalizedItem  # noqa: E402

# crawled/<folder> -> normalize source name
# (일부 크롤러는 폴더명에 suffix(_pw)를 두지만, 표준 source에서는 동일하게 본다)
FOLDER_TO_SOURCE = {
    "drivendata":   "drivendata",
    "zindi":        "zindi",
    "codeforces":   "codeforces",
    "hackerone":    "hackerone",
    "hackerone_pw": "hackerone",
    "hackerearth":     "hackerearth",
    "hackerearth_pw":  "hackerearth",
    "herox":           "herox",
    "topcoder":     "topcoder",
    "openideo":     "openideo",
    "devpost":      "devpost",
    "k_hackathon":  "k_hackathon",
    "herox_pw":     "herox",
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("etl_hackathons")


def load_source(source_folder: str, crawled_dir: str) -> list[dict]:
    path = os.path.join(crawled_dir, source_folder, "competitions.json")
    if not os.path.exists(path):
        log.warning("  %s 없음 (스킵)", path)
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
    except Exception as e:
        log.error("  %s 로드 실패: %s", path, e)
    return []


def normalize_source(source: str, items: list[dict]) -> tuple[list[dict], int]:
    fn = NORMALIZERS.get(source)
    if not fn:
        log.warning("  %s: 정제기 없음 (스킵)", source)
        return [], 0
    out: list[dict] = []
    bad = 0
    for it in items:
        try:
            n: NormalizedItem = fn(it)
            if not n.title or not n.url:
                bad += 1
                continue
            out.append(n.to_dict())
        except Exception as e:
            log.warning("  %s 항목 정제 실패: %s", source, e)
            bad += 1
    return out, bad


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--crawled", default="crawled")
    ap.add_argument("--out", default="crawled/_runs/hackathons_normalized.json")
    ap.add_argument("--only", nargs="+", default=None)
    args = ap.parse_args()

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)

    sources = args.only or list(FOLDER_TO_SOURCE.keys())
    log.info("=== 해커톤 ETL 시작 (소스 %d개) ===", len(sources))

    all_items: list[dict] = []
    by_source: dict[str, int] = {}
    bad_by_source: dict[str, int] = {}
    for src in sources:
        raw = load_source(src, args.crawled)
        norm, bad = normalize_source(FOLDER_TO_SOURCE[src], raw)
        all_items.extend(norm)
        norm_source = FOLDER_TO_SOURCE[src]
        by_source[norm_source] = len(norm)
        bad_by_source[norm_source] = bad
        log.info("  %-12s (folder=%s) raw=%4d → normalized=%4d (스킵 %d)", FOLDER_TO_SOURCE[src], src, len(raw), len(norm), bad)

    # 중복 제거: (source, source_id) 기준
    seen = set()
    uniq: list[dict] = []
    dup = 0
    for it in all_items:
        k = (it["source"], it["source_id"])
        if k in seen:
            dup += 1
            continue
        seen.add(k)
        uniq.append(it)
    log.info("전체 %d건, 중복 %d건 → 유니크 %d건", len(all_items), dup, len(uniq))

    # 통계
    phase_counter = Counter(it["phase"] for it in uniq)
    open_counter = Counter(it["source"] for it in uniq if it["is_open"])
    prize_vals = [it["prize_usd"] for it in uniq if it.get("prize_usd")]
    prize_sum = sum(prize_vals) if prize_vals else 0
    log.info("phase 분포: %s", dict(phase_counter))
    log.info("소스별 open 건수: %s", dict(open_counter))
    log.info("prize_usd 합계: %s (n=%d)", prize_sum, len(prize_vals))

    summary = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "items_total": len(uniq),
        "items_dedup_dropped": dup,
        "by_source": by_source,
        "bad_by_source": bad_by_source,
        "phase_count": dict(phase_counter),
        "open_by_source": dict(open_counter),
        "prize_usd_sum": prize_sum,
        "prize_usd_count": len(prize_vals),
    }
    payload = {
        "summary": summary,
        "items": uniq,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    log.info("저장: %s", args.out)

    # 짧은 stdout 요약
    print()
    print("=== 요약 ===")
    for k, v in summary.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
