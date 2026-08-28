# 기술 설계 (tech-design.md) — 시장조사·분석 대시보드

- **작성팀**: 개발팀 (dev-team) · **모드**: standard (8단계 — 개발)
- **기준**: trd.md(§1~8), plan.md(FR/AC)·tasks.md(Epic)·test-design.md(TC)·design-system.md(토큰)·design-qa-report.md(색 확정), `crawler_status_인계.md`(venv A/B 격리), 크롤러 원천 데이터(`crawled/`)
- **사용 스킬 로그**: `design`(컴포넌트·경계), `data-model`(Neon DDL·관계), `api`(REST 계약), `decide-adr`(TQ·ADR 귀결), `design-system`(토큰 준수·a11y), `plan-tests`(AC→TC 이행 근거), `md-to-html`(.html 병행)

---

## 0. 문서 목적

trd.md의 기술 요구를 **구체적 설계**로 확정한다. 오케스트레이터 승인 후 tech-design §11 순서로 **TDD 구현**을 진행한다. 본 문서는 **구현 전 승인 게이트** 산출물이다(승인 전 TDD 코드 작성 금지, tasks 지시).

---

## 1. 기술 스택 확정 (trd §1·계약·인계 반영)

| 계층 | 확정 기술 | 버전 | 역할 |
|---|---|---|---|
| 프론트 | **Cloudflare Pages + React + TypeScript + Vite** | React 18.3 · TS 5 · Vite 5 | 단일 페이지 SPA, 차트는 **내장 SVG 렌더러**(외부 CDN 금지) |
| API | **Cloudflare Workers (TypeScript)** | wrangler 3 · runtime 2024 | REST API 7종 + Cron(Phase2) |
| 보조 계산 | **Rust → WebAssembly** (aggregate crate) | Rust 2021 · wasm-bindgen | 키워드 랭킹·예산 버킷·증가율 계산(CPU) |
| DB | **Neon (PostgreSQL 16)** + Drizzle ORM | @neondatabase/serverless · drizzle-orm 0.30 | projects·collection_runs·analysis_* 저장·조회 |
| 수집 | **Python 크롤러 5종** (venv A/B 격리) | Python 3.11+, curl_cffi·lzstring·requests | 위시켓·프리모아·u300·u300 1기·Devpost |
| 정제·적재 | **Python 배치**(loader) + psycopg | psycopg v3 | 정규화·멱등 upsert·이력 |
| 스케줄 | Worker Cron Trigger + 외부 러너(GH Actions) | — | MVP on-demand CLI + 이력, Phase2 자동 Cron |

> **TQ-2(Rust 범위) 귀결**: Rust는 **Worker 내부 순수 집계 보조**로 한정. MVP에서 Worker가 precompute 테이블을 단순 조회하는 경로가 대부분이므로 Rust는 가벼운 감산 유틸(증가율·버킷·키워드 정렬)로 두고, **항상 TS 폴백과 동등 출력을 단위테스트로 검증**한다. Rust 없이도 시스템은 동작(정합성 유지) — 요구사항 NFR-01(Rust 포함)을 만족시키면서 실용 우선(trd TQ-2).

**TQ-5(차트) 귀결**: 외부 CDN 금지 + a11y 요구(design-system §3.3 키보드 스킴) 때문에 **경량 내장 SVG 차트 모듈**(donut/bar·histogram/line·area)을 선택. Chart.js류는 번들 내장 가능하나 키보드/스크린리더 확장이 어려워 제외. 각 차트는 `sr-only <table>/<dl>` 대체 + 범례 `tabindex=0 role=button` + 포커스 툴팁(`aria-live`) 포함.

**TQ-1(venv 통합) 귀결**: 구현 시 `crawler/venv-a`(curl_cffi: 프리모아·Devpost)·`crawler/venb-b`(lzstring+requests: 위시켓·u300) **관리형 venv 2개**를 생성해 인계서 환경과 1:1 매핑, `crawler/README.md`에 실행 매핑표 고정. 각 크롤러는 **자신의 venv 인터프리터로만 실행**(교차 실행 금지).

**TQ-3(TQ-3 Devpost 범위) 귀결**: MVP는 **샘플(전체 미수집)** — 크롤러는 이미 코드 완성이며 샘플 4건 이상 + 목록 링크 확보. 전체 전수는 Phase2.

