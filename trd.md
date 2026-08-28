# 기술 요구사항 (trd.md) — 시장조사·분석 대시보드

- **작성팀**: 기획팀 (planning-team) · **모드**: standard
- **기준**: plan.md(FR/AC), requirements.md(NFR), `crawler_status_인계.md`(크롤러 실행환경 주의), research-report.md
- **사용 스킬 로그**: `design`(기술 아키텍처·컴포넌트·경계), `api`(대시보드 API 계약), `data-model`(Neon 공통 스키마·마이그레이션), `decide-adr`(기술 결정 기록 프레임), `docker`/`deploy`(배포 전략 참조)

---

## 1. 기술 스택 요약 (고정)

| 계층 | 기술 | 역할 | 비고 |
|---|---|---|---|
| 프론트/대시보드 | **Cloudflare Pages** (정적 SPA) | 단일 페이지 대시보드(차트·카드·표) | 로그인 없음, CDN 서빙 |
| 백엔드/API | **Cloudflare Workers** (JS/Python Worker + **Rust** WebAssembly 보조) | 대시보드 API·집계 엔드포인트·Cron 트리거 | 글로벌 빠른 응답(NFR-02) |
| DB | **Neon (PostgreSQL)** | 표준화 안건·수집이력·분석 집계 저장 | Serverless, 브랜치·프리징 |
| 수집 | **Python 크롤러 5종** | 안건 수집(위시켓·프리모아·u300·u300 1기·Devpost) | **실행환경 venv 분리 주의** |
| 분석 | **Python (분석 파이프라인)** + Rust 보조 | 정제·집계·시장성 인사이트 산출 | 주기적 재계산 |
| 스케줄 | Cloudflare Workers Cron Trigger + 외부 실행 지원 | 월 1회 배치(Phase2 자동화) | MVP는 on-demand+이력 |

> 핵심 원칙: **크롤러(무거운 의존성)는 Cloudflare 실행 경계 밖**에서 구동하고, 이후 클린 데이터를 Neon에 적재 → Workers가 집계·API·시각화를 담당한다. 크롤러는 `curl_cffi`(프리모아·Devpost)와 `lzstring`(위시켓·u300)이 **서로 다른 venv**에 있어 인터프리터를 맞춰야 한다(인계서 주의).

---

## 2. 시스템 아키텍처

```
┌─────────────── 외부 사이트 ──────────────────┐
│ 위시켓(도급)  프리모아(도급)  u300  Devpost  │
└──────▲────────────────────────────▲─────────┘
       │ robots 준수 / crawl-delay 5 │
┌──────┴─────── (실행환경 A/B 격리) ──┴─────┐
│  Python 크롤러 5종                         │
│   venv-A: curl_cffi(프리모아·Devpost)      │
│   venv-B: lzstring(위시켓·u300)            │
│  → 표준 스키마 정제·중복제거(upsert)        │
└──────────────┬─────────────────────────────┘
               │ 정제 CSV/JSON → (배치) 적재
┌──────────────▼─────────────────────────────┐
│              Neon (PostgreSQL)              │
│  projects · collection_runs · analysis      │
│  category/budget/keyword 집계               │
└──────────────▲─────────────────────────────┘
               │ SQL/집계 조회
┌──────────────┴─────────────────────────────┐
│  Cloudflare Workers (API · Cron) + Rust     │
│   /api/summary /api/sources /api/analysis   │
│   /api/insights /api/projects /api/runs     │
│   (Worker로 집계·캐시·토큰 관리)            │
└──────────────┬─────────────────────────────┘
               │ JSON API (REST)
┌──────────────▼─────────────────────────────┐
│  Cloudflare Pages (SPA 대시보드)             │
│  헤더카드 · 소스별 · 분석차트 · 기능방향     │
│  시장성인사이트 · 수집이력                   │
└─────────────────────────────────────────────┘
```

**데이터 흐름**: 크롤러(외부 venv) → 정제·멱등 적재 → Neon → Workers API → Pages 대시보드. 분석은 (a) 적재 시 Python 일괄 집계 또는 (b) Worker에서 Rust/JS 집계 두 경로를 허용, MVP는 (b) 우선(배포 단순·빠름)하되 키워드/텍스트 분석은 (a).

---

## 3. 컴포넌트 명세

### 3.1 수집 계층 (Python 크롤러 — 실행환경 격리)
- **파일·실행환경(인계서 기준)**:
  - `crawl_wishket_oauth.py` — **venv-B(lzstring)** — 로그인 쿠키 재사용, `pt=task_based`
  - `crawl_freemoa.py` — **venv-A(curl_cffi)** — 쿠키 재사용, `workType=1`
  - `crawl_u300.py` — **venv-B(lzstring)** — 공개 REST API(현재 357 + 1기 60, peNo)
  - `crawl_devpost.py` — **venv-A(curl_cffi)** — 공개 페이지 스크래핑
