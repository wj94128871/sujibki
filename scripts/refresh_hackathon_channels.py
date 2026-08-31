#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
해커톤/챌린지 채널 7개 일괄 수집 (도메인 무관)
- 기존 Devpost은 crawl_devpost.py로 별도 실행(컨벤션 유지).
- 본 스크립트는 신규 7채널만 일괄 실행.
- 각 크롤러는 동일 옵션(--pages, --max-detail, --out, --delay)을 가짐.

사용법:
  python refresh_hackathon_channels.py                    # 기본 (--pages 2, --max-detail 15)
  python refresh_hackathon_channels.py --pages 4 --max-detail 30
  python refresh_hackathon_channels.py --only drivendata zindi
  python refresh_hackathon_channels.py --dry-run
"""
from __future__ import annotations
import argparse, importlib, os, sys, time, traceback, logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("refresh")

# (modname, args_from_common) — args_from_common(common_dict) returns list[str]
CHANNELS = {
    # 정적/API 기반
    "drivendata":      ("crawl_drivendata",
        lambda c: ["--pages", str(c["pages"]), "--max-detail", str(c["max_detail"]),
                   "--delay", str(c["delay"])]),
    "zindi":           ("crawl_zindi",
        lambda c: ["--pages", str(c["pages"]), "--max-detail", str(c["max_detail"]),
                   "--delay", str(c["delay"])]),
    "codeforces":      ("crawl_codeforces",
        # 자체 인자만 가짐 (--gym, --delay)
        lambda c: ["--delay", str(c["delay"])]),
    # 정적 fallback
    "hackerearth":     ("crawl_hackerearth",
        lambda c: ["--pages", str(c["pages"]), "--max-detail", str(c["max_detail"]),
                   "--delay", str(c["delay"])]),
    "herox":           ("crawl_herox",
        lambda c: ["--pages", str(c["pages"]), "--max-detail", str(c["max_detail"]),
                   "--delay", str(c["delay"])]),
    "topcoder":        ("crawl_topcoder",
        lambda c: ["--pages", str(c["pages"]), "--max-detail", str(c["max_detail"]),
                   "--delay", str(c["delay"])]),
    "openideo":        ("crawl_openideo",
        lambda c: ["--pages", str(c["pages"]), "--max-detail", str(c["max_detail"]),
                   "--delay", str(c["delay"])]),
    # Playwright 헤드리스
    "hackerone_pw":    ("crawl_hackerone_pw",
        lambda c: ["--pages", str(c["pages"]), "--max-detail", str(c["max_detail"]),
                   "--delay", str(c["delay"])]),
    "hackerearth_pw":  ("crawl_hackerearth_pw",
        lambda c: ["--max-detail", str(c["max_detail"]), "--delay", str(c["delay"])]),
    "k_hackathon":     ("crawl_k_hackathon",
        lambda c: ["--days", "365", "--max-detail", str(c["max_detail"])]),
    "herox_pw":        ("crawl_herox_pw",
        lambda c: ["--max-detail", str(c["max_detail"]), "--delay", str(c["delay"])]),
}

def run_one(name: str, modname: str, pages: int, max_detail: int, delay: float, dry: bool, args_builder) -> tuple[str, str]:
    start = time.time()
    try:
        mod = importlib.import_module(modname)
        if dry:
            log.info("[%s] DRY-RUN (스킵)", name)
            return name, "dry-run"
        log.info("[%s] 시작", name)
        # 채널별 args builder
        common = {"pages": pages, "max_detail": max_detail, "delay": delay}
        extra_args = args_builder(common)
        import sys as _s
        saved = _s.argv
        _s.argv = [modname] + extra_args
        try:
            mod.main()
        finally:
            _s.argv = saved
        dur = int(time.time() - start)
        log.info("[%s] 완료 (%ds)", name, dur)
        return name, "ok"
    except SystemExit as e:
        dur = int(time.time() - start)
        if e.code == 0:
            log.info("[%s] 완료 (exit 0, %ds)", name, dur)
            return name, "ok"
        log.error("[%s] SystemExit code=%s", name, e.code)
        return name, f"exit={e.code}"
    except Exception as e:
        dur = int(time.time() - start)
        log.error("[%s] 실패 (%ds): %s", name, dur, e)
        traceback.print_exc()
        return name, f"err:{type(e).__name__}"

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=2)
    ap.add_argument("--max-detail", type=int, default=15)
    ap.add_argument("--delay", type=float, default=1.2)
    ap.add_argument("--only", nargs="+", default=None, help="지정 채널만 실행")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--etl", action="store_true", help="수집 후 etl_hackathons.py 자동 실행")
    args = ap.parse_args()

    targets = args.only or list(CHANNELS.keys())
    log.info("=== 해커톤 채널 일괄 수집 시작 (%d개) ===", len(targets))
    summary = []
    for name in targets:
        if name not in CHANNELS:
            log.warning("알 수 없는 채널: %s (스킵)", name)
            continue
        modname, ab = CHANNELS[name]
        result = run_one(name, modname, args.pages, args.max_detail, args.delay, args.dry_run, ab)
        summary.append(result)
    log.info("=== 결과 요약 ===")
    for n, r in summary:
        log.info("  %-12s %s", n, r)

    if args.etl:
        log.info("=== ETL 자동 실행 ===")
        import subprocess as sp
        here = os.path.dirname(os.path.abspath(__file__))
        root = os.path.dirname(here)
        etl_script = os.path.join(here, "etl_hackathons.py")
        rc = sp.run(
            ["python3", etl_script],
            cwd=root,
            capture_output=True, text=True,
        )
        sys.stdout.write(rc.stdout)
        if rc.returncode != 0:
            sys.stderr.write(rc.stderr)

if __name__ == "__main__":
    main()
