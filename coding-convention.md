# 개발 규약 (coding-convention.md) — 시장조사·분석 대시보드

- **작성팀**: 개발팀 (dev-team) · **모드**: standard (8단계 — 개발)
- **기준**: trd.md(기술), plan.md(FR/AC), tasks.md(에픽/태스크), test-design.md(테스트), design-system.md(디자인 토큰·금지목록), design-qa-report.md(색 토큰 확정값)
- **적용 범위**: 크롤러(Python) · 정제/적재 배치(Python) · Cloudflare Worker(TS) · Rust(WASM) · Cloudflare Pages SPA(React+TS) · SQL(PostgreSQL)
- **사용 스킬 로그**: `design`(모듈 경계·계층), `data-model`(Neon DDL), `api`(API 계약 규칙), `design-system`(디자인 토큰 준수), `a11y-audit`(WCAG AA 가드레일), `md-to-html`(.html 병행)

---

## 1. 언어 / 프레임워크 / 런타임 버전 (고정)

| 영역 | 기술 | 버전(권장) | 비고 |
|---|---|---|---|
| 런타임 | Node.js (로컬·CI) | **22 LTS** | `node -v` 초기화 |
| API/Worker | Cloudflare Workers | wrangler ^3.x · runtime 2024-xx | compat date 고정 |
| 프론트 | React + TypeScript + Vite | React 18.3.x · TS 5.x · Vite 5.x | 단일 페이지 SPA |
| DB | Neon(PostgreSQL) | **PostgreSQL 16** | serverless, @neondatabase/serverless |
| ORM/마이그레이션 | Drizzle ORM + 버저닝 SQL | drizzle-orm ^0.30 | node-postgres/psycopg는 배치 전용 |
| 보조 계산 | Rust → WebAssembly | Rust edition 2021 (stable 1.79+) · wasm-bindgen 0.2.x | `wasm-pack` 빌드 |
| 수집/정제 | Python | **3.11+** | venv A/B 격리 |
| HTTP(크롤러) | curl_cffi / requests+ lzstring | curl_cffi ^0.7 · lzstring ^0.1 | venv A=curl_cffi, venv B=lzstring |

> **버전 변경 시**: `wrangler.toml`의 `compatibility_date`, `package.json`(web·worker), `Cargo.toml`, 크롤러 `requirements-*.txt`를 **3곳 이상** 동시 갱신하고 CI에서 고정한다. 버전은 커밋 메시지·PR에 명기.

---

## 2. 코드 스타일

### 2.1 공통 (전 언어)
- **NFR-06/디자인 가드레일 최우선**: 어떤 계층에서도 `client_id`·이메일·개인정보를 기록/로그/응답에 **절대 출력·저장 금지**. 도메인 텍스트에 이메일 패턴이 검출되면 sanitize(`[email]` 치환).
- **하드코딩 색·간격 금지**: UI의 모든 색·간격·타이포는 design-system 토큰(CSS 변수)만 사용. 리터럴 hex 금지(design-qa `token lint`가 검증).
- **외부 CDN 금지**: 차트·아이콘·폰트·스크립트는 전부 빌드 시 번들/내장. `https://...` 외부 스크립트 참조 금지.
- **한국어 주석/문서** 기본(API 응답 메시지 제외), 코드 식별자는 영문.

### 2.2 TypeScript (Web + Worker)
- `strict: true`, `noUncheckedIndexedAccess: true`. `tsconfig` 상속 공용.
- 프레임워크: 함수 컴포넌트 + Hooks. 클래스 컴포넌트 금지.
- 타입은 도메인 단위 파일(`types.ts`)에 집중 정의, API 응답 타입은 계약 문서(tech-design §7)와 1:1.
- 네이밍: 컴포넌트 `PascalCase.tsx`, 훅 `useX.ts`, 유틸 `camelCase.ts`, 상수 `UPPER_SNAKE`.
- props 타입은 `XxxProps`로 명명.
- 비동기: `async/await`. `try/catch`를 라우터/API 진입점에서 최소 1회 수집해 **일관된 에러 JSON** 반환(trd §3.4, 아래 §6).
- ESLint(flat config) + Prettier. 린트·포맷은 CI 게이트.

