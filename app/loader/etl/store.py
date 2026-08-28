"""DB 어댑터: SqliteAdapter(로컬 검증) · PostgresAdapter(Neon 프로덕션).
공통 계약(DatabaseAdapter): 스키마 생성, 멱등 upsert, 런 기록, 프로젝트 조회, 분석 적재.
멱등 upsert = ON CONFLICT (source, runtime, source_ref) DO UPDATE (AC-03 · TC-15).
"""
from __future__ import annotations
import sqlite3, json, time
from datetime import datetime, timezone
from typing import Optional
from .schema_std import StandardProject

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL, runtime TEXT NOT NULL DEFAULT '',
  source_ref TEXT NOT NULL, run_id INTEGER,
  group_type TEXT NOT NULL, title TEXT, category TEXT, category_sub TEXT,
  budget_min INTEGER, budget_max INTEGER, budget_unit TEXT NOT NULL DEFAULT 'KRW',
  period_days INTEGER, region TEXT, work_type TEXT, role TEXT, level TEXT,
  tech_keywords TEXT, registered_at TEXT, deadline TEXT, applicants INTEGER,
  source_url TEXT, raw_json TEXT, created_at TEXT, updated_at TEXT,
  UNIQUE(source, runtime, source_ref)
);
CREATE TABLE IF NOT EXISTS collection_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL, runtime TEXT NOT NULL DEFAULT '',
  run_type TEXT NOT NULL DEFAULT 'manual', status TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0, success INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0, error TEXT,
  started_at TEXT NOT NULL, finished_at TEXT
);
CREATE TABLE IF NOT EXISTS analysis_category (
  source TEXT, category TEXT, cnt INTEGER, share_pct REAL,
  prev_cnt INTEGER, growth REAL, period TEXT
);
CREATE TABLE IF NOT EXISTS analysis_budget (
  source TEXT, bucket TEXT, cnt INTEGER, period TEXT
);
CREATE TABLE IF NOT EXISTS analysis_keyword (
  source TEXT, keyword TEXT, cnt INTEGER, prev_cnt INTEGER,
  growth_rate REAL, period TEXT
);
CREATE TABLE IF NOT EXISTS analysis_insights (
  type TEXT, title TEXT, body TEXT, metric TEXT, period TEXT, confidence TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS meta_maps (
  kind TEXT, src_value TEXT, std_value TEXT
);
CREATE TABLE IF NOT EXISTS keyword_snapshots (
  keyword TEXT NOT NULL, period TEXT NOT NULL,
  cnt INTEGER NOT NULL, captured_at TEXT NOT NULL,
  PRIMARY KEY(keyword, period)
);
"""


def _now():
    return datetime.now(timezone.utc).isoformat()


def _rows_from_standard(ps: list[StandardProject], for_postgres: bool = False):
    for p in ps:
        tech = p.tech_keywords if p.tech_keywords else []
        tech_val = tech if for_postgres else json.dumps(tech, ensure_ascii=False)
        raw_val = p.raw if for_postgres else (json.dumps(p.raw, ensure_ascii=False) if p.raw else "{}")
        if not for_postgres and tech_val == "[]":
            tech_val = "[]"
        yield (
            p.source, p.runtime, p.source_ref, None, p.group_type, p.title,
            p.category, p.category_sub, p.budget_min, p.budget_max, p.budget_unit,
            p.period_days, p.region, p.work_type, p.role, p.level,
            tech_val,
            p.registered_at, p.deadline, p.applicants, p.source_url,
            raw_val, _now(), _now(),
        )


class DatabaseAdapter:
    """공통 인터페이스. 구현: SqliteAdapter / PostgresAdapter."""
    def init_schema(self): raise NotImplementedError
    def upsert_projects(self, projects: list[StandardProject]) -> int:
        """멱등 upsert. 새로 삽입/갱신된 행 수를 반환(TC-15: 재실행 시 증가 없음)."""
        raise NotImplementedError
    def start_run(self, source, runtime="", run_type="manual") -> int: raise NotImplementedError
    def finish_run(self, run_id, status, total, success, failed, error=None): raise NotImplementedError
    def get_projects(self, source=None, runtime=None) -> list[StandardProject]: raise NotImplementedError
    def get_collection_runs(self, limit=50) -> list[dict]: raise NotImplementedError
    def count_projects(self, source=None) -> int: raise NotImplementedError
    def write_analysis(self, table: str, rows: list[dict]): raise NotImplementedError
    def upsert_keyword_snapshots(self, rows: list[dict]): raise NotImplementedError
    def get_prev_keyword_snapshot(self, before_period: str) -> Optional[dict]: raise NotImplementedError


class SqliteAdapter(DatabaseAdapter):
    """로컬 검증/개발용. 표준 라이브러리 sqlite3 (ON CONFLICT 지원)."""
    def __init__(self, path=":memory:"):
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row

    def init_schema(self):
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def upsert_projects(self, projects):
        sql = (
            "INSERT INTO projects (source,runtime,source_ref,run_id,group_type,title,category,"
            "category_sub,budget_min,budget_max,budget_unit,period_days,region,work_type,role,level,"
            "tech_keywords,registered_at,deadline,applicants,source_url,raw_json,created_at,updated_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) "
            "ON CONFLICT(source,runtime,source_ref) DO UPDATE SET "
            "title=excluded.title, category=excluded.category, category_sub=excluded.category_sub, "
            "budget_min=excluded.budget_min, budget_max=excluded.budget_max, "
            "budget_unit=excluded.budget_unit, period_days=excluded.period_days, "
            "region=excluded.region, work_type=excluded.work_type, role=excluded.role, "
            "level=excluded.level, tech_keywords=excluded.tech_keywords, "
            "registered_at=excluded.registered_at, deadline=excluded.deadline, "
            "applicants=excluded.applicants, source_url=excluded.source_url, "
            "raw_json=excluded.raw_json, updated_at=excluded.updated_at"
        )
        rows = list(_rows_from_standard(projects))
        cur = self.conn.executemany(sql, rows)
        self.conn.commit()
        return cur.rowcount

    def start_run(self, source, runtime="", run_type="manual") -> int:
        cur = self.conn.execute(
            "INSERT INTO collection_runs (source,runtime,run_type,status,total,started_at) "
            "VALUES (?,?,?,'running',0,?)", (source, runtime, run_type, _now()))
        self.conn.commit()
        return cur.lastrowid

    def finish_run(self, run_id, status, total, success, failed, error=None):
        self.conn.execute(
            "UPDATE collection_runs SET status=?, total=?, success=?, failed=?, error=?, finished_at=? "
            "WHERE id=?", (status, total, success, failed, json.dumps(error, ensure_ascii=False) if error else None,
                           _now(), run_id))
        self.conn.commit()

    def get_projects(self, source=None, runtime=None):
        q = "SELECT * FROM projects WHERE 1=1"
        args = []
        if source:
            q += " AND source=?"; args.append(source)
        if runtime is not None:
            q += " AND runtime=?"; args.append(runtime)
        rows = self.conn.execute(q, args).fetchall()
        out = []
        for r in rows:
            p = StandardProject(
                source=r["source"], runtime=r["runtime"] or "", source_ref=r["source_ref"],
                group_type=r["group_type"], title=r["title"], category=r["category"],
                category_sub=r["category_sub"], budget_min=r["budget_min"], budget_max=r["budget_max"],
                budget_unit=r["budget_unit"], period_days=r["period_days"], region=r["region"],
                work_type=r["work_type"], role=r["role"], level=r["level"],
                tech_keywords=json.loads(r["tech_keywords"] or "[]"),
                registered_at=r["registered_at"], deadline=r["deadline"], applicants=r["applicants"],
                source_url=r["source_url"], raw=json.loads(r["raw_json"] or "{}"),
            )
            out.append(p)
        return out

    def get_collection_runs(self, limit=50):
        rows = self.conn.execute(
            "SELECT id,source,runtime,run_type,status,total,success,failed,error,started_at,finished_at "
            "FROM collection_runs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def count_projects(self, source=None):
        q = "SELECT COUNT(*) c FROM projects"; args = []
        if source:
            q += " WHERE source=?"; args.append(source)
        return self.conn.execute(q, args).fetchone()["c"]

    def write_analysis(self, table, rows):
        table = table.lower()
        if table == "analysis_category":
            sql = "INSERT OR REPLACE INTO analysis_category VALUES (?,?,?,?,?,?,?)"
            data = [(r["source"], r["category"], r["cnt"], r["share_pct"], r.get("prev_cnt"), r.get("growth"), r["period"]) for r in rows]
        elif table == "analysis_budget":
            sql = "INSERT OR REPLACE INTO analysis_budget VALUES (?,?,?,?)"
            data = [(r["source"], r["bucket"], r["cnt"], r["period"]) for r in rows]
        elif table == "analysis_keyword":
            sql = "INSERT OR REPLACE INTO analysis_keyword VALUES (?,?,?,?,?,?)"
            data = [(r["source"], r["keyword"], r["cnt"], r.get("prev_cnt"), r.get("growth_rate"), r["period"]) for r in rows]
        elif table == "analysis_insights":
            sql = "INSERT OR REPLACE INTO analysis_insights VALUES (?,?,?,?,?,?,?)"
            data = [(r["type"], r["title"], r["body"], json.dumps(r.get("metric") or {}, ensure_ascii=False),
                     r["period"], r["confidence"], _now()) for r in rows]
        else:
            raise ValueError(f"unknown analysis table {table}")
        self.conn.executemany(sql, data)
        self.conn.commit()
        return len(data)

    # ---- 키워드 스냅샷(기간별 누적 → 성장률 계산용, 2026-08-25 B1) ----
    def upsert_keyword_snapshots(self, rows: list[dict]):
        sql = "INSERT OR REPLACE INTO keyword_snapshots VALUES (?,?,?,?)"
        data = [(r["keyword"], r["period"], r["cnt"], _now()) for r in rows]
        self.conn.executemany(sql, data)
        self.conn.commit()
        return len(data)

    def get_prev_keyword_snapshot(self, before_period: str) -> Optional[dict]:
        """before_period 직전 최신 스냅샷 {period: str, counts: {keyword: cnt}}. 없으면 None."""
        row = self.conn.execute(
            "SELECT period FROM keyword_snapshots WHERE period < ? ORDER BY period DESC LIMIT 1",
            (before_period,)).fetchone()
        if not row:
            return None
        period = row["period"]
        counts = {r["keyword"]: r["cnt"] for r in self.conn.execute(
            "SELECT keyword, cnt FROM keyword_snapshots WHERE period = ?", (period,))}
        return {"period": period, "counts": counts}


class PostgresAdapter(DatabaseAdapter):
    """Neon(PostgreSQL16) 프로덕션 어댑터. psycopg(v3) 사용 — 로컬 미설치 시 지연 import."""
    def __init__(self, dsn: str):
        self.dsn = dsn
        self._conn = None

    def _connect(self):
        if self._conn is None:
            try:
                import psycopg
            except ImportError as e:  # pragma: no cover
                raise RuntimeError("psycopg 미설치 — 'uv pip install psycopg[binary]' 필요") from e
            self._conn = psycopg.connect(self.dsn)
        return self._conn

    def init_schema(self):
        # PostgreSQL 전용 스키마 DDL은 loader/migrate/*.sql 참조(여기선 메타 실행)
        conn = self._connect()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.commit()

    def upsert_projects(self, projects):
        sql = (
            "INSERT INTO projects (source,runtime,source_ref,run_id,group_type,title,category,"
            "category_sub,budget_min,budget_max,budget_unit,period_days,region,work_type,role,level,"
            "tech_keywords,registered_at,deadline,applicants,source_url,raw_json,created_at,updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now(),now()) "
            "ON CONFLICT (source,runtime,source_ref) DO UPDATE SET "
            "title=EXCLUDED.title, category=EXCLUDED.category, category_sub=EXCLUDED.category_sub, "
            "budget_min=EXCLUDED.budget_min, budget_max=EXCLUDED.budget_max, "
            "budget_unit=EXCLUDED.budget_unit, period_days=EXCLUDED.period_days, "
            "region=EXCLUDED.region, work_type=EXCLUDED.work_type, role=EXCLUDED.role, "
            "level=EXCLUDED.level, tech_keywords=EXCLUDED.tech_keywords, "
            "registered_at=EXCLUDED.registered_at, deadline=EXCLUDED.deadline, "
            "applicants=EXCLUDED.applicants, source_url=EXCLUDED.source_url, "
            "raw_json=EXCLUDED.raw_json, updated_at=now()"
        )
        conn = self._connect()
        import json as _json
        from psycopg.types.json import Json as _Json
        raw_rows = list(_rows_from_standard(projects, for_postgres=True))
        rows = []
        for r in raw_rows:
            lst = list(r[:-2])
            # raw_json at index 21 (0-based) after slicing? full list length 24, sliced to 22: indices 0..21, raw_json is at 21
            # Convert raw_json dict to Json adapter if needed
            try:
                if isinstance(lst[21], dict):
                    lst[21] = _Json(lst[21])
                elif isinstance(lst[21], str):
                    # try parse json string
                    import json as _j2
                    try:
                        parsed = _j2.loads(lst[21])
                        lst[21] = _Json(parsed)
                    except Exception:
                        lst[21] = _Json({})
            except Exception:
                pass
            rows.append(tuple(lst))
        with conn.cursor() as cur:
            cur.executemany(sql, rows)
        conn.commit()
        return len(rows)

    def start_run(self, source, runtime="", run_type="manual") -> int:
        conn = self._connect()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO collection_runs (source,runtime,run_type,status,total,started_at) "
                "VALUES (%s,%s,%s,'running',0,now()) RETURNING id", (source, runtime, run_type))
            rid = cur.fetchone()[0]
        conn.commit()
        return rid

    def finish_run(self, run_id, status, total, success, failed, error=None):
        conn = self._connect()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE collection_runs SET status=%s,total=%s,success=%s,failed=%s,error=%s,finished_at=now() "
                "WHERE id=%s", (status, total, success, failed,
                                json.dumps(error, ensure_ascii=False) if error else None, run_id))
        conn.commit()

    def get_projects(self, source=None, runtime=None):
        q = "SELECT source,runtime,source_ref,group_type,title,category,category_sub,budget_min,budget_max,budget_unit,period_days,region,work_type,role,level,tech_keywords,registered_at,deadline,applicants,source_url,raw_json FROM projects WHERE 1=1"; args = []
        if source:
            q += " AND source=%s"; args.append(source)
        if runtime is not None:
            q += " AND runtime=%s"; args.append(runtime)
        conn = self._connect()
        cur = conn.execute(q, args)
        cols = [d.name for d in cur.description]
        out = []
        for row in cur.fetchall():
            m = dict(zip(cols, row))
            out.append(StandardProject(
                source=m.get("source"), runtime=m.get("runtime") or "", source_ref=m.get("source_ref"),
                group_type=m.get("group_type"), title=m.get("title"), category=m.get("category"),
                category_sub=m.get("category_sub"), budget_min=m.get("budget_min"), budget_max=m.get("budget_max"),
                budget_unit=m.get("budget_unit") or "KRW", period_days=m.get("period_days"), region=m.get("region"),
                work_type=m.get("work_type"), role=m.get("role"), level=m.get("level"),
                tech_keywords=m.get("tech_keywords") or [], registered_at=m.get("registered_at"),
                deadline=m.get("deadline"), applicants=m.get("applicants"), source_url=m.get("source_url"),
                raw=m.get("raw_json") or {}))
        return out

    def get_collection_runs(self, limit=50):
        conn = self._connect()
        rows = conn.execute("SELECT * FROM collection_runs ORDER BY id DESC LIMIT %s", (limit,)).fetchall()
        cols = [d.name for d in conn.execute("SELECT * FROM collection_runs LIMIT 0").description] if rows else []
        out = []
        for r in rows:
            try:
                out.append(dict(r._mapping))
            except AttributeError:
                out.append(dict(zip(cols, r)))
        return out

    def count_projects(self, source=None):
        conn = self._connect()
        q = "SELECT COUNT(*) FROM projects" + (" WHERE source=%s" if source else "")
        args = (source,) if source else ()
        return conn.execute(q, args).fetchone()[0]

    def write_analysis(self, table, rows):
        from psycopg.types.json import Json as _Json
        table = table.lower()
        conn = self._connect()
        if table == "analysis_category":
            sql = "INSERT INTO analysis_category (source,category,cnt,share_pct,prev_cnt,growth,period) VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (source,category,period) DO UPDATE SET cnt=EXCLUDED.cnt, share_pct=EXCLUDED.share_pct"
            data = [(r["source"], r["category"], r["cnt"], r["share_pct"], r.get("prev_cnt"), r.get("growth"), r["period"]) for r in rows]
        elif table == "analysis_budget":
            sql = "INSERT INTO analysis_budget (source,bucket,cnt,period) VALUES (%s,%s,%s,%s) ON CONFLICT (source,bucket,period) DO UPDATE SET cnt=EXCLUDED.cnt"
            data = [(r["source"], r["bucket"], r["cnt"], r["period"]) for r in rows]
        elif table == "analysis_keyword":
            sql = "INSERT INTO analysis_keyword (source,keyword,cnt,prev_cnt,growth_rate,period) VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (source,keyword,period) DO UPDATE SET cnt=EXCLUDED.cnt"
            data = [(r["source"], r["keyword"], r["cnt"], r.get("prev_cnt"), r.get("growth_rate"), r["period"]) for r in rows]
        elif table == "analysis_insights":
            sql = "INSERT INTO analysis_insights (type,title,body,metric,period,confidence,created_at) VALUES (%s,%s,%s,%s,%s,%s,now())"
            data = [(r["type"], r["title"], r["body"], _Json(r.get("metric") or {}), r["period"], r["confidence"]) for r in rows]
        else:
            raise ValueError(f"unknown analysis table {table}")
        with conn.cursor() as cur:
            cur.executemany(sql, data)
        conn.commit()
        return len(data)

    # ---- 키워드 스냅샷 (SqliteAdapter와 동일 계약) ----
    def upsert_keyword_snapshots(self, rows: list[dict]):
        conn = self._connect()
        sql = ("INSERT INTO keyword_snapshots (keyword,period,cnt,captured_at) VALUES (%s,%s,%s,now()) "
               "ON CONFLICT (keyword,period) DO UPDATE SET cnt=EXCLUDED.cnt")
        data = [(r["keyword"], r["period"], r["cnt"]) for r in rows]
        with conn.cursor() as cur:
            cur.executemany(sql, data)
        conn.commit()
        return len(data)

    def get_prev_keyword_snapshot(self, before_period: str) -> Optional[dict]:
        conn = self._connect()
        with conn.cursor() as cur:
            cur.execute("SELECT period FROM keyword_snapshots WHERE period < %s ORDER BY period DESC LIMIT 1",
                        (before_period,))
            row = cur.fetchone()
            if not row:
                return None
            period = row[0]
            cur.execute("SELECT keyword, cnt FROM keyword_snapshots WHERE period = %s", (period,))
            counts = {k: c for k, c in cur.fetchall()}
        return {"period": period, "counts": counts}
