#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HackerEarth 챌린지/해커톤 수집(기업 후원 多)
- 목록: GET https://www.hackerearth.com/challenges/  (active/upcoming 탭)
        GET https://www.hackerearth.com/hackathons/  (해커톤 탭)
        페이지네이션 ?page=N
- 상세: GET https://www.hackerearth.com/challenges/<slug> / https://www.hackerearth.com/hackathon/<slug>/
- 봇: 일반 requests OK. JS로 카드가 늦게 뜨는 경우 있어 list HTML에서도 일부 slug 추출.
출력: crawled/hackerearth/
사용법: python crawl_hackerearth.py [--pages 3] [--max-detail 20] [--tabs challenges hackathons]
"""
from __future__ import annotations
import argparse, json, os, re, time, sys, logging
import requests

BASE = "https://www.hackerearth.com"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("hackerearth")

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
    cand: set[str] = set()
    # 상대경로
    cand.update(re.findall(r'href="(/challenges?/[^"#?]+)"', html))
    cand.update(re.findall(r'href="(/hackathons?/[^"#?]+/?)"', html))
    # 절대경로
    cand.update(re.findall(r'href="(https://www\.hackerearth\.com/challenges?/[^"#?]+)"', html))
    cand.update(re.findall(r'href="(https://www\.hackerearth\.com/hackathons?/[^"#?]+/?)"', html))
    # 절대경로일 경우 상대경로로 변환
    norm: list[str] = []
    for c in cand:
        if c.startswith("https://www.hackerearth.com"):
            c = c.replace("https://www.hackerearth.com", "")
        # nav 링크 제외
        for bad in ("/challenges/", "/challenges", "/hackathons/", "/hackathons",
                    "/recruit/", "/community/"):
            if c == bad:
                break
        else:
            norm.append(c)
    return list(dict.fromkeys(n for n in norm if n and n not in ("/challenges","/hackathons")))

def extract_detail(html: str, url: str) -> dict:
    slug = url.rstrip("/").split("/")[-1]
    title_m = re.search(r"<title>(.*?)</title>", html, re.S)
    title = re.sub(r"\s+", " ", title_m.group(1)).strip() if title_m else slug
    brief_m = re.search(r'<meta name="description" content="([^"]+)"', html)
    brief = brief_m.group(1).strip() if brief_m else ""
    return {"slug": slug, "title": title, "brief": brief, "url": url}

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=2)
    ap.add_argument("--max-detail", type=int, default=20)
    ap.add_argument("--tabs", nargs="+", default=["challenges", "hackathons"])
    ap.add_argument("--out", default="crawled/hackerearth")
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    s = session()

    all_links: list[str] = []
    for tab in args.tabs:
        for p in range(1, args.pages + 1):
            u = f"{BASE}/{tab}/" + (f"?page={p}" if p > 1 else "")
            log.info("목록 %s %d %s", tab, p, u)
            r = get(s, u, f"list_{tab}_{p}", args.out)
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
        r = get(s, url, f"detail_{slug.strip('/').replace('/', '_')}", args.out)
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
