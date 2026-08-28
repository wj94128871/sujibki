# crawled/ 원천 데이터 (리서치팀 수집)

**크롤링 시각**: 2026-08-20 (세션 환경 기준)
**방식**: 외부 API 키 없이 무료 공개 엔드포인트/robots 허용 범위 내 실크롤 + 검증용 샘플

## wishket (위시켓, www.wishket.com)
- robots.txt — Allow /project/, crawl-delay 5, 사이트맵 제공 (원본 저장)
- list: `project_list.html` (모집중 목록 HTML, 10건/페이지)
- sample: `project_sample_wishket_202608.csv/.json` — 제목/예산/기간/시작일/카테고리/레벨/등록일/마감/지원자 등
- 참고: 목록은 비로그인 가시. 상세의 예산·모집요건·근무환경은 로그인 게이트.

## freemoa (프리모아, www.freemoa.net) — TLS impersonation 필요
- robots.txt (원본 저장) — Allow /m4/s41(프로젝트 목록), /m4a/s41a(목록 API)
- list: `project_list.html` + `s41.js`(목록 로직)
- API: `s41a_page1.json` — POST /m4a/s41a → totalRows 22,911, 상세(txt) 포함
- sample: `project_sample_freemoa_202608.csv/.json` — 제목/분야(fld)/세부분야/예산(min/max,만원)/기간(during)/마감일/등록일/지역/상세 등

## 참고: PII 주의 (NFR-06)
- freemoa 목록 API에 client_id(이메일) 포함됨 → 대시보드/DB 저장 시 제외(개인정보 수집 최소화)


## 해커톤/챌린지 채널 (2026-08-28 추가)

도메인 무관으로 글로벌 해커톤/챌린지 아이디어를 수집합니다.

| 폴더 | 출처 | 채널 종류 | 비고 |
|---|---|---|---|
| `devpost/` | devpost.com/software | 해커톤 출품작 | curl_cffi(impersonate=chrome), 페이지네이션 |
| `drivendata/` | drivendata.org/competitions | 사회문제 ML | 정적 HTML, 1p=69 슬러그, 카테고리 풍부 |
| `zindi/` | api.zindi.africa/v1/competitions | 아프리카·신흥국 ML | **공식 API**, 502개 메타 |
| `codeforces/` | codeforces.com/api/contest.list | 알고리즘 라운드 | **공식 API**, 2143+ |
| `hackerone_pw/` | hackerone.com/opportunities | 버그바운티 = 시장 결함 | Playwright 헤드리스 |
| `hackerearth/`, `herox/`, `topcoder/`, `openideo/` | 각 사이트 | SPA raw fallback | 후속 selector 보강 필요 |

### 일괄 수집

```bash
app/crawler/venv-a/bin/python scripts/refresh_hackathon_channels.py \
  --pages 3 --max-detail 50 --delay 1.0
```

### 표준 출력 스키마 (각 `competitions.json`)

| 필드 | 출처별 차이 | 비고 |
|---|---|---|
| `id` / `slug` / `handle` | 사이트별 | Zindi=id, DrivenData=slug, HackerOne=handle |
| `title` / `name` | 공통 | 영문 위주 (정제 단계에서 번역/요약 옵션) |
| `brief` / `text_excerpt` | 공통 | 짧은 요약 |
| `prize` / `reward` / `bounty_usd` | Zindi, DrivenData, HackerOne | null 가능 |
| `start_time` / `end_time` / `deadline` | Zindi, Codeforces | ISO8601 |
| `phase` / `open` | Codeforces, Zindi | |
| `tags` / `organization` | DrivenData, Zindi | 카테고리 신호 |
| `url` | 공통 | 사람 확인용 원본 URL |