- **공통 계약(각 크롤러)**: 표준 스키마로 CSV/JSON 산출(`crawled/<source>_oauth|u300|devpost/`), `meta.json`(수집시각·건수), 멱등(같은 원본 ID 재수집 시 overwrite).
- **실행 트리거**: MVP = CLI 실행(수동) + `collection_runs` 기록. Phase2 = Cloudflare Cron Trigger가 Worker `/api/crawl/trigger`를 호출 → 외부 러너(GH Actions/로컬 크론)가 크롤러 실행 후 적재. (크롤러는 Worker가 직접 못 돌림 → 격리 유지.)
- **제약**: 위시켓 crawl-delay 5, 프리모아 `client_id` 저장 제외, `/m7` 파트너 프로필 비수집, robots 준수.

### 3.2 적재 · 정제 계층
- Python 정제 스크립트 또는 Worker 배치로 표준 스키마 upsert(원본URL·source 복합키).
- 예산 단위 정규화(만원→원, "원/월" 통일), 카테고리 표준 맵, 날짜 파싱, null 정책.

### 3.3 저장 계층 — Neon (PostgreSQL)
**주요 테이블**(자세한 DDL은 개발팀·data-model 참조):
- `collection_runs`: id, source, run_type(current/past1/…), status(success/partial/failed), total, success, failed, error, started_at, finished_at
- `projects`: id, source(wishket/freemoa/u300/devpost), source_ref(원본ID/URL), run_id(FK), title, category, category_sub, budget_min, budget_max, budget_unit, period_days, region, work_type, role, level(위시켓), tech_keywords(text[]), registered_at, deadline, applicants, raw_json(jsonb), created_at; UNIQUE(source, source_ref)
- `analysis_category`: source, category, cnt, share_pct, prev_cnt, growth(월간), period
- `analysis_budget`: source, bucket, cnt
- `analysis_keyword`: source, keyword, cnt, prev_cnt, growth_rate, period
- `analysis_insights`: type(category/keyword/feature/market), title, body, metric, period, confidence(low/mid/high)
- (u300/Devpost는 projects에 통합하되 고유 필드(트랙·팀·스택)는 raw_json·전용 컬럼)

### 3.4 API 계층 (Cloudflare Workers + Rust)
| 엔드포인트 | 메서드 | 응답 |
|---|---|---|
| `/api/summary` | GET | 총 건수, 소스별 건수, 최근 수집 시각, 상태 |
| `/api/sources` | GET | 소스별 안건 요약/추이 |
| `/api/analysis` | GET | 카테고리·예산·기간·상주·키워드 집계 |
| `/api/insights` | GET | 기능 개선 방향·시장성 인사이트 목록 |
| `/api/projects?source=&page=&q=` | GET | 소스별 안건 목록(페이징)·검색 |
| `/api/projects/:id` | GET | 개별 상세(경량) |
| `/api/runs` | GET | 수집 이력 · POST `/api/crawl/trigger`(Phase2 Cron) |
- 캐시: Cloudflare Cache API/강제 캐시 헤더, 집계 결과는 짧은 TTL(수집 후 무효화).
- Rust는 집계·정렬 등 CPU 작업(wasm) 보조; MVP는 JS Worker로 충분하되 Rust 경계를 설계에 명시(요구사항 스택).

### 3.5 프레젠테이션 (Cloudflare Pages SPA)
- 단일 페이지, 프레임워크(React/Svelte 등 개발팀 선택), 차트 라이브러리(자체 SVG/Chart.js—외부 CDN 금지 또는 번들), 반응형·다크모드, 빈 상태·에러 처리.
- 저신뢰 수치 주석 UI(시장성 인사이트에 신뢰 뱃지).

---

## 4. 비기능 요구사항 (NFR 반영)

### NFR-01 기술 스택 — Cloudflare + Neon + Rust + Python (고정)
- 위 §1·§2 배치로 준수.

### NFR-02 성능 — 최대한 빠르게
- 대시보드 로드는 **정적 페이지 + 캐시된 집계 API**. 집계는 미리 계산(precomputed) 테이블을 조회하여 원본 대량 스캔 회피.
- 목표: 페이지 TTFB < 1s(핫 캐시), API p95 < 500ms (데이터 규모: 건 단위, Neon 인덱스 최적화).
- 월 단위·소규모(수만 건 이하) → 대규모 인프라 불필요.

### NFR-03 배포 — 로그인 없는 웹 URL
- Cloudflare Pages 배포 URL 제공, 인증 미사용.

