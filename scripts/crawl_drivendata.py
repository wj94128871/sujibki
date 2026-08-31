#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DrivenData 사회문제 해커톤(챌린지) 수집 크롤러
- 목록: GET https://www.drivendata.org/competitions/  (페이지네이션 ?page=N)
- 상세: GET https://www.drivendata.org/competitions/<slug>/                  (200)
        - 필드: 제목, 요약, 주최, 상금, 마감, 카테고리(해시태그)
- 봇: 없음(일반 requests OK), 단 UA는 일반 브라우저로.
출력: crawled/drivendata/
  - list_<page>.html, detail_<slug>.html, competitions.json, meta.json
사용법:
  python crawl_drivendata.py [--pages 5] [--max-detail 20] [--out crawled/drivendata]
"""
from __future__ import annotations
import argparse, json, os, re, time, sys, logging
from typing import Any
import requests

BASE = "https://www.drivendata.org"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("drivendata")

def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    return s

def get(s: requests.Session, url: str, tag: str, outdir: str, retry: int = 3) -> requests.Response | None:
    for i in range(retry):
        try:
            r = s.get(url, timeout=30)
            if r.status_code == 200:
                if outdir and tag:
                    with open(os.path.join(outdir, f"{tag}.html"), "w", encoding="utf-8") as f:
                        f.write(r.text)
                return r
            log.warning("[%s] %s", r.status_code, url)
            time.sleep(2)
        except Exception as e:
            log.warning("retry %d %s: %s", i, type(e).__name__, e)
            time.sleep(3)
    return None

def extract_competition_links(html: str) -> list[str]:
    cand = re.findall(r'href="(/competitions/[^"?#]+)"', html)
    cand = [c for c in cand if c and c not in ("/competitions", "/competitions/")]
    return list(dict.fromkeys(cand))

def extract_detail(html: str, url: str) -> dict[str, Any]:
    """상세 페이지에서 핵심 필드 추출."""
    slug = url.rstrip("/").split("/")[-1]
    title_m = re.search(r"<title>(.*?)</title>", html, re.S)
    title = re.sub(r"\s+", " ", title_m.group(1)).strip() if title_m else slug
    # brief description
    brief_m = re.search(r'<meta name="description" content="([^"]+)"', html)
    brief = brief_m.group(1).strip() if brief_m else ""
    # hashtags
    tags = re.findall(r'href="/competitions/\?category=[^"]+"[^>]*>([^<]+)</a>', html)
    tags = list(dict.fromkeys(t.strip() for t in tags if t.strip()))
    # prize
    prize_m = re.search(r"\$\s*([0-9,]+)", html)
    prize = prize_m.group(1) if prize_m else ""
    # deadline heuristic
    dl_m = re.findall(r"(\d{4}-\d{2}-\d{2})", html)
    deadline = dl_m[0] if dl_m else ""
    return {"slug": slug, "title": title, "brief": brief, "tags": tags, "prize_usd": prize, "deadline": deadline, "url": url}

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=3)
    ap.add_argument("--max-detail", type=int, default=30)
    ap.add_argument("--out", default="crawled/drivendata")
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    s = session()

    all_links: list[str] = []
    for p in range(1, args.pages + 1):
        u = f"{BASE}/competitions/?page={p}"
        log.info("목록 %d %s", p, u)
        r = get(s, u, f"list_{p}", args.out)
        if not r:
            continue
        links = extract_competition_links(r.text)
        log.info("  슬러그 %d개", len(links))
        all_links += links
        time.sleep(args.delay)
    all_links = list(dict.fromkeys(all_links))
    log.info("총 유니크 %d개", len(all_links))

    meta: dict[str, Any] = {
        "list_links": [BASE + x for x in all_links],
        "detail": [],
        "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    comps: list[dict[str, Any]] = []
    targets = all_links[: args.max_detail] if args.max_detail > 0 else all_links
    for i, slug in enumerate(targets):
        url = BASE + slug
        r = get(s, url, f"detail_{slug.strip('/').split('/')[-1]}", args.out)
        if r is None:
            continue
        d = extract_detail(r.text, url)
        comps.append(d)
        meta["detail"].append(d["slug"])
        if (i + 1) % 10 == 0:
            log.info("  진행 %d/%d", i + 1, len(targets))
        time.sleep(args.delay)

    with open(os.path.join(args.out, "competitions.json"), "w", encoding="utf-8") as f:
        json.dump(comps, f, ensure_ascii=False, indent=2)
    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    log.info("완료: 상세 %d건 저장", len(comps))

if __name__ == "__main__":
    main()
