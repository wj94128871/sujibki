"""적재 파이프라인 (Epic1 · FR-03/04 · TC-15 멱등).
1) 실제 crawled/ 샘플 데이터를 읽어 StandardProject로 파싱
2) PII 필터(piifilter) 적용 — client_id/이메일 제거(TC-06)
3) SqliteAdapter(또는 PostgresAdapter)로 멱등 upsert
4) collection_runs 런 기록(FR-02/11)
"""
from __future__ import annotations
import os, json, glob, re
from .schema_std import StandardProject
from .parsers import (from_freemoa, from_u300_current, from_u300_past1,
                      from_devpost, from_wishket)
from .piifilter import filter_dict, has_email
from .store import DatabaseAdapter

CRAWLED_DFLT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "crawled"))


# ---------------- 샘플 수집 ----------------
def collect_freemoa(crawled_dir):
    """프리모아 도급 수집분 — 2026-08-01~08-20 등록(INS_TIME)분만.
    목록 파일에 7월 이전 데이터가 섞여 있을 수 있어 날짜로 재필터링한다."""
    out = []
    DATE_FROM, DATE_TO = "2026-07-01", "2026-08-20"
    for fp in sorted(glob.glob(os.path.join(crawled_dir, "freemoa_oauth", "list_*.json"))):
        with open(fp, encoding="utf-8") as f:
            d = json.load(f)
        for it in (d.get("DATA", {}).get("PROJECT", {}).get("LIST") or []):
            if str(it.get("workType")) != "1":
                continue
            ins = str(it.get("INS_TIME") or "")[:10]
            if DATE_FROM <= ins <= DATE_TO:
                out.append(from_freemoa(it))
    return out


def collect_u300_current(crawled_dir, limit=None):
    out = []
    files = sorted(glob.glob(os.path.join(crawled_dir, "u300", "detail_*.json")))
    if limit:
        files = files[:limit]
    for fp in files:
        with open(fp, encoding="utf-8") as f:
            d = json.load(f)
        if d.get("code") == 200 and d.get("data"):
            out.append(from_u300_current(d["data"]))
    return out


def collect_u300_past1(crawled_dir, limit=None):
    out = []
    files = sorted(glob.glob(os.path.join(crawled_dir, "u300_past1", "pe_*.json")))
    if limit:
        files = files[:limit]
    for fp in files:
        with open(fp, encoding="utf-8") as f:
            d = json.load(f)
        if d.get("code") == 200 and d.get("data"):
            out.append(from_u300_past1(d["data"]))
    return out


def collect_devpost(crawled_dir):
    fp = os.path.join(crawled_dir, "devpost", "meta.json")
    if not os.path.exists(fp):
        return []
    with open(fp, encoding="utf-8") as f:
        d = json.load(f)
    return [from_devpost(x) for x in (d.get("details") or d.get("detail") or [])]


def collect_hackathons(crawled_dir, runtime="normalized"):
    """ETL 정규화 산출물(crawled/_runs/hackathons_normalized.json) → 표준.
    runtime 인자는 컬렉션 단위 식별자(예: 'normalized', 'devpost')."""
    fp = os.path.join(crawled_dir, "_runs", "hackathons_normalized.json")
    if not os.path.exists(fp):
        return []
    with open(fp, encoding="utf-8") as f:
        d = json.load(f)
    items = d.get("items") or []
    # runtime별로 묶어서 적재하기 위해 각 항목을 별도 group으로 표시
    from .parsers import from_hackathon
    out = []
    for it in items:
        sp = from_hackathon(it)
        sp.runtime = f"hackathon/{it.get('source','unknown')}"
        out.append(sp)
    return out


