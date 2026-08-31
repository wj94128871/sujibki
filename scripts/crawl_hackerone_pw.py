#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HackerOne 공개 버그바운티 프로그램 수집 (Playwright 헤드리스 기반)
- 카드 selector: <a href="/<handle>/safe_harbor"> 같은 프로그램 카드 → handle 추출
- 상세: GET https://hackerone.com/<handle> (Playwright로 렌더된 텍스트 추출)
- 봇: Playwright(impersonate=chrome) 필수. raw 정적 fetch는 1.8KB thin shell.
출력: crawled/hackerone/
사용법: python crawl_hackerone_pw.py [--pages 3] [--max-detail 20]
"""
from __future__ import annotations
import argparse, json, os, re, time, sys, logging
from playwright.sync_api import sync_playwright

BASE = "https://hackerone.com"
LISTING = f"{BASE}/opportunities/all/search?ordering=Newest+programs"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("hackerone_pw")

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"

CARD_RE = re.compile(r'href="/([A-Za-z0-9][A-Za-z0-9_-]{1,60})/safe_harbor"')

def collect_handles(page, listing_url: str, pages: int) -> list[str]:
    handles: list[str] = []
    for p in range(1, pages + 1):
        url = listing_url + (f"&page={p}" if p > 1 else "")
        log.info("목록 p%d %s", p, url)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(2500)
            html = page.content()
        except Exception as e:
            log.warning("  실패 %s", e)
            continue
        found = list(dict.fromkeys(CARD_RE.findall(html)))
        log.info("  핸들 %d개", len(found))
        handles += found
        time.sleep(1.0)
    return list(dict.fromkeys(handles))

def extract_detail(page, handle: str, outdir: str) -> dict:
    url = f"{BASE}/{handle}"
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", handle)
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        title = page.title()
        # 본문 텍스트 일부
        text = page.evaluate("() => document.body.innerText.slice(0, 4000)")
        # 헤드리스 raw HTML도 저장
        html = page.content()
        with open(os.path.join(outdir, f"detail_{safe}.html"), "w", encoding="utf-8") as f:
            f.write(html)
    except Exception as e:
        log.warning("  상세 %s 실패: %s", handle, e)
        return {"handle": handle, "url": url, "error": str(e)}
    return {"handle": handle, "title": title, "text_excerpt": text, "url": url}

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=3)
    ap.add_argument("--max-detail", type=int, default=20)
    ap.add_argument("--out", default="crawled/hackerone")
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=UA)
        page = ctx.new_page()
        page.set_default_timeout(20000)
        page.set_default_navigation_timeout(30000)

        handles = collect_handles(page, LISTING, args.pages)
        log.info("총 유니크 핸들 %d개", len(handles))

        meta = {"handles": handles, "detail": [], "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
        details = []
        targets = handles[: args.max_detail] if args.max_detail > 0 else handles
        for i, h in enumerate(targets):
            d = extract_detail(page, h, args.out)
            details.append(d)
            meta["detail"].append(h)
            if (i + 1) % 5 == 0:
                log.info("  진행 %d/%d", i + 1, len(targets))
            time.sleep(args.delay)

        with open(os.path.join(args.out, "competitions.json"), "w", encoding="utf-8") as f:
            json.dump(details, f, ensure_ascii=False, indent=2)
        with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        log.info("완료: 상세 %d건 저장", len(details))

        browser.close()

if __name__ == "__main__":
    main()