### 2.3 Python (크롤러·정제 배치)
- **PEP 8 + ruff**(`ruff check`·`ruff format`)를 CI 게이트. `pyproject.toml`(또는 `setup.cfg`)에 규칙 고정: `E4/E7/E9`, `F`, `W5`.
- 크롤러 명명: `crawl_<source>[_oauth|_variant].py` (기존 `scripts/`와 일치 유지). 정제 로직은 `etl/` 모듈로 분리(크롤러 본문은 수집 전용).
- 함수·모듈 docstring은 한국어 1~3줄. 타입 힌트 사용. `logging` 표준 모듈 사용(`print` 금지, 로깅으로).
- 실행 진입점은 `if __name__ == "__main__":` + `argparse`(CLI 옵션 재사용, 인계서 옵션 유지).
- **재시도 정책**: 네트워크 재시도는 `request()` 헬퍼 내부에서만(크롤러당 최대 3회, `time.sleep` 백오프). **무한 재시도 금지**.
- 예외는 구체 타입(`requests.RequestException` 등)으로 잡고 상황 메시지 포함.

### 2.4 Rust (WASM)
- 채택 규칙: **순수 함수·CPU 집중 연산만** Rust로(키워드 랭킹, 예산 버킷, 증가율 계산). I/O·HTTP·DB는 TS/Python 책임.
- `#![forbid(unsafe_code)]`(의존성 외 unsafe 금지). `cargo clippy -- -D warnings` 게이트.
- 네이밍: Rust 관례(snake_case fn, UpperCamelCase type). `wasm_bindgen`으로 노출한 함수는 `pub fn` + `#[wasm_bindgen]`.
- 테스트: `#[cfg(test)]` 단위 테스트 + `wasm-pack test`(또는 `cargo test` 네이티브).
- 외부 크레이트 최소화(serde, wasm-bindgen, js-sys만 기본).

### 2.5 SQL (PostgreSQL)
- 식별자는 **snake_case**. 테이블·컬럼 주석(COMMENT ON)으로 용도 명시.
- 대량 쓰기는 **배치 upsert**(`INSERT ... ON CONFLICT (source, runtime, source_ref) DO UPDATE`).
- 인덱스: 조회·집계 컬럼(`source`,`category`,`registered_at`,`budget_min/max`,`tech_keywords(GIN)`)에 인덱스.
- 민감 데이터는 컬럼 자체를 두지 않음(스키마 차원 차단 — `client_id` 컬럼 미생성).
- 마이그레이션은 버저닝(아래 §3.3), DDL은 `idempotent` 성격(`IF NOT EXISTS`).

---

## 3. 폴더 / 네이밍 구조 (구현 기준 `app/`)

