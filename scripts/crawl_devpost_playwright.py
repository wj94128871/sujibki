#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Devpost 해커톤 출품작 전량 수집 크롤러 (Playwright 기반 — AWS WAF 우회)

배경: /software/newest(최신순 전체 목록)는 AWS WAF JS 챌린지로 curl_cffi 불가.
      Playwright(실제 Chromium)로 챌린지를 통과시켜 aws-waf-token 쿠키를 획득한 뒤
      페이지네이션으로 전수 수집한다.

실행 환경 주의 (이 머신 WSL2):
  - chromium: ~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
  - libnspr4/libnss3: /tmp/pwlibs/extract/usr/lib/x86_64-linux-gnu (LD_LIBRARY_PATH 주입)
  - python: kernel-venv (playwright 설치됨)

출력: crawled/devpost/
  - list_newest_<page>.html  (원본 목록)
  - meta.json                (링크/상세 메타)
  - detail_<slug>.json       (상세 파싱)
사용법:
  python crawl_devpost_playwright.py --pages 100 --detail-max 0
"""
import argparse, asyncio, json, os, re, sys, time

CHROME = os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome")
PWLIBS = "/tmp/pwlibs/extract/usr/lib/x86_64-linux-gnu"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
BASE = "https://devpost.com"

DEV_TAGS = [
    "python", "javascript", "typescript", "react", "react native", "node.js", "node",
    "angular", "vue", "django", "flask", "fastapi", "go", "rust", "c++", "c#", "java",
    "swift", "kotlin", "flutter", "tensorflow", "pytorch", "openai", "gpt", "llm",
    "api", "google cloud", "aws", "azure", "firebase", "docker", "kubernetes", "k8s",
    "sql", "postgresql", "mongodb", "redis", "html", "css", "git", "github",
]


def parse_links(html):
    links = re.findall(r'href="(https://devpost\.com/software/[^"]+)"', html)
    return [l for l in links
            if not l.endswith(("/newest", "/search"))
            and "/" not in l.split("/software/")[-1].rstrip("/")]


def extract_detail(html, url):
    slug = url.split("/software/")[-1].split("?")[0]
    mt = re.search(r"<title>(.*?)</title>", html, re.S)
    title = re.sub(r"\s+", " ", mt.group(1)).strip() if mt else slug
    built = re.findall(r'class="cp-tag"[^>]*>\s*(.*?)\s*</', html, re.S)
    built = [b.strip() for b in built if b.strip()][:20]
    txt = re.sub(r"<script.*?</script>|<style.*?</style>", "", html, flags=re.S)
    txt = re.sub(r"<[^>]+>", " ", txt)
    words = " ".join(txt.split())
    low = html.lower()
    dev_score = sum(1 for t in DEV_TAGS if t in low)
    # 등록일: 렌더링된 <time datetime="ISO8601"> (실측 2026-08-25 — 제목 부근 'n days ago')
    # 폴백: 헤더 영역(app-details-left 이전)에서만 "Month D, YYYY" 탐색(본문 오염 방지)
    date_iso = None
    tm = re.search(r'<time[^>]+datetime="([0-9T:+\-\.Zz]+)"', html)
    if tm:
        date_iso = tm.group(1)
    date_fallback = None
    head_end = html.find('id="app-details-left"')
    head_seg = re.sub(r"<[^>]+>", " ", html[:head_end if head_end > 0 else 40000])
    dm = re.search(r"([A-Z][a-z]{2,8} \d{1,2}, \d{4})", " ".join(head_seg.split()))
    if dm:
        date_fallback = dm.group(1)
    # 상세 설명 본문: app-details-left 영역의 <p> 문단 수집 (What it does 등 섹션 무관)
    desc = ""
    body_m = re.search(r'<div[^>]*id="app-details-left"[^>]*>(.*)', html, re.S)
    if body_m:
        seg = body_m.group(1)
        # 갤러리 영역 제외 (slick 슬라이더)
        gal = seg.find('<div id="gallery">')
        if gal >= 0:
            gend = seg.find('</ul>', gal)
            if gend >= 0:
                seg = seg[:gal] + seg[gend+5:]
        paras = re.findall(r'<p>(.*?)</p>', seg, re.S)
        if paras:
            desc = " ".join(re.sub(r"<[^>]+>", "", p) for p in paras)
        else:
            desc = re.sub(r"<[^>]+>", " ", seg)
    desc = re.sub(r"\s+", " ", desc).strip()[:3000]
    return {"slug": slug, "title": title, "built_with": built,
            "dev_score": dev_score, "is_dev": dev_score > 0,
            "submitted_date": date_iso or date_fallback,
            "submitted_date_source": "time_tag" if date_iso else ("header_text" if date_fallback else None),
            "description": desc,
            "url": url, "len": len(html)}


def collect_refresh_targets(outdir):
    """기존 detail_*.json 중 submitted_date 없는 것의 URL 목록 (재수집 대상)."""
    targets = []
    for f in os.listdir(outdir):
        if not (f.startswith("detail_") and f.endswith(".json")):
            continue
        try:
            d0 = json.load(open(os.path.join(outdir, f), encoding="utf-8"))
            if d0.get("description") and not d0.get("submitted_date"):
                if d0.get("url"):
                    targets.append(d0["url"])
        except Exception:
            pass
    return list(dict.fromkeys(targets))


async def run(pages, detail_max, outdir, delay, start_page=1, detail_only=False, refresh_dates=False):
    from playwright.async_api import async_playwright
    os.makedirs(outdir, exist_ok=True)
    env = dict(os.environ)
    env["LD_LIBRARY_PATH"] = PWLIBS
    all_links = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=CHROME, headless=True,
            args=["--no-sandbox", "--disable-gpu"], env=env,
        )
        ctx = await browser.new_context(user_agent=UA, locale="en-US")
        page = await ctx.new_page()
        # 1) WAF 챌린지 통과 (aws-waf-token 쿠키 획득)
        print("[1/3] WAF 챌린지 통과 중...")
        await page.goto(f"{BASE}/software/newest", timeout=60000, wait_until="domcontentloaded")
        token_ok = False
        for i in range(30):
            await page.wait_for_timeout(1000)
            cookies = {c["name"] for c in await ctx.cookies()}
            if "aws-waf-token" in cookies:
                token_ok = True
                break
        if not token_ok:
            print("!! aws-waf-token 미획득 — 중단", file=sys.stderr)
            await browser.close()
            return 0
        await page.wait_for_timeout(6000)
        print("   토큰 획득 완료")

        # 2) 페이지네이션 목록 수집 (detail_only면 기존 links 사용, refresh_dates면 생략)
        print(f"[2/3] 목록 {'생략(기존 meta)' if detail_only else ('생략(refresh-dates)' if refresh_dates else str(pages)+'페이지')} ...")
        start_pg = start_page
        prev_links = []
        if refresh_dates:
            all_links = collect_refresh_targets(outdir)
            print(f"   날짜 없는 기존 상세 {len(all_links)}건을 재수집 대상으로 로드")
            # 최종 meta.json에 전체 링크 목록 보존
            try:
                _m = json.load(open(os.path.join(outdir, "meta.json"), encoding="utf-8"))
                prev_links = list(dict.fromkeys(_m.get("links") or _m.get("list_links") or []))
            except Exception:
                pass
        elif not detail_only:
            for pg in range(start_pg, start_pg + pages):
                url = f"{BASE}/software/newest?page={pg}"
                for attempt in range(3):
                    try:
                        await page.goto(url, timeout=60000, wait_until="domcontentloaded")
                        await page.wait_for_timeout(2500)
                        break
                    except Exception as e:
                        print(f"   page {pg} retry{attempt}: {type(e).__name__}", file=sys.stderr)
                        await page.wait_for_timeout(5000)
                html = await page.content()
                fn = os.path.join(outdir, f"list_newest_{pg}.html")
                with open(fn, "w", encoding="utf-8") as f:
                    f.write(html)
                links = parse_links(html)
                all_links += links
                if pg % 10 == 0 or pg == pages:
                    print(f"   page {pg}: {len(links)} links (누적 unique {len(set(all_links))})")
                if delay:
                    await page.wait_for_timeout(int(delay * 1000))
        else:
            meta_f = os.path.join(outdir, "meta.json")
            if os.path.exists(meta_f):
                old_meta = json.load(open(meta_f, encoding="utf-8"))
                all_links = old_meta.get("links") or old_meta.get("list_links") or []
                print(f"   기존 meta에서 {len(all_links)} links 로드")
        all_links = list(dict.fromkeys(all_links))
        print(f"   목록 완료: {len(all_links)} unique 출품작")

        # 3) 상세 수집
        details = []
        # 상세 수집 (0=전체, 양수=제한, 음수=생략)
        if detail_max >= 0:
            targets = all_links[:detail_max] if detail_max > 0 else all_links
            print(f"[3/3] 상세 {len(targets)}건 수집 중...")
            existing = {}
            for f in os.listdir(outdir):
                if f.startswith("detail_") and f.endswith(".json"):
                    try:
                        d0 = json.load(open(os.path.join(outdir, f), encoding="utf-8"))
                        done = d0.get("submitted_date") if refresh_dates else d0.get("description")
                        if done:
                            existing[f.replace("detail_","").replace(".json","")] = True
                    except Exception:
                        pass
            for i, url in enumerate(targets):
                slug = url.split("/software/")[-1]
                if slug in existing:
                    continue
                for attempt in range(3):
                    try:
                        await page.goto(url, timeout=60000, wait_until="domcontentloaded")
                        await page.wait_for_timeout(1200)
                        break
                    except Exception:
                        await page.wait_for_timeout(4000)
                html = await page.content()
                info = extract_detail(html, url)
                details.append(info)
                with open(os.path.join(outdir, f"detail_{slug}.json"), "w", encoding="utf-8") as f:
                    json.dump(info, f, ensure_ascii=False, indent=2)
                if (i + 1) % 50 == 0:
                    print(f"   상세 {i+1}/{len(targets)}")
                if delay:
                    await page.wait_for_timeout(int(delay * 1000))
        await browser.close()

    meta = {"mode": "newest(전체 최신순)" + ("+refresh-dates" if refresh_dates else ""),
            "pages": pages,
            "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "total_links": len(prev_links) if refresh_dates else len(all_links),
            "links": prev_links if refresh_dates else all_links,
            "refreshed": len(details) if refresh_dates else None,
            "details": details}
    with open(os.path.join(outdir, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"\n=== Devpost 수집 완료 ===")
    print(f"목록: {len(all_links)} | 상세: {len(details)} | 출력: {os.path.abspath(outdir)}")
    return len(all_links)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=100, help="목록 페이지 수 (24건/페이지)")
    ap.add_argument("--start-page", type=int, default=1, help="시작 페이지 번호 (이어서 수집)")
    ap.add_argument("--detail-only", action="store_true", help="목록 생략 — meta.json의 links로 상세만 수집")
    ap.add_argument("--refresh-dates", action="store_true",
                    help="목록 생략 — submitted_date 없는 기존 상세만 선별 재수집(time 태그로 등록일 복원)")
    ap.add_argument("--detail-max", type=int, default=0, help="상세 수집 수 (0=전체, 음수=생략)")
    ap.add_argument("--out", default="crawled/devpost")
    ap.add_argument("--delay", type=float, default=0.0)
    args = ap.parse_args()
    outdir = args.out if os.path.isabs(args.out) else os.path.abspath(args.out)
    asyncio.run(run(args.pages, args.detail_max, outdir, args.delay,
                    args.start_page, args.detail_only, args.refresh_dates))


if __name__ == "__main__":
    main()
