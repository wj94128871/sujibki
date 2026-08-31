#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Devpost detail_*.json → competitions.json 변환 어댑터 (스트리밍).
- 입력: crawled/devpost/detail_*.json (2400+)
- 출력: crawled/devpost/competitions.json
사용법: python adapt_devpost.py [--in crawled/devpost] [--out crawled/devpost]
"""
from __future__ import annotations
import argparse, json, os, re, sys, time, logging
from glob import glob

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("adapt_devpost")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src_dir", default="crawled/devpost")
    ap.add_argument("--out", default="crawled/devpost")
    ap.add_argument("--max-desc", type=int, default=500)
    args = ap.parse_args()
    files = sorted(glob(os.path.join(args.src_dir, "detail_*.json")))
    log.info("상세 파일 %d개", len(files))
    out_path = os.path.join(args.out, "competitions.json")
    bad = 0
    written = 0
    t0 = time.time()
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("[\n")
        first = True
        for i, fp in enumerate(files):
            try:
                with open(fp, "r", encoding="utf-8") as g:
                    d = json.load(g)
            except Exception as e:
                bad += 1
                continue
            if not d.get("slug") or not d.get("title"):
                bad += 1
                continue
            desc = d.get("description") or ""
            first_para = re.split(r"\n\n", desc, maxsplit=1)[0].strip()
            brief = first_para[: args.max_desc] if first_para else ""
            item = {
                "slug": d["slug"],
                "title": d["title"],
                "built_with": d.get("built_with") or [],
                "dev_score": d.get("dev_score", 0),
                "is_dev": bool(d.get("is_dev")),
                "submitted_date": d.get("submitted_date") or "",
                "brief": brief,
                "url": f"https://devpost.com/software/{d['slug']}",
            }
            if not first:
                f.write(",\n")
            json.dump(item, f, ensure_ascii=False)
            first = False
            written += 1
            if (i + 1) % 200 == 0:
                log.info("  진행 %d/%d (%.1fs)", i + 1, len(files), time.time() - t0)
        f.write("\n]\n")
    log.info("저장: %s (총 %d건, 스킵 %d, %.1fs)", out_path, written, bad, time.time() - t0)


if __name__ == "__main__":
    main()