**TQ-4(카테고리·키워드 맵 소스) 귀결**: 표준 카테고리/키워드 사전은 코드 config(`app/loader/etl/normalize/`)에 두되 **DB `meta_maps` 테이블로 승격**해 런타임 수정 가능(§5.4).

---

## 2. 시스템 아키텍처 (trd §2 구체화)

```
외부 사이트 (위시켓·프리모아·u300·Devpost)
        │  robots 준수 / crawl-delay 5(위시켓) / 쿠키 재사용
        ▼
Python 크롤러 5종 (venv-A: freemoa·devpost / venv-B: wishket·u300)
        │  표준 스키마 CSV/JSON + meta.json  →  crawled/
        ▼
Python loader 배치  (etl: 정규화·PII필터·멱등 upsert · collection_runs 기록)
        │  쓰기 계정(DB_URL_RW)
        ▼
Neon (PostgreSQL 16)
   projects · collection_runs · analysis_category · analysis_budget
   analysis_keyword · analysis_insights · meta_maps
        ▲  읽기 계정(DB_URL_RO), precompute 테이블 조회
        │
Cloudflare Workers (TS)  ←─ Rust(WASM) 보조 집계
   /api/summary /api/sources /api/analysis /api/insights
   /api/projects /api/projects/:id /api/runs  (+ /api/crawl/trigger Phase2)
        │  JSON (Cache API, 짧은 TTL)
        ▼
Cloudflare Pages SPA (React+TS)
   헤더→사이트별→시장조사→기능방향→시장성→수집이력  (6섹션, 반응형·다크모드)
```

**데이터 흐름**: 크롤러 → 로더(정제·멱등 적재) → Neon precompute → Worker API(읽기/집계) → Pages UI.
- **분석 경로 선택(trd §2)**: MVP는 **Worker가 precompute 테이블을 조회**하는 경로(b)를 기본. 키워드/텍스트 정제는 **로더 적재 시 Python 전처리**(a)로 재계산 원천 확보. 원본 `raw_json` 보존으로 분석 재계산 가능.

---

## 3. 프론트 / 백엔드 / DB 모듈 구조

### 3.1 프론트(web/) — 단일 페이지 6섹션
- `styles/tokens.css`: design-system §1~2 토큰(CSS 변수) 1:1 이식. `--bg`,`--surface`, `--text*`, `--primary*`, 상태·신뢰 뱃지 토큰(design-qa-report §1.1 확정값), 간격·타이포 스케일.
- `sections/`: Header(요약카드·앵커·다크모드·수집실행), Sources(소스 탭·목록·검색·페이징), Analysis(차트 5종), Features(기능방향 후보), Market(시장성 인사이트·신뢰뱃지), Runs(수집이력).
- `charts/`: `SvgChart` 베이스 + DonutChart, BarChart(히스토그램), LineAreaChart, KeywordRank. **A11y 내장**(design-system §3.3): sr-only 테이블, 범례 tabindex/role=button, focus 툴팁+aria-live, canvas 대신 SVG+aria-label.
- 상태: 섹션별 스켈레톤(300ms 임계)·에러 배너+재시도·빈 상태 문구 분기. `role=status`·`aria-live`·스킵링크·모달 포커스 트랩(design-system §6).
- 반응형: `--sp`·그리드(4.2절), 모바일 차트 세로 1열 + 과다 시 탭 뷰(3.3절 C3), 테이블→카드 변환.
- 다크모드: `<html data-theme>` + `localStorage` + OS `prefers-color-scheme`(design-system §7).
- API: `api/client.ts` fetch 래퍼 — base `import.meta.env.VITE_API`(Worker URL).

### 3.2 백엔드(worker/) — 라우팅
- `index.ts`: 경로 분기(`/api/*`) → `routes/*` 핸들러. CORS(동일 origin/Pages 도메인) 허용. 캐시 헤더·무효화(§6.3).
- `db/client.ts`: `@neondatabase/serverless` + `drizzle` 쿼리 빌더. **읽기 계정(DB_URL_RO)** 만 사용(쓰기는 로더 전용).
- `agg/`: Rust WASM(`wasm/pkg`) 호출 래퍼. 함수: `rankKeywords`, `budgetBuckets`, `growthRate`, `sortByShare`(정렬).
- `util/error.ts`: 공통 에러 JSON 규격(§6.8).

