#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
위시켓(Wishket) 도급(외주/task_based) 수집 크롤러  (로그인 쿠키 재사용 — 방식 A)

핵심 발견(2026-08-20 검증 완료)
  - 도급(외주) 필터 : pt=task_based   (기간제=term_based 제외)
  - 목록 URL        : /project/?d=<LZString.compressToBase64("pt=task_based&page=N")>
  - 수량 API        : /project/count/?d=<LZString.compressToBase64("pt=task_based")>  -> {"count": 49780}
  - 로그인 쿠키      : wsessionid(세션) + csrftoken 필수 (cache them; housekeeping 5s delay)
  - 로그인 게이트 해제 확인 : 업무내용/근무환경/모집요건/지원 전 질문/프로젝트 문의/예산 모두 노출
  - 프라이빗 매칭    : 도급 목록 카드에 `private-mark` 배지로 표시된 별도 프로젝트 (함께 수집)

출력  : crawled/wishket_oauth/
  - cookies copy, list_*.html|json, detail_<id>.html|json, meta csv/json
사용법:
  python crawl_wishket_oauth.py
      [--cookies crawled/wishket_oauth/cookies_wishket.json]
      [--list-pages 3]           도급 목록 몇 페이지 순회 (0이면 목록 없이 상세만)
      [--detail-max 10]          각 목록에서 수집할 상세 수 (0이면 상세 미수집)
      [--only-detail-ids 157735] 콤마로 직접 상세 ID만 수집 (목록 생략)
      [--out crawled/wishket_oauth] [--delay 5]
