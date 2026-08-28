#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
프리모아(Freemoa) 도급(workType=1) 상세 수집 크롤러  (로그인 쿠키 재사용 — 방식 A)

검증된 구조(2026-08-20)
  - 목록 API : POST https://www.freemoa.net/m4a/s41a   (page=1..N)
     응답    : DATA.PROJECT.LIST[] (각 항목에 txt 상세 포함) + PAGINATION.totalRows
     도급 필터: workType == "1" (도급), "3"=상주/기타 → 크롤러가 workType==1 만 수집
  - 상세 API : POST https://www.freemoa.net/m4a/s41v   (pno=<proj_idx>&anyView=)
     응답    : DATA.VIEW (로그인 시 접근성/상세 확장 가능)
  - TLS     : SSL 인증서 검증 실패 → curl_cffi(impersonate="chrome") + verify=False
  - 로그인   : 상세 상세내용(문의, 지원자 상세 등)은 로그인 쿠키 필요 → cookies_freemoa.json

출력 : crawled/freemoa_oauth/
  - list_<page>.json (도급만) · detail_<id>.json (s41v 상세) · meta.json
사용법:
  python crawl_freemoa.py
      [--cookies crawled/freemoa_oauth/cookies_freemoa.json]
      [--pages 5]            목록 몇 페이지 순회 (도급만 필터)
      [--balanced]           도급/상주 무관 전체 수집 (기본: 도급만)
      [--detail]             상세(s41v)도 수집 (로그인 필요)
      [--detail-max 10]      상세 수 제한 (0=전체)
      [--out crawled/freemoa_oauth] [--delay 2]
"""
import argparse, json, os, re, time, sys
from collections import Counter
from curl_cffi import requests as cr

BASE = "https://www.freemoa.net"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"

def load_cookies(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        return data
    return {c["name"]: c["value"] for c in data if "name" in c}

def build_session(cookies):
    s = cr.Session(impersonate="chrome")
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Referer": f"{BASE}/m4/s41",
        "X-Requested-With": "XMLHttpRequest",
    })
    # curl_cffi: set cookies from dict
    for k, v in cookies.items():
        s.cookies.set(k, v, domain=".freemoa.net", path="/")
    return s

def request_json(s, url, payload, outdir, tag, retry=3):
    for i in range(retry):
        try:
            r = s.post(url, data=payload, verify=False, timeout=30)
            if r.status_code == 200:
                try:
                    d = r.json()
                except Exception:
                    print(f"  [json실패] {url}", file=sys.stderr); time.sleep(2); continue
                fn = os.path.join(outdir, f"{tag}.json")
                with open(fn, "w", encoding="utf-8") as f:
                    json.dump(d, f, ensure_ascii=False, indent=2)
                return d
            else:
                print(f"  [{r.status_code}] {url} ({r.text[:80]})", file=sys.stderr)
                if r.status_code in (401, 403, 500):
                    print("  !! 로그인 쿠키 문제/요청 포맷 오류 가능", file=sys.stderr)
                time.sleep(2)
        except Exception as e:
            print(f"  retry{i} {type(e).__name__}: {e}", file=sys.stderr)
            time.sleep(3)
    return None

def get_list(s, page, outdir, balanced=False):
    # 필터 조건(프리모아 프론트): st=stayExcept는 상주 제외, workType=1 도급
    # 중요: 목록 API는 최소 파라미터(page)만 보내야 200. 빈 리스트(f/loc/fnd2)나 빈 필터(st/st2/sm/sS)를
    # 함께 보내면 서버 500. 도급 필터링은 응답 workType==1 기준(크롤러 측)으로 처리.
    payload = {"page": str(page)}
    d = request_json(s, f"{BASE}/m4a/s41a", payload, outdir, f"list_{page}")
    if not d:
        return [], 0, None
    proj = d["DATA"]["PROJECT"]
    lst = proj.get("LIST", []) or []
    tot = proj.get("PAGINATION", {}).get("totalRows")
    if balanced:
        keep = lst
    else:
        keep = [it for it in lst if it.get("workType") == "1"]  # 도급만
    return keep, len(lst), tot

def get_detail(s, pno, outdir):
    payload = {"pno": str(pno), "anyView": ""}
    d = request_json(s, f"{BASE}/m4a/s41v", payload, outdir, f"detail_{pno}")
    return d

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cookies", default="pipeline/market_dashboard/crawled/freemoa_oauth/cookies_freemoa.json")
    ap.add_argument("--pages", type=int, default=5)
    ap.add_argument("--balanced", action="store_true", help="도급만이 아니라 전체 수집(기본 도급만)")
    ap.add_argument("--detail", action="store_true", help="상세(s41v)도 수집")
    ap.add_argument("--detail-max", type=int, default=10)
    ap.add_argument("--out", default="pipeline/market_dashboard/crawled/freemoa_oauth")
    ap.add_argument("--delay", type=float, default=2.0)
    args = ap.parse_args()

    if not os.path.exists(args.cookies):
        sys.exit(f"쿠키 파일 없음: {args.cookies} — Chrome에서 프리모아 로그인 쿠키 export 필요")
    cookies = load_cookies(args.cookies)
    s = build_session(cookies)
    os.makedirs(args.out, exist_ok=True)

    meta = {"mode": "도급(workType=1)만" if not args.balanced else "전체",
            "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "ids": [], "detail_ids": [], "total_rows": None, "worktypes": {}}
    all_ids = []
    wk = Counter()
    for page in range(1, args.pages + 1):
        keep, raw_n, tot = get_list(s, page, args.out, balanced=args.balanced)
        print(f"[목록 {page}] 수신 {raw_n}건 → 도급 {len(keep)}건")
        if page == 1:
            meta["total_rows"] = tot
        for it in keep:
            wk[it.get("workType")] += 1
            pid = it.get("proj_idx")
            if pid:
                all_ids.append(pid)
        time.sleep(args.delay)
    meta["worktypes"] = dict(wk)
    meta["ids"] = list(dict.fromkeys(all_ids))

    if args.detail:
        targets = meta["ids"][:args.detail_max] if args.detail_max > 0 else meta["ids"]
        for i, pid in enumerate(targets):
            print(f"[상세 {i+1}/{len(targets)}] pno={pid}")
            d = get_detail(s, pid, args.out)
            if d:
                meta["detail_ids"].append(pid)
            time.sleep(args.delay)

    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print("\n=== 완료 ===")
    print("전체 수신 열:", meta["total_rows"], "| 도급 ID:", len(meta["ids"]), "| workType 분포:", meta["worktypes"])
    print("출력:", os.path.abspath(args.out))

if __name__ == "__main__":
    main()