### 3.3 크롤러(crawler/) — 5종 (인계서·real schema 반영)
| 크롤러 | venv | 원천 계약 | 수집 대상(MVP) | 출력 |
|---|---|---|---|---|
| `crawl_wishket_oauth.py` | B(lzstring) | 목록 `?d=LZ(pt=task_based&page=N)`, count API, 쿠키 재사용, crawl-delay 5 | 도급 목록·상세(로그인 게이트 항목 제외) | crawled/wishket_oauth/ |
| `crawl_freemoa.py` | A(curl_cffi) | POST `/m4a/s41a`(workType=1) + `/m4a/s41v` | 도급 목록(txt 상세 포함), **client_id 저장 제외** | crawled/freemoa_oauth/ |
| `crawl_u300.py` | B(lzstring) | 공개 API `get-ipo-company-data-list` + `-data?icNo=` | 현재 357건(`current`) | crawled/u300/ |
| `crawl_u300.py` (peNo) | B(lzstring) | past1 전시 API(`pe_*.json`) | 1기 60건(`past1`) | crawled/u300_past1/ |
| `crawl_devpost.py` | A(curl_cffi) | 공개 `devpost.com/software/?page=` + 상세 | 개발 관련 해커톤 샘플 | crawled/devpost/ |

> 예외/재시도/멱등/crawl-delay는 coding-convention §2.3·§5·§8 따라 구현. 위시켓 `total_dogup`(약 4.9~6.6만)은 count API로 기록, MVP 수집은 목록 페이지 수·상세 수 제한(CLI 옵션)으로 **제한적 실행**(인계서 "전체 수집은 개발 단계에 실행" 방침에 따라 시드/샘플 우선).

### 3.4 로더(loader/) — 정제·적재
- `schema_std.py`: 공통 안건 dataclass(§5.1에 매핑).
- `normalize/`: `budget.py`(만원→원, 단위 통일+null 정책), `category.py`(표준 카테고리 맵), `date.py`(여러 포맷 파싱, 실패 시 null), `keyword.py`(컬럼·태그 분리→키워드 배열).
- `dedupe.py`: `INSERT ... ON CONFLICT (source, runtime, source_ref) DO UPDATE`(멱등).
- `piifilter.py`: `client_id`·이메일 패턴 제거(내용 값 sanitize 후 raw_json에도 미포함 — TC-06).
- `run_collection.py`: MVP wrapper — venv A/B 크롤러 순차 실행 → `collection_runs`에 런 생성/기록 → 로더 적재 → 분석 재계산 트리거.

---

## 4. 프로젝트 폴더 (구현 루트 `app/`)

 전체 구조와 명명·커밋·테스트 규칙은 **`coding-convention.md` §3~5** 참조(동일 경로 계약). 핵심: `app/worker`(API+WASM) / `app/web`(SPA) / `app/crawler`(venv A/B) / `app/loader`(ETL+migrate) / `app/scripts`(운영).

---

## 5. 데이터 모델 — Neon (PostgreSQL 16)

> 스키마 버저닝: `app/loader/migrate/00X_*.sql` 순차 적용, `schema_migrations` 테이블로 버전 추적. 모든 테이블 DDL은 `COMMENT ON`으로 용도·단위·PII 정책 명시.

### 5.1 `projects` (공통 안건)
```sql
CREATE TABLE IF NOT EXISTS projects (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,                -- wishket|freemoa|u300|devpost
  runtime       TEXT NOT NULL DEFAULT '',     -- u300: current|past1, 그 외 ''
  source_ref    TEXT NOT NULL,                -- 원본 ID(proj_idx/icNo/peNo/slug)
  run_id        BIGINT REFERENCES collection_runs(id),
  group_type    TEXT NOT NULL,                -- si_contract|startup|hackathon
  title         TEXT,
  category      TEXT,                         -- 표준 카테고리(§5.4)
  category_sub  TEXT,
  budget_min    BIGINT,                       -- 원(KRW), 협의/0 → NULL
  budget_max    BIGINT,
  budget_unit   TEXT NOT NULL DEFAULT 'KRW',  -- 'KRW'(총액) | 'KRW_MONTH'(월)
  period_days   INT,
  region        TEXT,
  work_type     TEXT,                         -- contract|term|onsite|startup|hackathon
  role          TEXT,
  level         TEXT,                         -- 위시켓 레벨
  tech_keywords TEXT[],
  registered_at TIMESTAMPTZ,
  deadline      TIMESTAMPTZ,
  applicants    INT,
  source_url    TEXT,
  raw_json      JSONB,                        -- 원본 보존(재계산 대비), PII 필터 후
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_projects_src UNIQUE (source, runtime, source_ref)
);
CREATE INDEX IF NOT EXISTS ix_projects_source    ON projects (source, runtime);
CREATE INDEX IF NOT EXISTS ix_projects_category  ON projects (category);
CREATE INDEX IF NOT EXISTS ix_projects_regdate   ON projects (registered_at);
CREATE INDEX IF NOT EXISTS ix_projects_budget    ON projects (budget_min, budget_max);
CREATE INDEX IF NOT EXISTS ix_projects_keywords  ON projects USING GIN (tech_keywords);
```
> **PII 차단**: `client_id` 컬럼을 **생성하지 않음**(스키마 차원 차단). raw_json 적재 전 로더의 `piifilter`가 제거(TC-06).