### NFR-04 유지보수 — 소스/분석 로직 변경 용이
- 크롤러 단위 분리(소스 1=모듈 1), 표준 카테고리 맵·키워드 사전을 설정/DB로 분리, 분석 규칙 템플릿화.

### NFR-05 견고성
- 크롤링 실패: 런별 상태 기록, 부분 실패 허용, 무한 재시도 금지, 멱등(중복 방지), 오류 로그.
- DB/API 실패: 배치 재시도, API 에러 JSON 규격.

### NFR-06 보안/법적/개인정보
- robots.txt 준수, crawl-delay 5(위시켓), 과도 요청 금지.
- **프리모아 `client_id`(이메일)·개별 파트너 프로필 비수집·비저장**, 개인정보 최소화.
- DB 접근은 Workers 쪽 최소 권한(읽기 전용 집계 계정, 쓰기는 배치 전용), Secrets로 DSN 관리.

---

## 5. 성능·보안·데이터 요구사항 상세

### 5.1 성능 수치
| 지표 | 목표 |
|---|---|
| 대시보드 최초 로드 | < 2s (네트워크 정상) |
| 집계 API (캐시 히트) | < 200ms |
| 집계 API (미스, 1만 건 기준) | < 500ms |
| 동시 사용자 | 팀 단위(1~수십) — 부하 낮음 |

### 5.2 보안
- Neon 접속: Workers용 읽기 계정 + 배치용 쓰기 계정 분리, Secrets 사용(코드에 평문 DSN 금지).
- `client_id` 등 민감 필드는 스키마에서 제외(저장 대상 아님).
- 퍼블릭 페이지이므로 대시보드에 기밀 노출 금지(원본URL만, 안건 본문 내 개인정보는 마스킹 고려).

### 5.3 데이터
- 저장: Neon(PostgreSQL). 스키마 마이그레이션 버저닝.
- 정규화: 예산 단위(원/월 통일), 카테고리 표준 맵, 날짜 표준, null 정책.
- 보존: 수집 안건은 원본 raw_json 유지(분석 재계산 대비), 중복은 멱등.
- u300(라운드 진행 중, 수상 미발표)·Devpost는 그룹별 태그로 관리.

---

## 6. 기술 결정 (ADR 요약)

| ADR | 결정 | 대안/근거 |
|---|---|---|
| ADR-1 크롤러 실행 격리 | 크롤러는 Python venv 분리 환경에서 실행, Worker가 직접 실행 금지 | Workers는 curl_cffi/lzstring 실행 불가 · 배포 안정성 |
| ADR-2 집계 precompute | 분석은 사전계산 테이블 + 캐시, 원본 실시간 스캔 회피 | 성능(NFR-02)·월 단위 갱신 특성 |
| ADR-3 API 배치 | Workers(JS/Rust)가 API·집계, Pages(SPA)가 UI | Cloudflare 2계층 표준, 빠름 |
| ADR-4 MVP 수집 트리거 | MVP on-demand CLI + 이력, Phase2 Cron 자동화 | 최대한 빠르게 우선, 자동화는 S |

> 개발팀은 tech-design.md에서 최종 확정. 본 ADR은 기획 단계 결정.

---

## 7. 환경·배포·운영

- **배포**: Cloudflare Pages(정적) + Workers(API). GitHub 연동 자동 배포 지향(개발팀).
- **DB**: Neon 프로젝트(+브랜치로 dev/staging). 마이그레이션 도구(개발팀 선택).
- **크롤러 실행**: 로컬/CI에서 venv A/B 확인 후 실행. MVP 수동 + 기록.
- **모니터링/로그**: Worker 로그(Cloudflare), `collection_runs`로 수집 상태 추적. 배치 실패 시 재실행 절차.

---

## 8. 오픈 이슈 → 개발팀
| ID | 이슈 | 귀결 |
|---|---|---|
| TQ-1 | 크롤러 실행 환경(venv A/B) 통합·스케줄러 최종 방안 | 개발팀 설계 · 배치·CI 결정 |
| TQ-2 | Rust 사용 범위(API 집계 보조 vs MVP JS로 충분) | 개발팀 확정(NFR-01 스택 준수하되 실용 우선) |
| TQ-3 | Devpost 전수 수집 범위·해커톤 분석 깊이 | Phase2 / 샘플로 MVP |
| TQ-4 | 카테고리 표준 맵·키워드 사전 소스 | 개발팀 + 데이터 확정 |
| TQ-5 | 대시보드 차트 라이브러리·번들(외부 CDN 금지) | 개발팀 디자인 연계 |

*끝 — 개발팀이 tech-design.md로 구체화한다.*
