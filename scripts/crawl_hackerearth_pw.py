#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HackerEarth 챌린지/해커톤 수집 (Playwright 헤드리스)
- 카드 selector: href="https://www.hackerearth.com/(challenges|hackathons)/<slug>/"
- 정적 fallback의 한계 보완: cards are rendered by JS, requires Playwright
출력: crawled/hackerearth_pw/
사용법: python crawl_hackerearth_pw.py [--max-detail 20] [--tabs challenges hackathons]
"""
from __future__ import annotations
import argparse, json, os, re, time, sys, logging
from playwright.sync_api import sync_playwright

BASE = "https://www.hackerearth.com"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("hackerearth_pw")

CARD_HREF_RE = re.compile(r"https?://www\.hackerearth\.com/(?:challenges|hackathons?)/[\w-]+/?")

def collect_links(page, url: str, scrolls: int = 6) -> list[str]:
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        for _ in range(scrolls):
            page.mouse.wheel(0, 1500)
            page.wait_for_timeout(700)
        html = page.content()
    except Exception as e:
        log.warning("  %s 실패: %s", url, e)
        return []
    return list(dict.fromkeys(CARD_HREF_RE.findall(html)))

def extract_detail(page, url: str, outdir: str) -> dict:
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", url)
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        title = page.title()
        text = page.evaluate("() => document.body.innerText.slice(0, 4000)")
        html = page.content()
        with open(os.path.join(outdir, f"detail_{safe[:80]}.html"), "w", encoding="utf-8") as f:
            f.write(html)
    except Exception as e:
        log.warning("  상세 %s 실패: %s", url, e)
        return {"url": url, "error": str(e)}
    return {"url": url, "title": title, "text_excerpt": text, "slug": url.rstrip("/").split("/")[-1]}

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tabs", nargs="+", default=["challenges", "hackathons"])
    ap.add_argument("--max-detail", type=int, default=20)
    ap.add_argument("--out", default="crawled/hackerearth_pw")
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=UA)
        page = ctx.new_page()
        page.set_default_timeout(20000)
        page.set_default_navigation_timeout(30000)

        all_urls: list[str] = []
        for tab in args.tabs:
            u = f"{BASE}/{tab}/"
            log.info("탭 %s -> %s", tab, u)
            found = collect_links(page, u)
            log.info("  후보 %d건", len(found))
            for f in found:
                if f not in all_urls:
                    all_urls.append(f)
            time.sleep(args.delay)
        log.info("총 유니크 %d건", len(all_urls))

        meta = {"urls": all_urls, "detail": [], "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
        details = []
        targets = all_urls[: args.max_detail] if args.max_detail > 0 else all_urls
        for i, u in enumerate(targets):
            d = extract_detail(page, u, args.out)
            details.append(d)
            meta["detail"].append(u)
            if (i + 1) % 5 == 0:
                log.info("  진행 %d/%d", i + 1, len(targets))
            time.sleep(args.delay)

        with open(os.path.join(args.out, "competitions.json"), "w", encoding="utf-8") as f:
            json.dump(details, f, ensure_ascii=False, indent=2)
        with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        log.info("완료: 상세 %d건", len(details))
        browser.close()

if __name__ == "__main__":
    main()
