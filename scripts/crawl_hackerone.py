#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HackerOne 공개 버그바운티 프로그램 수집 — "기업의 보안/UX 결함" → 시장 신호
- 목록: GET https://hackerone.com/opportunities/all/search?ordering=Newest+programs
        (program 카드 href="/<program_handle>")
- 상세: GET https://hackerone.com/<program_handle> (공개 페이지)
- 봇: 없음(requests OK).
출력: crawled/hackerone/
사용법: python crawl_hackerone.py [--pages 5] [--max-detail 20]
"""
from __future__ import annotations
import argparse, json, os, re, time, sys, logging
import requests

BASE = "https://hackerone.com"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("hackerone")

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

def extract_links(html: str) -> list[str]:
    # H1 프로그램 카드는 href="/<handle>" 형태. 자산/디렉토리 페이지 제외.
    cand = re.findall(r'href="/([A-Za-z0-9][A-Za-z0-9_-]{1,40})"', html)
    bad = {"opportunities", "directory", "users", "programs", "leaderboard", "about", "contact", "login", "signup", "search"}
    out = []
    for c in cand:
        if c in bad:
            continue
        if c.startswith("blog") or c.startswith("page"):
            continue
        out.append("/" + c)
    return list(dict.fromkeys(out))

def extract_detail(html: str, url: str) -> dict:
    slug = url.rstrip("/").split("/")[-1]
    title_m = re.search(r"<title>(.*?)</title>", html, re.S)
    title = re.sub(r"\s+", " ", title_m.group(1)).strip() if title_m else slug
    brief_m = re.search(r'<meta name="description" content="([^"]+)"', html)
    brief = brief_m.group(1).strip() if brief_m else ""
    # bounty range
    bounty_m = re.search(r"\$\s*([0-9,]+)\s*[-–]\s*\$\s*([0-9,]+)", html)
    bounty = f"{bounty_m.group(1)}-{bounty_m.group(2)}" if bounty_m else ""
    return {"slug": slug, "title": title, "brief": brief, "bounty_usd": bounty, "url": url}

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=3)
    ap.add_argument("--max-detail", type=int, default=20)
    ap.add_argument("--out", default="crawled/hackerone")
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    s = session()

    all_links: list[str] = []
    for p in range(1, args.pages + 1):
        u = f"{BASE}/opportunities/all/search?ordering=Newest+programs&page={p}"
        log.info("목록 %d %s", p, u)
        r = get(s, u, f"list_{p}", args.out)
        if not r:
            continue
        links = extract_links(r.text)
        log.info("  슬러그 %d개", len(links))
        all_links += links
        time.sleep(args.delay)
    all_links = list(dict.fromkeys(all_links))
    log.info("총 유니크 %d개", len(all_links))

    meta = {"list_links": [BASE + x for x in all_links], "detail": [], "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
    comps = []
    targets = all_links[: args.max_detail] if args.max_detail > 0 else all_links
    for i, slug in enumerate(targets):
        url = BASE + slug
        r = get(s, url, f"detail_{slug.strip('/')}", args.out)
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