"""
import argparse, json, os, re, time, csv, sys
import requests
# 도급 필터 파라미터 인코딩 (JS LZString.compressToBase64 와 동일)
try:
    from lzstring import LZString
    LZ = LZString()
except Exception as e:
    LZ = None
    print("[경고] lzstring 미설치 -> 'pip install lzstring' 후 재실행", file=sys.stderr)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/121.0 Safari/537.36")
BASE = "https://www.wishket.com"

def encode_filter(qs: str) -> str:
    return LZ.compressToBase64(qs)

def load_cookies(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        return data
    return {c["name"]: c["value"] for c in data if "name" in c}

def build_session(cookies):
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.wishket.com/project/",
    })
    s.cookies.update(cookies)
    return s

def request(s, url, tag, outdir, delay, as_json=False, retry=3):
    for i in range(retry):
        try:
            r = s.get(url, timeout=30)
            if r.status_code == 200:
                if as_json:
                    return r
                fn = os.path.join(outdir, f"{tag}.html")
                with open(fn, "w", encoding="utf-8") as f:
                    f.write(r.text)
                return r
            else:
                print(f"  [{r.status_code}] {url}", file=sys.stderr)
                if r.status_code in (401, 403):
                    print("  !! 로그인 쿠키 만료/부족(프라이빗은 등급 계정 필요 가능)", file=sys.stderr)
                time.sleep(2)
        except Exception as e:
            print(f"  retry{i} {type(e).__name__}: {e}", file=sys.stderr)
            time.sleep(3)
    return None

def extract_ids(html):
    ids = re.findall(r'href="/project/(\d+)/"', html)
    return list(dict.fromkeys(ids))

def extract_private_ids(html):
    # private-mark 배지가 붙은 카드의 프로젝트 id
    cards = re.split(r'<li class="', html)
    out = []
    for c in cards:
        if "private-mark" in c:
            m = re.search(r'/project/(\d+)/', c)
            if m:
                out.append(m.group(1))
    return out

def extract_detail_fields(html):
    """상세 페이지에서 핵심 필드 텍스트 요약 추출 (로깅용)."""
    import re as _re
    txt = _re.sub(r"<script.*?</script>|<style.*?</style>", "", html, flags=_re.S)
    txt = _re.sub(r"<[^>]+>", " ", txt)
    words = " ".join(txt.split())
    out = {}
    for key, pat in {
        "title": r"(.{10,120}?)\s*(?:프로젝트 소개|업무 내용|모집 요건)",
        "budget": r"(\d[\d,]*(?:만원|원/월|원))",
        "term": r"(\d+일)",
    }.items():
        pass
    return {"title": words[:60], "len": len(html)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cookies", default="pipeline/market_dashboard/crawled/wishket_oauth/cookies_wishket.json")
    ap.add_argument("--list-pages", type=int, default=3, help="도급 목록 페이지 수 (0=목록 생략)")
    ap.add_argument("--detail-max", type=int, default=10, help="목록당 수집할 상세 수 (0=상세 미수집)")
    ap.add_argument("--only-detail-ids", default="", help="콤마로 상세 id 직접 수집 (목록 생략)")
    ap.add_argument("--out", default="pipeline/market_dashboard/crawled/wishket_oauth")
    ap.add_argument("--delay", type=float, default=5.0, help="요청 간 딜레이(초); 위시켓 crawl-delay=5")
    args = ap.parse_args()

    if LZ is None:
        sys.exit("lzstring 필요: pip install lzstring")
    cookies = load_cookies(args.cookies)
    if "wsessionid" not in cookies and "csrftoken" not in cookies:
        print("[경고] wsessionid/csrftoken 쿠키가 없음 — 로그인 상태가 아닐 수 있음", file=sys.stderr)
    s = build_session(cookies)
    os.makedirs(args.out, exist_ok=True)

    # 쿠키 복사본 보존
    with open(os.path.join(args.out, "cookies_used.json"), "w", encoding="utf-8") as f:
        json.dump(cookies, f, ensure_ascii=False, indent=2)

    meta = {"mode": "task_based(도급)", "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "total_dogup": None, "ids": [], "private_ids": []}

    # 0) 전체 도급 건수
    try:
        d0 = encode_filter("pt=task_based")
        rc = request(s, f"{BASE}/project/count/?d={d0}", "count", args.out, args.delay, as_json=True)
        if rc:
            meta["total_dogup"] = rc.json().get("count")
            print("도급(외주) 전체 건수:", meta["total_dogup"])
    except Exception as e:
        print("count 조회 실패:", e)

    ids = []
    if args.only_detail_ids:
        ids = [x.strip() for x in args.only_detail_ids.split(",") if x.strip()]
    elif args.list_pages > 0:
        for page in range(1, args.list_pages + 1):
            d = encode_filter(f"pt=task_based&page={page}")
            url = f"{BASE}/project/?d={d}"
            print(f"[목록 {page}] {url}")
            r = request(s, url, f"list_task_{page}", args.out, args.delay)
            if not r:
                continue
            page_ids = extract_ids(r.text)
            priv = extract_private_ids(r.text)
            print(f"  카드 {len(page_ids)}개 | 프라이빗 {len(priv)}개 | {priv}")
            ids += page_ids
            meta["private_ids"] += priv
            time.sleep(args.delay)
        ids = list(dict.fromkeys(ids))
    meta["ids"] = ids

    # 상세 수집
    detail_rows = []
    targets = ids[:args.detail_max] if args.detail_max > 0 else ids
    for i, pid in enumerate(targets):
        url = f"{BASE}/project/{pid}/"
        print(f"[상세 {i+1}/{len(targets)}] {url}")
        r = request(s, url, f"detail_{pid}", args.out, args.delay)
        if r:
            info = extract_detail_fields(r.text)
            detail_rows.append({"id": pid, "title": info["title"], "private": pid in meta["private_ids"]})
        time.sleep(args.delay)

    # 메타 저장
    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    if detail_rows:
        with open(os.path.join(args.out, "details.csv"), "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["id", "title", "private"])
            w.writeheader(); w.writerows(detail_rows)

    print("\n=== 완료 ===")
    print("총 도급 건수:", meta["total_dogup"], "| 수집 ID:", len(ids), "| 상세:", len(detail_rows))
    print("출력:", os.path.abspath(args.out))

if __name__ == "__main__":
    main()
