#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
u300.kr 모두의창업 출품 전시(exhibition) 전체 수집 크롤러
- 목록: POST https://user-api.u300.kr/api/ipo/query/get-ipo-company-data-list
        body {"igNo":2,"size":<N>,"topTrackFilter":[],...}  -> data.ipoCompanyCardDataList (totalCnt=357)
- 상세: GET  https://user-api.u300.kr/api/ipo/query/get-ipo-company-data?icNo=<n>
- 로그인 불필요. SSL 문제없음(requests).
출력: crawled/u300/ list_all.json + detail_<icNo>.json + meta
사용법: python crawl_u300.py [--size 400] [--out crawled/u300]
"""
import argparse, json, os, time, sys, requests

BASE = "https://user-api.u300.kr"

def session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://u300.kr",
        "Referer": "https://u300.kr/",
    })
    return s

LIST_BODY = {
    "igNo": 2, "size": 400, "topTrackFilter": [], "regionFilter": [],
    "ipoPartFilter": [], "fundingRoundFilter": [], "recruitmentStatusFilter": [],
    "displayedIcNos": [], "keyword": "", "type": "TEAMNAME",
}

def fetch_list(s, size=400, outdir=""):
    b = dict(LIST_BODY); b["size"] = size
    r = s.post(f"{BASE}/api/ipo/query/get-ipo-company-data-list", json=b, timeout=60)
    r.raise_for_status()
    d = r.json()
    if outdir:
        with open(os.path.join(outdir, "list_all.json"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
    data = d.get("data", {})
    return data.get("ipoCompanyCardDataList", []), data.get("totalCnt")

def fetch_detail(s, icno, outdir=""):
    r = s.get(f"{BASE}/api/ipo/query/get-ipo-company-data", params={"icNo": icno}, timeout=40)
    r.raise_for_status()
    d = r.json()
    if outdir:
        with open(os.path.join(outdir, f"detail_{icno}.json"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
    return d

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=400)
    ap.add_argument("--skip-detail", action="store_true")
    ap.add_argument("--limit-detail", type=int, default=0, help="상세 제한(0=전체)")
    ap.add_argument("--out", default="pipeline/market_dashboard/crawled/u300")
    ap.add_argument("--delay", type=float, default=0.6)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    s = session()

    # list
    lst, total = fetch_list(s, args.size, args.out)
    print(f"목록: {len(lst)}건 / totalCnt={total}")
    icnos = [it["icNo"] for it in lst]
    meta = {"totalCnt": total, "got": len(lst), "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "icNos": icnos, "detail_done": []}

    # details
    if not args.skip_detail:
        targets = icnos[:args.limit_detail] if args.limit_detail > 0 else icnos
        for i, ic in enumerate(targets):
            try:
                fetch_detail(s, ic, args.out)
                meta["detail_done"].append(ic)
            except Exception as e:
                print(f"  상세 {ic} 실패: {type(e).__name__} {e}")
            time.sleep(args.delay)
            if (i+1) % 50 == 0:
                print(f"  상세 {i+1}/{len(targets)} 완료")

    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print("\n=== u300 수집 완료 ===")
    print("건수:", len(icnos), "| 상세:", len(meta["detail_done"]), "| 출력:", os.path.abspath(args.out))

if __name__ == "__main__":
    main()
