#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Codeforces 알고리즘/해커톤 라운드 수집 (공식 API)
- API: GET https://codeforces.com/api/contest.list?gym=false
  - status=OK, result=[{id, name, type, phase, startTimeSeconds, durationSeconds, ...}]
  - type: CF, IOI, ICPC / phase: BEFORE, CODING, PENDING_SYSTEM_TEST, FINISHED
  - 2143+ 라운드
- 봇: 없음(requests OK). 분당 쿼터는 부드럽게 유지.
출력: crawled/codeforces/
사용법: python crawl_codeforces.py [--gym false] [--out crawled/codeforces]
"""
from __future__ import annotations
import argparse, json, os, time, sys, logging
import requests

API = "https://codeforces.com/api/contest.list"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("codeforces")

def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept": "application/json"})
    return s

def get(s: requests.Session, params: dict, tag: str, outdir: str, retry: int = 3):
    for i in range(retry):
        try:
            r = s.get(API, params=params, timeout=30)
            if r.status_code == 200:
                if outdir and tag:
                    with open(os.path.join(outdir, f"{tag}.json"), "w", encoding="utf-8") as f:
                        json.dump(r.json(), f, ensure_ascii=False, indent=2)
                return r.json()
            log.warning("[%s] %s", r.status_code, r.url)
            time.sleep(2)
        except Exception as e:
            log.warning("retry %d %s: %s", i, type(e).__name__, e)
            time.sleep(3)
    return None

def normalize(c: dict) -> dict:
    return {
        "id": c.get("id"),
        "name": c.get("name"),
        "type": c.get("type"),
        "phase": c.get("phase"),
        "frozen": c.get("frozen"),
        "durationSeconds": c.get("durationSeconds"),
        "startTimeSeconds": c.get("startTimeSeconds"),
        "relativeTimeSeconds": c.get("relativeTimeSeconds"),
        "url": f"https://codeforces.com/contest/{c.get('id')}",
    }

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gym", default="false", choices=["true", "false"])
    ap.add_argument("--out", default="crawled/codeforces")
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    s = session()

    log.info("API 호출 gym=%s", args.gym)
    data = get(s, {"gym": args.gym}, f"list_gym{args.gym}", args.out)
    if not data or data.get("status") != "OK":
        log.error("API 실패")
        return
    items = data.get("result", [])
    log.info("수신 %d건", len(items))
    norm = [normalize(c) for c in items]
    # phase 통계
    phase_count: dict[str, int] = {}
    for c in norm:
        phase_count[c["phase"]] = phase_count.get(c["phase"], 0) + 1
    log.info("phase 통계: %s", phase_count)

    with open(os.path.join(args.out, "competitions.json"), "w", encoding="utf-8") as f:
        json.dump(norm, f, ensure_ascii=False, indent=2)
    meta = {
        "gym": args.gym,
        "items_total": len(norm),
        "phase_count": phase_count,
        "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    log.info("완료: 저장 %d건", len(norm))

if __name__ == "__main__":
    main()