### 5.2 `collection_runs` (수집 이력 — FR-02/11)
```sql
CREATE TABLE IF NOT EXISTS collection_runs (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  runtime     TEXT NOT NULL DEFAULT '',
  run_type    TEXT NOT NULL DEFAULT 'manual', -- manual|cron
  status      TEXT NOT NULL,                  -- success|partial|failed
  total       INT NOT NULL DEFAULT 0,
  success     INT NOT NULL DEFAULT 0,
  failed      INT NOT NULL DEFAULT 0,
  error       JSONB,                          -- {count, causes:[...]}
  started_at  TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_runs_source ON collection_runs (source, started_at DESC);
```

### 5.3 분석 precompute 테이블 (FR-06~08, ADR-2)
```sql
CREATE TABLE IF NOT EXISTS analysis_category (
  source   TEXT, category TEXT, cnt INT, share_pct NUMERIC,
  prev_cnt INT, growth NUMERIC, period TEXT, PRIMARY KEY(source, category, period)
);
CREATE TABLE IF NOT EXISTS analysis_budget (
  source TEXT, bucket TEXT,          -- 예산 구간 라벨(예: '0-100만', '100-300만', 'null')
  cnt INT, period TEXT, PRIMARY KEY(source, bucket, period)
);
CREATE TABLE IF NOT EXISTS analysis_keyword (
  source TEXT, keyword TEXT, cnt INT, prev_cnt INT, growth_rate NUMERIC,
  period TEXT, PRIMARY KEY(source, keyword, period)
);
CREATE TABLE IF NOT EXISTS analysis_insights (
  type TEXT,        -- category|keyword|feature|market
  title TEXT, body TEXT, metric JSONB, period TEXT,
  confidence TEXT,  -- high|mid|low (TC-29)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS meta_maps (      -- 카테고리/키워드 사전(러닝맵)
  kind TEXT, src_value TEXT, std_value TEXT, PRIMARY KEY(kind, src_value)
);
```
- `analysis_*`는 **로더 배치(또는 Worker)가 재계산**해 갱신. `confidence`는 분석 규칙/데이터 규모 기반 산정(신뢰 뱃지 원천).

### 5.4 정규화 맵 (FR-03)
- **예산(budget)**: 프리모아 `cost_min/cost_max`(만원) → `×10,000` 원. 위시켓 "원/월"은 `budget_unit='KRW_MONTH'`. 값 0·"협의 후 결정"·공백 → `NULL`(분포 제외 + 별도 null 카운트, AC-06-2). `budget_unit`으로 총액/월 구분.
- **표준 카테고리(category)**: `fld`/`fld_nm_2nd`(프리모아), 위시켓 카테고리, u300 `ipoPart`(정보·통신, 바이오 등), Devpost 기술 태그 → 표준 맵(예: AI·데이터, 웹, 앱, 플랫폼, 블록체인, 게임, 디자인, 기획, 인프라, 기타). `meta_maps(kind='category')`에서 관리.
- **기술 키워드(tech_keywords)**: 프리모아 `proj_language`(쉼표 분리), Devpost `built_with`, 위시켓 상세 태그, u300 `hashTags` → 소문자 정규화·중복 제거. `meta_maps(kind='keyword_synonym')`로 동의어 통합.
- **날짜(registered_at)**: 프리모아 `INS_TIME`, 위시켓 `등록일`, u300 `createdAt` 등 여러 포맷 → 파싱 실패 시 `NULL` 허용(AC-03-1). 
- **work_type**: 프리모아 `workType`(1=도급 contract), 위시켓 `pt=task_based`(contract/기간제 term), u300=startup, Devpost=hackathon. `group_type`도 함께 부여.

