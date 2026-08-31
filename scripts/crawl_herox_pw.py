#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HeroX crowdsourcing-projects 수집 (Playwright 헤드리스)
- 카드 selector: a.card-challenge
- 정적 fallback의 한계 보완
출력: crawled/herox_pw/
사용법: python crawl_herox_pw.py [--max-detail 30]
"""
from __future__ import annotations
import argparse, json, os, re, time, sys, logging
from playwright.sync_api import sync_playwright

BASE = "https://www.herox.com"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
CARD_SEL = "a.card-challenge"
URL = f"{BASE}/crowdsourcing-projects"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("herox_pw")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-detail", type=int, default=30)
    ap.add_argument("--out", default="crawled/herox_pw")
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=UA)
        page = ctx.new_page()
        page.set_default_timeout(20000)
        page.set_default_navigation_timeout(30000)

        try:
            page.goto(URL, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(5000)
        except Exception as e:
            log.warning("goto 실패: %s", e)
        # scroll
        for _ in range(10):
            page.mouse.wheel(0, 1500)
            page.wait_for_timeout(700)
        cards = page.query_selector_all(CARD_SEL)
        log.info("카드 %d개", len(cards))
        urls: list[str] = []
        titles: list[str] = []
        for c in cards:
            href = c.get_attribute("href")
            if not href: continue
            if not href.startswith("http"):
                href = BASE + href
            if "?from=explore" in href:
                href = href.split("?")[0]
            if href not in urls:
                urls.append(href)
                txt = (c.inner_text() or "").strip()
                # First non-empty line is usually the title
                first_line = next((l.strip() for l in txt.splitlines() if l.strip()), "")
                titles.append(first_line[:200])

        log.info("유니크 URL %d", len(urls))

        meta = {"urls": urls, "titles": titles, "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
        details = []
        targets = urls[: args.max_detail] if args.max_detail > 0 else urls
        for i, u in enumerate(targets):
            safe = re.sub(r"[^A-Za-z0-9_-]", "_", u)
            try:
                page.goto(u, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(2000)
                title = page.title()
                text = page.evaluate("() => document.body.innerText.slice(0, 4000)")
                html = page.content()
                with open(os.path.join(args.out, f"detail_{safe[:80]}.html"), "w", encoding="utf-8") as f:
                    f.write(html)
                details.append({"url": u, "title": title, "text_excerpt": text, "slug": u.rstrip("/").split("/")[-1]})
            except Exception as e:
                log.warning("  %s 실패: %s", u, e)
                details.append({"url": u, "error": str(e)})
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
