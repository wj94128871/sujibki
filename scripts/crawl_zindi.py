#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Zindi 아프리카·신흥국 시장 ML/AI 챌린지 수집 (공식 API 기반)
- API: GET https://api.zindi.africa/v1/competitions?page=N&per_page=20
  - meta.total_count = 502
  - 항목 필드: id, title, kind, open, start_time, end_time, reward, organization, participations_count 등
- 봇: 없음(일반 requests OK).
출력: crawled/zindi/
  - list_<page>.json, detail_<id>.json, competitions.json, meta.json
사용법: python crawl_zindi.py [--pages 5] [--max-detail 30] [--per-page 20]
"""
from __future__ import annotations
import argparse, json, os, time, sys, logging
import requests

API = "https://api.zindi.africa/v1/competitions"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("zindi")

def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept": "application/json", "Accept-Language": "en-US,en;q=0.9"})
    return s

def get(s: requests.Session, url: str, tag: str, outdir: str, retry: int = 3):
    for i in range(retry):
        try:
            r = s.get(url, timeout=30)
            if r.status_code == 200:
                if outdir and tag:
                    with open(os.path.join(outdir, f"{tag}.json"), "w", encoding="utf-8") as f:
                        json.dump(r.json(), f, ensure_ascii=False, indent=2)
                return r.json()
            log.warning("[%s] %s", r.status_code, url)
            time.sleep(2)
        except Exception as e:
            log.warning("retry %d %s: %s", i, type(e).__name__, e)
            time.sleep(3)
    return None

def fetch_page(s: requests.Session, page: int, per_page: int, outdir: str) -> tuple[list, dict]:
    u = f"{API}?page={page}&per_page={per_page}"
    log.info("목록 page=%d per_page=%d", page, per_page)
    data = get(s, u, f"list_{page}", outdir)
    if not data:
        return [], {}
    return data.get("data", []) or [], data.get("meta", {}) or {}

def normalize(item: dict) -> dict:
    return {
        "id": item.get("id"),
        "title": item.get("title"),
        "kind": item.get("kind"),
        "open": item.get("open"),
        "start_time": item.get("start_time"),
        "end_time": item.get("end_time"),
        "entries_close_at": item.get("entries_close_at"),
        "reward": item.get("reward"),
        "reward_type": item.get("reward_type"),
        "organization": item.get("organization"),
        "participations_count": item.get("participations_count"),
        "is_beginner_friendly": item.get("is_beginner_friendly"),
        "cohort": item.get("cohort"),
        "url": f"https://zindi.africa/competitions/{item.get('id')}",
    }

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=5)
    ap.add_argument("--max-detail", type=int, default=30, help="상세 정규화 최대 건수 (0=전체)")
    ap.add_argument("--per-page", type=int, default=20)
    ap.add_argument("--out", default="crawled/zindi")
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    s = session()

    all_items: list = []
    last_meta: dict = {}
    for p in range(1, args.pages + 1):
        items, meta = fetch_page(s, p, args.per_page, args.out)
        log.info("  page=%d items=%d meta=%s", p, len(items), meta)
        all_items += items
        last_meta = meta
        if not items:
            break
        time.sleep(args.delay)
    log.info("총 수집 %d건 (total_count=%s)", len(all_items), last_meta.get("total_count"))

    normalized = [normalize(it) for it in all_items]
    # 상세는 API에 별도 endpoint가 없으므로 normalize까지만
    detail = normalized[: args.max_detail] if args.max_detail > 0 else normalized

    with open(os.path.join(args.out, "competitions.json"), "w", encoding="utf-8") as f:
        json.dump(detail, f, ensure_ascii=False, indent=2)
    meta_out = {
        "total_count": last_meta.get("total_count"),
        "open_count": last_meta.get("open_count"),
        "closed_count": last_meta.get("closed_count"),
        "pages_fetched": args.pages,
        "items_total": len(all_items),
        "detail_count": len(detail),
        "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta_out, f, ensure_ascii=False, indent=2)
    log.info("완료: 상세 %d건 저장", len(detail))

if __name__ == "__main__":
    main()