---

## 6. 라이브러리 / 도구 선택 (trd NFR 반영)

| 용도 | 선택 | 근거 |
|---|---|---|
| DB 읽기(Worker) | `@neondatabase/serverless` + `drizzle-orm` | 서버리스·엣지 호환, TS 타입 안전, 가벼움 |
| DB 쓰기(배치) | `psycopg`(v3) | Python 배치·bulk upsert 우수 |
| 마이그레이션 | 버저닝 SQL(+ dart-seed 스크립트) | 단순·감사 가능. ORM push 대신 SQL 우선 |
| 차트 | 내장 SVG 모듈(자체) | 외부 CDN 금지 + a11y 키보드 스킴 요구 충족 |
| 아이콘 | SVG 인라인(currentColor) | 다크모드 자동 반영, CDN 불요 |
| 프론트 빌드 | Vite | 빠름, 정적 산출 Cloudflare Pages 배포 적합 |
| Worker 배포 | wrangler | Cloudflare 표준 |
| 로컬 실행/CI | npm + uv(로더/py) + cargo | ROI·환경 격리 |
| 테스트 | Vitest(worker) · pytest(loader) · Playwright(E2E) · cargo test(wasm) | 계층별(A §5) |
| 코드 품질 | eslint/prettier · ruff · clippy+rustfmt | CI 게이트 |

> **보안(NFR-06)**: Worker는 읽기 계정만, 배치만 쓰기 계정. DSN·비밀은 **Workers/Neon Secrets**(`DB_URL_RO`, `DB_URL_RW`) — 코드·환경파일에 평문 금지. 크롤러 쿠키는 `crawled/*/cookies_*.json`로 로컬 한정·`.gitignore` 처리.

---

## 7. API 계약 (REST, trd §3.4 구체화)

> 공통: Base = Worker URL. 응답 공통 규격 `{ ok, data?, error? }`. 엔드포인트는 `/api` 접두. 인증 없음(NG5). 캐시: 집계 GET은 `Cache-Control: public, s-maxage=<TTL>`, 수집 후 무효화(§7.8).

### 7.1 `GET /api/summary` — 요약 카드
```
data: {
  total, lastRunAt, status,            // success|partial|failed|none
  bySource: { wishket:{c}, freemoa:{c}, u300:{c}, devpost:{c} },
  recentRuns: [{source,status,count,at}]
}
```

### 7.2 `GET /api/sources` — 소스별 현황·추이
```
data: { sources: [{ key, label, group, count, lastRun, trend:[{month,cnt}] }] }
```

### 7.3 `GET /api/analysis?source=all` — 분석 차트 5종
```
data: {
  categories: [{source,name,cnt,sharePct}],
  budget:     {histogram:[{bucket,count}], nullCount, unit},
  period:     {histogram:[{bucketDays,count}], nullCount},
  workType:   {contract,term,onsite,startup,hackathon,other},
  keywords:   [{keyword,cnt,prevCnt,growthRate}],
  monthly:    [{month:'YYYY-MM', cnt}]
}
```

### 7.4 `GET /api/insights?type=market|feature` — 기능·시장성 인사이트
```
data: { insights: [{ type, title, body, metric:{...}, period, confidence:'high|mid|low' }] }
```
> 신뢰 뱃지 원천 = `confidence`(예: `market` 저신뢰 항목은 `confidence:'low'` → UI 뱃지·"~로 추정" 표현). **저신뢰 수치 단정 금지(TC-29)** 는 UI(§3.1·design-system §3.4)에서 강제.

### 7.5 `GET /api/projects?source=&page=&size=&q=&category=` — 목록·검색·페이징
```
data: { items:[{id,title,budgetMin,budgetMax,budgetUnit,periodDays,category,
               registeredAt,applicants,sourceUrl}], total, page, size }
```
null 필드 → `null`, UI에서 "정보 없음"(AC-10-1).