```
pipeline/market_dashboard/
├── app/                                  # ← 신규 구현 루트 (tech-design.md §4)
│   ├── README.md
│   ├── .editorconfig / .prettierrc / .eslintrc
│   ├── worker/                           # Cloudflare Workers (API)
│   │   ├── wrangler.toml                 # worker 배포·환경·vars
│   │   ├── package.json / tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  # 라우터 진입
│   │   │   ├── routes/                   # 엔드포인트별 핸들러(1파일 1라우트)
│   │   │   │   ├── summary.ts sources.ts analysis.ts insights.ts
│   │   │   │   ├── projects.ts projectsDetail.ts runs.ts crawlTrigger.ts
│   │   │   ├── db/                       # schema.ts + client.ts (Drizzle)
│   │   │   ├── agg/                      # Rust(WASM) 호출 래퍼
│   │   │   └── util/serialize.ts error.ts
│   │   ├── wasm/                         # Rust crate (aggregate)
│   │   │   ├── Cargo.toml
│   │   │   ├── src/lib.rs keyword.rs budget.rs growth.rs
│   │   │   └── pkg/                      # wasm-pack 산출(build 시)
│   │   └── test/                         # Worker 단위/계약 테스트
│   ├── web/                              # Cloudflare Pages SPA
│   │   ├── package.json / vite.config.ts / index.html
│   │   ├── src/
│   │   │   ├── main.tsx  App.tsx
│   │   │   ├── sections/                 # 6섹션 (Header, Sources, Analysis,
│   │   │   │   │                         #   Features, Market, Runs)
│   │   │   ├── components/               # Card, Badge, Tabs, Skeleton...
│   │   │   ├── charts/                   # SVG 차트 (donut/bar/line) + sr-table
│   │   │   ├── api/client.ts             # fetch 래퍼
│   │   │   ├── styles/                   # tokens.css, base.css (디자인 토큰)
│   │   │   └── util/format.ts theme.ts
│   │   └── public/
│   ├── crawler/                          # Python 크롤러 (venv A/B 격리)
│   │   ├── venv-a/requirements.txt       # curl_cffi (프리모아·Devpost)
│   │   ├── venv-b/requirements.txt       # lzstring+requests (위시켓·u300)
│   │   ├── crawl_wishket_oauth.py        # venv-B
│   │   ├── crawl_freemoa.py              # venv-A
│   │   ├── crawl_u300.py                 # venv-B (current/past1)
│   │   ├── crawl_devpost.py              # venv-A
│   │   └── README.md                     # 실행 venv 매핑표
│   ├── loader/                           # Python 정제·적재 배치
│   │   ├── pyproject.toml
│   │   ├── etl/
│   │   │   ├── schema_std.py             # 공통 스키마 dataclass
│   │   │   ├── normalize/ budget.py category.py date.py keyword.py
│   │   │   ├── dedupe.py                 # 멱등 upsert
│   │   │   └── piifilter.py              # client_id·이메일 제외
│   │   ├── run_collection.py             # MVP 수동 트리거 wrapper(5종 일괄)
│   │   ├── load_project.py               # crawled→Neon 적재
│   │   └── migrate/ 001_init.sql 002_analysis.sql ...
│   └── scripts/                          # 운영 스크립트(crawl 실행·마이그레이션)
└── crawled/                              # 원본 산출물(기존 유지, 코딩 규약 대상 아님)
```

### 3.1 명명 규칙 요약
- **파일**: `PascalCase`(컴포넌트) / `camelCase`(유틸·훅) / `snake_case`(Python·SQL). 시크릿류는 되도록 `*.env`가 아닌 **Secrets(§8)** 사용.
- **API 라우트**: `/api/<리소스>` 소문자 복수형. 엔드포인트명은 tech-design §7과 동일.
- **DB 컬럼**: `source`,`source_ref`,`registered_at`,`budget_min` 등 snake_case. `run` 접미사 규칙 없음.
- **소스 문자열 상수**(통일): `wishket | freemoa | u300 | devpost`. runtime 태그: `current | past1`(u300). group_type: `si_contract | startup | hackathon`.

### 3.2 환경 분리
- 크롤러는 **venv A(연구팀 research-tools venv) / venv B(kernel venv)** 와 1:1 매핑하되, 구현 시 `crawler/venv-a·venv-b`로 **관리형 복제** 생성(기존 venv 재사용 가능). 실행은 항상 명시된 venv의 인터프리터 호출(`venv-a/bin/python crawl_freemoa.py`).
- Worker DB는 **읽기 전용 집계 계정**, 적재 배치는 **쓰기 계정** 사용(trd §5.2). DSN은 Secrets(`DB_URL_RO`, `DB_URL_RW`).

---

## 4. 커밋 규칙

- **메시지 양식** (Conventional Commits):
  ```
  <type>(<scope>): <한국어 요약>

  <본문: 왜/무엇을>
  ```
  - `type`: `feat`/`fix`/`refactor`/`chore`/`docs`/`test`/`ci`/`build`/`perf`/`revert`
  - `scope`: `worker`/`web`/`crawler`/`loader`/`wasm`/`db`/`deploy`
  - 예: `feat(worker): /api/analysis 집계 엔드포인트 구현` / `fix(loader): 프리모아 budget 만원→원 정규화`
- **규칙**:
  1. **하나의 커밋 = 하나의 논리 변경**(atomic). 관련 없는 린트/포맷 변경을 섞지 않는다.
  2. 크롤러·로더 등 데이터 로직 변경과 UI 변경은 커밋 분리.
  3. `client_id`/개인정보 관련 수정 커밋은 `[PII]` 태그 본문에 포함해 추적.
  4. 커밋 전 로컬 린트·테스트 게이트 통과(아래 §5).
  5. 브랜치: `feat/<이슈|스코프>-<요약>`, `fix/...`. PR 설명에 적용 스킬 로그(요약) 포함.
