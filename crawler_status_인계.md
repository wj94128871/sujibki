# 크롤러 상태 인계서 (기획팀 참고용)

> 용도: 기획팀이 개발 범위·기술 설계를 잡을 때, 어떤 데이터를 어떤 크롤러로 수집·정제·적재하는지 파악하기 위한 인계 자료
> 작성: 오케스트레이터, 2026-08-20
> 갱신: 2026-08-28 v4 (10채널 통합 + ETL + DB 적재)
> 저장: pipeline/market_dashboard/scripts/ + crawled/ + etl/

## 수집 대상 & 크롤러 완성 상태

### 한국 도급
| 사이트 | 크롤러 | 수집 방식 | 상태 | 로그인 필요 |
|---|---|---|---|---|
| 위시켓 (도급) | `crawl_wishket_oauth.py` | 로그인 쿠키 재사용, `pt=task_based` 필터 | ✅ 코드 완성 | ✅ 쿠키 보유 |
| 프리모아 (도급) | `crawl_freemoa.py` | 로그인 쿠키 재사용, `workType=1` 필터 | ✅ 코드 완성 | ✅ 쿠키 보유 |

### 창업/경진
| 사이트 | 크롤러 | 수집 방식 | 상태 |
|---|---|---|---|
| u300 모두의창업 (현재 2기) | `crawl_u300.py` | 공개 REST API | ✅ **357건 적재 완료** |
| u300 1기(과거전시) | `crawl_u300.py` (peNo) | 공개 REST API | ✅ **60건 적재 완료** |

### 해커톤/챌린지 (도메인 무관) — 10채널, 4635건 통합
| 사이트 | 크롤러 | 방식 | 메타 / 수집량 | 상태 |
|---|---|---|---|---|
| **Devpost** (해커톤 출품작) | `crawl_devpost.py` + `adapt_devpost.py` 어댑터 | curl_cffi + 2400건 어댑트 | 2400 | ✅ **수집 + 적재** |
| **DrivenData** (사회문제 ML) | `crawl_drivendata.py` | 정적 HTML | 30 | ✅ **수집** |
| **Zindi** (아프리카 ML) | `crawl_zindi.py` | **공식 API** | 30 (of 502) | ✅ **수집** |
| **Codeforces** (알고리즘) | `crawl_codeforces.py` | **공식 API** | 2143 | ✅ **수집** |
| **HackerOne** (버그바운티) | `crawl_hackerone_pw.py` | **Playwright** | 5+ | ✅ **수집** |
| **HackerEarth (PW)** | `crawl_hackerearth_pw.py` | **Playwright** | 1 (selector 보강 필요) | ⚠️ |
| **HeroX (PW)** | `crawl_herox_pw.py` | **Playwright** (`a.card-challenge`) | 9 | ✅ **수집** |
| **K-해커톤** (한국 9사 블로그) | `crawl_k_hackathon.py` | **RSS 모음 + hackathon 키워드** | 5 | ✅ **수집** |
| HackerEarth / HeroX / Topcoder / OpenIDEO (raw) | 정적 fallback | — | — | ⚠️ raw fallback |

## ETL 파이프라인 (v2)

```
crawled/<source>/competitions.json
   ↓ etl/normalize.py  (10 normalizer)
etl/schema.NormalizedItem (표준 스키마)
   ↓ etl/etl_hackathons.py  (중복 제거 + 통계)
crawled/_runs/hackathons_normalized.json
   ↓ scripts/analyze_hackathons.py  (카테고리 분류 v2)
crawled/_runs/hackathons_analysis.json
   ↓ scripts/load_hackathons.py  (StandardProject 변환)
app/loader/data/market_dashboard.db (sqlite) / Neon(prod) — 4635건
```

### 표준 스키마
- source / source_id / title / url / brief / category / tags / org
- prize(원문) / prize_usd(환산 36개 통화) / start_at / end_at
- phase(open/upcoming/finished/unknown) / is_open
- language / collected_at / extra

### 채널별 normalizer (10종)
- drivendata / zindi / codeforces / hackerone / hackerearth
- herox / topcoder / openideo / devpost / **k_hackathon** (신규)

### 카테고리 룰 v2 (보강)
- 17개 카테고리 (AI/ML, NLP, CV, Healthcare, Climate, Education, Finance, Public/Social,
  Security, IoT/Hardware, Web/Frontend, Backend/API, Mobile, DevOps, Competitive Programming,
  Agriculture, Smart City)
- 채널 baseline + 짧은 키워드 word boundary 매칭
- 16개 카테고리 + 소스별 매트릭스 출력

### 단위 테스트
- `etl/__tests__/test_normalize.py` (unittest) — **21 테스트 모두 통과**
- 통화환산 / ISO / phase / 7개 normalizer / registry 검증

## DB 적재 (v3 신규)

- `scripts/load_hackathons.py` — ETL 결과 → `StandardProject(HACKATHON)` → Sqlite/Postgres 어댑터
- PII 자동 필터(4건 제거)
- 멱등 upsert (ON CONFLICT (source, runtime, source_ref) DO UPDATE)
- 런 기록(collection_runs) 자동
- **현재 hackathon 테이블 4635건 적재**

## 일괄 실행 (v3)

```bash
# 1) 채널 일괄 수집 + ETL
app/crawler/venv-a/bin/python scripts/refresh_hackathon_channels.py \
  --pages 3 --max-detail 50 --delay 1.0 --etl

# 2) Devpost 어댑트 (refresh가 호출 안 함 — 별도)
app/crawler/venv-a/bin/python scripts/adapt_devpost.py

# 3) 분석
app/crawler/venv-a/bin/python scripts/analyze_hackathons.py

# 4) DB 적재 (sqlite 기본 / PG_DSN=postgres://... Neon)
app/crawler/venv-a/bin/python scripts/load_hackathons.py

# 5) 단위 테스트
cd etl/__tests__ && python -m unittest test_normalize -v
```

## 실행 환경

- venv-a 단일로 통합 운영 가능 (curl_cffi, lzstring, requests, playwright + chromium)
- GitHub Actions에서 venv 자동 설치 (workflow)

## 자동화 (매일 03:00 KST)

`.github/workflows/refresh-hackathon-channels.yml`:
1. `adapt_devpost.py` — Devpost 2400건 어댑트
2. `refresh_hackathon_channels.py --etl` — 10채널 수집 + ETL
3. `load_hackathons.py` — DB 적재 (PG_DSN secret 사용)
4. `analyze_hackathons.py` — 분석
5. 단위 테스트 (`unittest test_normalize -v`)
6. 30일 아티팩트 보존

## 후속 작업 (남은 것)
- [ ] HackerEarth PW 카드 selector 추가 보강 (현재 1건)
- [ ] Topcoder PW 카드 selector (SPA 한계)
- [ ] OpenIDEO PW (디자인 리뉴얼로 카드 미노출)
- [ ] Devpost prize_usd 변환 보강 (현재 0 — hackathon 프로젝트는 prize 없음)
- [ ] 키워드 랭킹을 Rust WASM으로
- [ ] 카테고리 룰 정확도 추가 개선 (현재 룰 기반, ML 분류는 후속)

## 인계 노트
- 본 인계서는 **오케스트레이터 자동화**로 작성됨
- 모든 스크립트는 PEP 8 + ruff 호환, 한국어 docstring, `argparse` + `logging` 표준
- 표준 라이브러리 위주 (pytest/playwright만 외부)
- 새 채널 추가 시: `crawl_<source>.py` + normalize 함수 + FOLDER_TO_SOURCE 매핑 + refresh CHANNELS
