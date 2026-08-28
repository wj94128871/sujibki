#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Devpost 개발 관련 해커톤 출품작 수집 크롤러 (API 토큰 불필요 — 공개 페이지 스크래핑)

검증(2026-08-20)
  - 목록  : GET https://devpost.com/software/            (각 페이지 26건, ?page=N 페이지네이션, 200)
            GET https://devpost.com/software/search?query=... (검색은 202/0건 → 미사용)
  - 상세  : GET https://devpost.com/software/<slug>      (200)
            상세 필드: 제목, 태그라인, Built With(기술 스택), What it does/Inspiration 등 설명,
            Try it out(링크), Devpost(해커톤/소스), tag, 갤러리/이미지
  - 봇/로봇: Cloudflare 없음. curl_cffi(impersonate=chrome) 권장.
  - "개발 관련" 필터: 상세의 Built With(기술 스택) / tag 기준으로 개발 관련 출품작만 선별
    (기본: 유명 개발 태그 whitelist — python/javascript/react/node/react-native 등이 포함된 것)

출력: crawled/devpost/
  - list_<page>.html(또는 파싱 json), detail_<slug>.json, meta.json
사용법:
  python crawl_devpost.py
      [--pages 3]               목록 페이지 수 (0=검토만)
      [--max-software 30]       개발 관련 출품작 상세 수집 수 (0=목록만/필터만)
      [--dev-only]              개발 기술 태그 있는 것만 수집 (없으면 전부)
      [--out crawled/devpost] [--delay 1.5]
"""
import argparse, json, os, re, time, sys
from curl_cffi import requests as cr

BASE = "https://devpost.com"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"

# 개발 관련 판단용 기술/태그 화이트리스트
DEV_TAGS = [
    "python", "javascript", "typescript", "react", "react native", "node.js", "node",
    "angular", "vue", "django", "flask", "fastapi", "go", "rust", "c++", "c#", "java",
    "swift", "kotlin", "flutter", "tensorflow", "pytorch", "openai", "gpt", "llm",
    "api", "google cloud", "aws", "azure", "firebase", "docker", "kubernetes", "k8s",
    "sql", "postgresql", "mongodb", "redis", "html", "css", "git", "github",
]

def load_session():
    s = cr.Session(impersonate="chrome")
    s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    return s

def get(s, url, tag, outdir, retry=3):
    for i in range(retry):
        try:
            r = s.get(url, timeout=30)
            if r.status_code == 200:
                if outdir:
                    fn = os.path.join(outdir, f"{tag}.html")
                    with open(fn, "w", encoding="utf-8") as f:
                        f.write(r.text)
                return r
            else:
                print(f"  [{r.status_code}] {url}", file=sys.stderr)
                time.sleep(2)
        except Exception as e:
            print(f"  retry{i} {type(e).__name__}: {e}", file=sys.stderr)
            time.sleep(3)
    return None

def extract_software_links(html):
    links = re.findall(r'href="(https://devpost\.com/software/[^"]+)"', html)
    return list(dict.fromkeys(links))

def is_dev(html):
    """상세/태그에 개발 기술 태그가 있는지."""
    low = html.lower()
    score = sum(1 for t in DEV_TAGS if t in low)
    return score, score > 0

def extract_detail(html, url):
    """상세 페이지 핵심 정보 추출 (파싱용 dict)."""
    slug = url.split("/software/")[-1].split("?")[0]
    # title
    mt = re.search(r"<title>(.*?)</title>", html, re.S)
    title = re.sub(r"\s+", " ", mt.group(1)).strip() if mt else slug
    # built with tags
    built = re.findall(r'class="cp-tag"[^>]*>\s*(.*?)\s*</', html, re.S)
    built = [b.strip() for b in built if b.strip()][:20]
    # description section text
    txt = re.sub(r"<script.*?</script>|<style.*?</style>", "", html, flags=re.S)
    txt = re.sub(r"<[^>]+>", " ", txt)
    words = " ".join(txt.split())
    return {"slug": slug, "title": title, "built_with": built,
            "dev_score": is_dev(html)[0], "is_dev": is_dev(html)[1],
            "url": url, "len": len(html)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=3)
    ap.add_argument("--max-software", type=int, default=30)
    ap.add_argument("--dev-only", action="store_true")
    ap.add_argument("--out", default="pipeline/market_dashboard/crawled/devpost")
    ap.add_argument("--delay", type=float, default=1.5)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    s = load_session()

    # 1) 목록 페이지 순회
    all_links = []
    for p in range(1, args.pages + 1):
        u = f"{BASE}/software/?page={p}"
        print(f"[목록 {p}] {u}")
        r = get(s, u, f"list_{p}", args.out, )
        if not r:
            continue
        ln = extract_software_links(r.text)
        all_links += ln
        print(f"  소프트웨어 링크 {len(ln)}개")
        time.sleep(args.delay)
    all_links = list(dict.fromkeys(all_links))
    print(f"총 유니크 출품작 {len(all_links)}개")

    # 2) 상세 수집 (개발 관련 선별)
    meta = {"list_links": all_links, "detail": [], "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
    dev_links = all_links
    if args.dev_only:
        # 개발 관련 사전 선별(목록 HTML에는 tags 없어 상세에서 판단) -- 상세 기준으로 함
        pass
    collected = []
    for i, url in enumerate(all_links):
        if args.max_software > 0 and i >= args.max_software:
            break
        print(f"[상세 {i+1}] {url}")
        r = get(s, url, f"detail_{i+1}", args.out)
        if not r:
            continue
        info = extract_detail(r.text, url)
        if args.dev_only and not info["is_dev"]:
            print(f"  (개발 아님 스킵) score={info['dev_score']} built={info['built_with'][:4]}")
            continue
        collected.append(info)
        time.sleep(args.delay)

    meta["detail"] = collected
    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"\n=== Devpost 크롤러 테스트 완료 ===")
    print(f"목록 링크: {len(all_links)} | 수집 상세: {len(collected)} | 출력: {os.path.abspath(args.out)}")
    for c in collected[:5]:
        print(f"  - {c['title'][:40]} | built={c['built_with'][:4]} | dev={c['is_dev']}")

if __name__ == "__main__":
    main()