- **금지**: 중간 상태·미완성 테스트·시크릿/키를 커밋(레포 등록 전 `.gitignore`에 `*.key`,`*.pem`,`cookies_*.json` 추가).

---

## 5. 테스트 규칙 (TDD 기반)

- **레드→그린→리팩터** 적용. 기능을 넣기 전 실패 테스트를 먼저 작성(tech-design §11 실행 순서의 테스트 단위로).
- **계층별 도구**:
  | 레벨 | 도구 | 대상 |
  |---|---|---|
  | 크롤러·정제·분석 | pytest (+ fixtures) | `crawler/`, `loader/etl/` |
  | Worker API | Vitest + `wrangler` 배포 테스트 / `fetch` 계약 테스트 | `worker/` |
  | Rust(WASM) | `cargo test` + `wasm-pack test` | `worker/wasm/` |
  | 대시보드 E2E | Playwright(webapp-testing) | `web/` |

- **게이트(개발QA 승인 전)**: `ruff check && ruff format --check`(python) · `eslint && tsc --noEmit`(ts) · `cargo clippy -- -D warnings && cargo test`(rust) · `vitest run`(worker) · build 성공 · `pytest`(loader) 통과.
- **P0 차단 테스트(반드시)**: TC-06(`client_id` 제외), TC-15(멱등 upsert), TC-29(저신뢰 수치 단정 금지), 대시보드 로드·수집·적재 정상(§test-design.md 릴리스 게이트).
- **테스트 데이터**: `crawled/` 실제 샘플 + `seed/` 최소 데이터셋(소스별 ≥3건)으로 정규화·집계·렌더 검증.
- **a11y**: 개발QA에서 `design-qa` 게이트(토큰 lint·axe a11y·WCAG 대비 자동 실측·시각 회귀)를 신규 컴포넌트/차트에 적용. 색은 design-qa-report §1.1 확정값 토큰만 사용.
- 테스트는 **격리·멱등**(DB는 테스트 전용 스키마/브랜치 또는 인메모리 mock) — CI 재실행 안전.

---

## 6. 에러·로그·응답 규약 (API)

- 모든 Worker 응답은 `{ ok: boolean, data?: ..., error?: { code, message } }` JSON 규격(tech-design §7.8). 상태코드는 200/201/400/404/500.
- 오류 `code` enum: `BAD_REQUEST / NOT_FOUND / UPSTREAM / DB_ERROR / INTERNAL`.
- 로그: Worker는 `console.log`(Cloudflare 로그). 크롤러·로더는 `logging`으로 **런 단위**(started/finished/건수) 기록.
- **민감정보**: 로그·에러 메시지에 이메일·쿠키·DSN 미포함.

---

## 7. 산출물 · .html 병행 규칙

- 모든 팀 산출물(.md)은 동일 내용의 **`.html`을 함께 생성**(md-to-html 변환기 사용, 마지막 단계).
- 본 시점 산출물: `coding-convention.md/.html`, `tech-design.md/.html`.
- **설계·구현 산출물 저장**: 문서는 `pipeline/market_dashboard/`, **코드 구현은 `app/`**(위 §3)로 분리.

---

## 8. 커밋/설계 시 가드레일 체크 (체크리스트)

- [ ] 외부 CDN·웹폰트·차트 CDN 미사용(전부 번들)
- [ ] 하드코딩 색/간격 없음(토큰만), WCAG AA 대비 ≥4.5:1(일반), ≥3:1(대형)
- [ ] `client_id`/이메일 어디에도 미노출·미저장(스키마 차단 + sanitize)
- [ ] 로그인/권한 UI 없음(NG5)
- [ ] 저신뢰 수치 신뢰 뱃지 + 단정 금지 표현(TC-29)
- [ ] 크롤러 crawl-delay(위시켓 5s) 준수, 무한 재시도 없음, 멱등 upsert
- [ ] DB 읽기/쓰기 계정 분리, DSN은 Secrets, 평문 키 커밋 없음

---
*끝 — 위 규약은 tech-design.md(아키텍처·데이터·API)와 함께 TDD 구현의 기준이 된다.*
