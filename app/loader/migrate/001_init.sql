-- 001_init.sql — 시장조사 대시보드 초기 스키마 (PostgreSQL 16 / Neon)
-- tech-design §5.1~5.3 · coding-convention §2.5 (안전한 식별자·멱등 DDL·PII 차단)
BEGIN;

CREATE TABLE IF NOT EXISTS projects (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  runtime       TEXT NOT NULL DEFAULT '',
  source_ref    TEXT NOT NULL,
  run_id        BIGINT,
  group_type    TEXT NOT NULL,
  title         TEXT,
  category      TEXT,
  category_sub  TEXT,
  budget_min    BIGINT,
  budget_max    BIGINT,
  budget_unit   TEXT NOT NULL DEFAULT 'KRW',
  period_days   INT,
  region        TEXT,
  work_type     TEXT,
  role          TEXT,
  level         TEXT,
  tech_keywords TEXT[],
  registered_at TIMESTAMPTZ,
  deadline      TIMESTAMPTZ,
  applicants    INT,
  source_url    TEXT,
  raw_json      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_projects_src UNIQUE (source, runtime, source_ref)
);
COMMENT ON TABLE projects IS '표준 안건. client_id/이메일 등 PII는 스키마 자체에 미포함(NFR-06/TC-06)';
CREATE INDEX IF NOT EXISTS ix_projects_source   ON projects (source, runtime);
CREATE INDEX IF NOT EXISTS ix_projects_category ON projects (category);
CREATE INDEX IF NOT EXISTS ix_projects_regdate  ON projects (registered_at);
CREATE INDEX IF NOT EXISTS ix_projects_budget   ON projects (budget_min, budget_max);
CREATE INDEX IF NOT EXISTS ix_projects_keywords ON projects USING GIN (tech_keywords);

CREATE TABLE IF NOT EXISTS collection_runs (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  runtime     TEXT NOT NULL DEFAULT '',
  run_type    TEXT NOT NULL DEFAULT 'manual',
  status      TEXT NOT NULL,
  total       INT NOT NULL DEFAULT 0,
  success     INT NOT NULL DEFAULT 0,
  failed      INT NOT NULL DEFAULT 0,
  error       JSONB,
  started_at  TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_runs_source ON collection_runs (source, started_at DESC);

CREATE TABLE IF NOT EXISTS analysis_category (
  source TEXT, category TEXT, cnt INT, share_pct NUMERIC,
  prev_cnt INT, growth NUMERIC, period TEXT, PRIMARY KEY(source, category, period)
);
CREATE TABLE IF NOT EXISTS analysis_budget (
  source TEXT, bucket TEXT, cnt INT, period TEXT, PRIMARY KEY(source, bucket, period)
);
CREATE TABLE IF NOT EXISTS analysis_keyword (
  source TEXT, keyword TEXT, cnt INT, prev_cnt INT, growth_rate NUMERIC,
  period TEXT, PRIMARY KEY(source, keyword, period)
);
CREATE TABLE IF NOT EXISTS analysis_insights (
  type TEXT, title TEXT, body TEXT, metric JSONB, period TEXT,
  confidence TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS meta_maps (
  kind TEXT, src_value TEXT, std_value TEXT, PRIMARY KEY(kind, src_value)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