### 7.6 `GET /api/projects/:id` — 경량 상세
```
data: { ...projects 행(§5.1), raw_json은 비공개 상세 필드 제외·간단 요약만 }
```
> 개인정보·로그인 게이트 항목 미포함(목록 필드 기반, NG7).

### 7.7 `GET /api/runs` — 수집 이력
```
data: { runs:[{ id,source,runtime,status,total,success,failed,error,startedAt,finishedAt }] }
```

### 7.8 `POST /api/crawl/trigger` (Phase2 Cron 예약) · 캐시/에러
- Phase2: Worker Cron Trigger가 호출 → 외부 러너(GH Actions/로컬)에 신호 → 크롤러+로더 실행 → Neon → 캐시 무효화.
- **에러 규격**: `{ ok:false, error:{ code:'DB_ERROR', message:'...' } }`, 상태 400/404/500.
- **캐시 무효화**: 수집 완료/로더 재계산 후 Worker에 `PURGE` 신호 또는 `Cache-Control` 짧은 TTL(집계 ≤5분, 요약 ≤1분)로 자동 갱신. CSP: Pages에서 자기 origin + 데이터 API만 허용(외부 스크립트 차단).

---

## 8. 배포 / 환경 / Cron (trd §7)

- **Pages(SPA)**: `app/web` Vite 빌드 → Cloudflare Pages 배포(worker 바인딩 `API`로 연결). 로그인 없이 공개 URL(NFR-03), 외부 CDN 없음.
- **Worker(API)**: `wrangler deploy`, `compatibility_date` 고정, `DB_URL_RO` Secret. Rust WASM은 `wasm-pack build --target web` 후 Worker 번들에 포함.
- **Neon**: 프로젝트 + dev/staging 브랜치. `loader/migrate`로 DDL 버전 적용. 읽기/쓰기 계정 분리(§6).
- **크롤러 실행**: `crawler/` venv A/B에서 `run_collection.py`로 수동 실행(contrib + 이력). Phase2는 GH Actions 크론 → 러너 실행 → Worker 캐시 무효화.
- **모니터링**: Worker `console.log`, `collection_runs` 상태로 수집 신뢰 추적(SC-1). 실패 시 `status='partial|failed'` + `error` 기록, 재실행 멱등.

---

## 9. 성능 (NFR-02)

- 대시보드 로드 < 2s: 정적 Pages + Worker 캐시(집계 짧은 TTL). precompute 테이블 조회로 원본 대량 스캔 회피(ADR-2).
- 집계 API hit < 200ms, miss < 500ms(1만 건 기준). Neon 인덱스(§5.1)로 커버.
- 데이터 규모: 수만 건 이하 → 서버리스/Cache로 충분, 대규모 인프라 불필요.

---

## 10. 정합성 체크 (trd · plan · tasks · design-qa)

| 항목 | 체크 | 결과 |
|---|---|---|
| trd §1 스택 | CF+Neon+Rust+Python 고정, venv A/B 격리(ADR-1) | ✅ |
| trd §2 데이터흐름 | 크롤러→로더→Neon→Worker→Pages, 분석 경로(b a) | ✅ |
| trd §3.3 테이블 | projects/collection_runs/analysis_* + meta_maps | ✅ |
| trd §3.4 API | 8개 엔드포인트(S+trigger) 확정, 캐시·에러 규격 | ✅ |
| trd §4 NFR | NFR-01~06 반영(§1·6·8·9) | ✅ |
| trd §6·8 ADR/TQ | ADR-1~4 유지, TQ-1~5 귀결(§1) | ✅ |
| plan AC-01~11 | DDL·정규화·API·UI 섹션 매핑 완료 | ✅ |
| tasks Epic1~5 | 프로젝트 구조(§3)가 에픽 5개 커버, 실행순서 §11 | ✅ |
| test-design TC-01~34 | 구현 순서·계층별 도구·P0 게이트 반영(coding §5) | ✅ |
| design-system | 토큰·a11y·가드레일(coding §2·web §3.1) 반영 | ✅ |
| design-qa C1~C6 | 색 토큰 확정값 사용, 뱃지 토큰화, 키보드 스킴, 반응형 탭 | ✅ |
| PII(NFR-06·NG6/7) | 스키마 미생성+piifilter+Sanitize(TC-06) | ✅ |
| 저신뢰 단정 금지(TC-29) | `confidence`+신뢰뱃지+표현 제한(§7.4·§3.1) | ✅ |