def collect_wishket(crawled_dir):
    """위시켓 도급 수집분(detail_<id>.html) → 표준 파싱.
    등록일자는 목록 list_task_*.html의 '등록일자' 매핑에서 주입하되,
    목록이 재수집으로 덮어써진 경우 백업 레지스트리(_aug_registry.json)에서 보완한다."""
    out = []
    detail_dir = os.path.join(crawled_dir, "wishket_oauth")
    # 1) 등록일자 매핑: 목록 HTML → {id: date}
    date_map = {}
    for fp in glob.glob(os.path.join(detail_dir, "list_task_*.html")):
        html = open(fp, encoding="utf-8", errors="ignore").read()
        for m in re.finditer(r"등록일자\s*([\d.]+)", html):
            seg = html[max(0, m.start() - 4000):m.start()]
            pids = re.findall(r"/project/(\d+)/", seg)
            if pids:
                date_map.setdefault(pids[-1], m.group(1).rstrip("."))
    # 1b) 백업 레지스트리 보완 (목록 덮어쓰기 대비)
    reg_fp = os.path.join(detail_dir, "_aug_registry.json")
    if os.path.exists(reg_fp):
        try:
            with open(reg_fp, encoding="utf-8") as f:
                reg = json.load(f)
            for k, v in reg.items():
                date_map.setdefault(str(k), str(v).replace("-", "."))
        except Exception:
            pass
    # 2) 상세 HTML 파싱
    for fp in sorted(glob.glob(os.path.join(detail_dir, "detail_*.html"))):
        pid = os.path.basename(fp).replace("detail_", "").replace(".html", "")
        html = open(fp, encoding="utf-8", errors="ignore").read()
        p = from_wishket(pid, html)
        if date_map.get(pid):
            p.registered_at = date_map[pid].replace(".", "-")  # 2026-08-19
        out.append(p)
    return out


SOURCES = {
    "wishket": (collect_wishket, ""),
    "freemoa": (collect_freemoa, ""),
    "u300/current": (collect_u300_current, "current"),
    "u300/past1": (collect_u300_past1, "past1"),
    "devpost": (collect_devpost, ""),
    "hackathon": (collect_hackathons, "hackathon"),
}


def collect_all(crawled_dir=CRAWLED_DFLT, limits: dict | None = None):
    """소스별 표준 프로젝트 수집. limits: {source_key: n} 견본 수 제한(테스트/샘플)."""
    limits = limits or {}
    result = {}
    for key, (fn, runtime) in SOURCES.items():
        lim = limits.get(key)
        if lim is not None and "u300" in key:
            projs = fn(crawled_dir, limit=lim)
        else:
            projs = fn(crawled_dir)
        result[key] = projs
    return result


def apply_pii_filter(projects: list[StandardProject]) -> list[StandardProject]:
    """표준 프로젝트의 raw_json에 PII 필터 적용(멱등/적재 직전). TC-06."""
    for p in projects:
        p.raw = filter_dict(p.raw)
    return projects


# ---------------- 적재 ----------------
def load_projects(adapter: DatabaseAdapter, projects: list[StandardProject],
                  source: str, runtime: str = "", run_type: str = "manual") -> dict:
    """PII 필터 후 멱등 upsert + 런 기록. 반환: {total, success, failed, status}."""
    projects = apply_pii_filter(projects)
    run_id = adapter.start_run(source, runtime, run_type)
    try:
        n = adapter.upsert_projects(projects)
        status = "success" if projects else "success"
        total = len(projects)
        adapter.finish_run(run_id, status, total, total, 0)
        return {"total": total, "success": total, "failed": 0, "status": status}
    except Exception as e:
        adapter.finish_run(run_id, "failed", len(projects), 0, len(projects), {"error": str(e)})
        raise


def load_all_samples(adapter: DatabaseAdapter, crawled_dir=CRAWLED_DFLT,
                     limits: dict | None = None) -> dict:
    """전체 샘플 수집·적재. returns {source: result}."""
    collected = collect_all(crawled_dir, limits)
    report = {}
    for key, projs in collected.items():
        src, _, runtime = key.partition("/")
        report[key] = load_projects(adapter, projs, src, runtime)
    return report
