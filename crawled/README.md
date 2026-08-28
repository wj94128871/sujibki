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