> **오픈 이슈 후속**: 기획QA M-1(AC-08-2 매핑)은 **개발QA 단계**에서 test-design 보강으로 처리(MVP 기능 공백 없음, TC-28/29/31에 함의 흡수). M-3(범위 한정 각주)은 plan에 비차단 권고로 기록 유지.

---

## 11. TDD 구현 순서 (Epic 순)

> 프로젝트 루트 `app/`. 각 단계: **실패 테스트 작성 → 최소 구현 → 그린 → 리팩터(라운드) → 커밋**. 문서 규칙은 coding-convention §2~5.

1. **Epic 1 (수집·적재)** — `loader/` 스키마(migrate 001)·`schema_std`, 정규화 맵(예산·카테고리·날짜·키워드), `piifilter`, `dedupe(멱등 upsert)`, `collection_runs` 적재, `run_collection.py` wrapper. 크롤러는 기존 5종을 venv A/B에서 재검증·샘플 산출(재실행 위주). → **TC-01~19, TC-06·15(P0)**.
2. **Epic 2 (분석)** — 분석 재계산 로직: 카테고리 점유·예산/기간 버킷·상주vs도급·키워드 랭킹(월간)·월간 추이·기능후보·시장성 인사이트(증가율+confidence). → **TC-22~29(P0 TC-29)**.
3. **Epic 3 (API)** — Worker 스캐폴딩(`wrangler`), Neon 읽기 연결, `/api/*` 7종 + 에러/캐시. Rust(WASM) `agg` 모듈(랭킹·버킷·증가율) + TS 폴백·동등 테스트. → **TC-14·TC-18~26 계약 테스트**.
4. **Epic 4 (UI)** — Pages SPA: tokens.css → 6섹션 → SVG 차트(a11y) → 상태(빈/에러/로딩) → 반응형·다크모드 → 모달·드릴다운·신뢰뱃지·수집 실행 버튼. → **TC-20/21/30/31/32/33/34(E2E)**, a11y(axe·대비).
5. **Epic 5 (배포·검증)** — 배포 파이프라인, Neon 마이그레이션 배포·시드, Secrets, 크롤러·적재 통합 검증, 대시보드 E2E(개발QA 협조). → **NFR 게이트**.

**DoD(Epic별·전체)** 는 tasks.md와 coding-convention §8 가드레일 + test-design 릴리스 게이트(P0·P1·P2)로 확인한다.

---

## 12. 리스크·오픈 이슈 (구현 시 주의)

| 항목 | 처리 |
|---|---|
| R1/R2 쿠키 만료·구조 변경 | 크롤러 오류 명시·부분 실패·이력, 재실행 멱등, 쿠키 재발급 문서화(coding §2.3) |
| R3 법적·과도 요청 | crawl-delay 5(위시켓)·robots 준수·개인정보 제외, 요청 최소화(§3.3) |
| R4 표준화 오류 | 카테고리/키워드 사전을 `meta_maps`로 관리해 수정 용이, null 정책 명시(§5.4) |
| R5 저신뢰 수치 | 원천 크롤 값 우선, `confidence` 주석, 단정 금지 표기(§7.4) |
| R6 크로스-출처 이질성 | `group_type`(si_contract/startup/hackathon) 분리 집계 + 공통 스키마(§5.1) |
| 원본 링크 소멸 | UI에서 "원본을 찾을 수 없음" 안내(AC-05-2 edge, storyboard S-02) |

---

## 13. 사용 스킬 로그 (요약)

- `design` — 시스템/모듈 계층·경계(§2·§3) 설계.
- `data-model` — Neon DDL(§5), 관계·인덱스·정규화 설계.
- `api` — REST 계약 엔드포인트·JSON 규격·에러/캐시(§7).
- `decide-adr` — TQ-1~5·ADR 귀결(§1) 기술 결정 기록.
- `design-system` — 디자인 토큰·a11y·반응형·다크모드 준수 규칙(§3.1, design-system §3.3·§6).
- `plan-tests` — AC→TC 이행·구현 순서(§11) 근거, P0 게이트 반영(coding §5).
- `md-to-html` — `.html` 병행 산출.

---
*끝 — 승인 후 §11 순서로 TDD 구현을 진행한다. 이 문서는 tasks 지시에 따라 **tech-design 승인 전에는 구현을 시작하지 않는다**.*
