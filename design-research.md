# 시장조사·분석 대시보드 — 디자인 리서치 보고서

> **프로젝트**: 위시켓·프리모아(도급)·u300(스타트업)·Devpost(해커톤) 시장 데이터를 하나의 페이지로 보여주는 시장조사·분석 대시보드 재설계
> **방법**: 웹 조사 전용(DDG HTML 검색 + 1차 소스 직접 접근). 로컬 파일·스킬·서브에이전트 정의 파일은 일절 참조하지 않음.
> **작성일**: 2026-08-13 · 언어: 한국어 · 출처 URL 포함

---

## ① BLUF — 추천 디자인 방향 (한눈에 보기)

**"미니멀한 인디고 앵커 + 넉넉한 화이트 스페이스 + 하나의 핵심 지표 차트 + 데이터 밀도 높은 테이블"** 의 현대 애널리틱스 대시보드로 재설계하라.

현재 평가("템플릿 냄새, 엉망")의 원인은 흔한 부트스트랩/에드민 템플릿 조합(과도한 그라디언트 카드, 동일한 카드 4~6개 나열, 무의미한 아이콘 남발, 일관성 없는 컬러)에 있다. 이를 Linear·Stripe·Plausible 계열의 **"컨텐츠 우선, 조용한 표면, 단일 브랜드 액센트"** 철학으로 교체한다.

핵심 방향 5가지
1. **단일 브랜드 액센트**(인디고/바이올렛) + 중성 그레이 표면 — 컬러를 의미(상승/하락, 소스 구분)에만 사용.
2. **수치 카드(KPI)는 4~6개로 제한**하고, 각 카드에 MoM/YoY 증감 · 전 기간 대비 비교 · 미니 스파크라인 추가(맥락 제공).
3. **핵심 트렌드는 하나의 큰 라인/에어리어 차트**로 — 기간 비교(전주·전년)와 주석(annotation) 지원(Plausible 방식).
4. **인사이트 카드**로 "숫자만이 아니라 이야기"를 전달 — 헤드라인 + 맥락 설명 + 근거 차트 (시장조사 대시보드 관례).
5. **데이터 테이블은 밀도 높고 필터링 가능**하게 (Sticky 헤더, 정렬, 소스별 필터) — Stripe·GitHub 전통.

---

## ② 참고 대시보드 디자인 DNA 요약 (9개 + 트렌드)

### 1. Linear — 대시보드 설계 원칙 (공식)
- **출처**: https://linear.app/now/dashboards-best-practices
- **핵심 DNA**: "적을수록 좋다"(대시보드 2개 이하 권장), 대시보드마다 목적 명확화(전략 vs 운영), 시청자별 밀도 조절, **"맥락 제공 — 숫자만이 아니라"** (핵심 지표마다 이번 주/지난 주/고점·저점을 보여주는 단순 차트 병행).
- **적용**: 집계 카드마다 전 기간 대비 스파크라인·고/저 맥락 표기를 도입.

### 2. Linear — 컬러 팔레트 (전거: colorpalettegenerator)
- **출처**: https://www.colorpalettegenerator.ai/brands/linear
- **핵심 DNA**: 다크 UI 위에 desaturated 인디고(#5E6AD2) 앵커. 배경 #0F0F1A, 표면 #1B1B2E, 보더 #2E2E4A, 텍스트 #F1F1F4/#9B9BAD/#6B6B80. 의미색: 성공 #4ADE80, 경고 #FBBF24, 오류 #F87171. 명암비 6~7:1 유지.
- **적용**: 인디고 앵커 + 중성 표면 계층 구조(배경/표면/보더) 그대로 차용.

### 3. Vercel Geist — 타이포 & 그리드
- **출처**: https://vercel.com/geist/introduction
- **핵심 DNA**: 개발자 대상 전용 폰트 **Geist Sans / Geist Mono**, 고대비 접근성 컬러, **그리드가 Vercel 미학의 핵심** 구성요소, 거의 순수 흑백(블랙/화이트) UI + 1~2개 컬러 액센트.
- **적용**: 수치·차트는 **tabular/mono 숫자** 사용, 레이아웃은 일관된 그리드(칼럼) 기반 정돈.

### 4. Stripe — 대시보드·금융 표면 (전거: designsystems.one Breakdown)
- **출처**: https://www.designsystems.one/design-systems/stripe-design
- **핵심 DNA**: 브랜드 blurple **#635BFF**, 다크 네이비 #0A2540, 본문 slate #425466, 페이지 표면 #F6F9FC, 헤어라인 보더 #E6EBF1, 성공 #24B47E, 오류 #CD3D64. 타이포 Söhne(프로덕트)/serif(콘텐츠). **재무 정합성급 데이터 테이블 — sticky 칼럼, 비동기 필터, 내보내기**, 견고한 빈/에러 상태 카탈로그(금융 흐름은 실패를 전제). 4px 베이스 스페이싱, 반경 4/8/16px.
- **적용**: 시장 데이터(건수·금액·증감) 테이블을 **정합성 높은 재무풍 테이블**로, 넉넉한 여백과 헤어라인 경계, 치밀한 빈/에러 상태.

### 5. Notion — 템플릿 냄새 탈피 #1
- **출처**: https://www.browserlondon.com/blog/2025/05/05/best-dashboard-designs-and-trends-in-2025/
- **핵심 DNA**: 빈 상태(empty state)를 **행동 유도**로 활용(혼란 아닌 초대), 워크스페이스 유형에 맞춘 템플릿 제안, 대시보드 내장 온보딩. 콘텐츠 중심의 유연한 블록 레이아웃, 흑백 위주의 조용한 UI.
- **적용**: 데이터가 없을 때 "안내 + 액션 버튼" 형태의 빈 상태 설계.

### 6. Plausible — 단일 지표 차트 & 비교 (공식)
- **출처**: https://plausible.io/docs/guided-tour
- **핵심 DNA**: **하나의 대시보드, 단일 통합 차트**에 핵심 지표(유니크 방문자·방문·페이지뷰·이탈률·체류)를 **클릭으로 전환 표시**. 기간 선택(date picker), **"전 기간·전년 대비" 비교 기능**, 차트 위 **주석(annotation) 마커**로 맥락 제공. 브랜드 바이올렛 **#4B38D8** (전거: colorfyi).
- **적용**: 가장 중요한 시장 지표 1개를 메인 대형 차트로, 비교·주석 기능 필수.

### 7. GitHub Primer — 데이터 밀도 & 토큰
- **출처**: https://primer.github.io/design/foundations/ (디자인 시스템)
- **핵심 DNA**: 중성 그레이 + 블루 링크, 밀도 높은 데이터 표현, color/typography/spacing **디자인 토큰(primitive)** 체계. 시스템 폰트 스택 기반.
- **적용**: 토큰 기반 설계(색/타이포/간격을 변수로), 밀도 높은 리스트·테이블 레이아웃 균형.

### 8. Datadog DRUIDS — 엔터프라이즈 관측 대시보드
- **출처**: https://www.datadoghq.com/blog/engineering/druids-the-design-system-that-powers-datadog/
- **핵심 DNA**: 수십 개 제품에 일관된 UX 패턴(필터, 시간 범위, 그래프 검사). **데드엔드 최소화 — 항상 옆에 추가 문맥**. 엔터프라이즈 데이터 밀집 그래프.
- **적용**: 소스(위시켓/프리모아/u300/Devpost)마다 **동일한 필터·기간·드릴다운 패턴** 적용해 일관성 확보.

### 9. Metabase — BI 테마(브랜딩/팔레트)
- **출처**: https://www.metabase.com/docs/latest/configuring-metabase/appearance
- **핵심 DNA**: 관리자가 **UI 컬러(첫 색 = 버튼/링크/기본), 차트 액센트 팔레트, 인스턴스 폰트, 로딩 문구**까지 화이트라벨 가능. 다크모드는 사용자 단위 설정.
- **적용**: 대시보드에 **쉽게 바꿀 수 있는 테마/팔레트 토큰** 구조(라이트/다크) 설계.

### 10. Supabase — 현대 SaaS/오픈소스 디자인 시스템
- **출처**: https://supabase.com/design-system
- **핵심 DNA**: Radix·shadcn/ui·Geist에서 영감. 그린 브랜드 액센트 + 다크 레이아웃, **Metric Card / Filter Bar / Charts / Tables** 패턴 내장, Tailwind 클래스 기반.
- **적용**: "Metric Card" 구성 패턴, shadcn/Radix 스타일의 토큰 구조, 칩·필터바 UI.

### 11. 시장조사 대시보드 구조 (Displayr 가이드)
- **출처**: https://www.displayr.com/guide-to-market-research-dashboards/
- **핵심 DNA**: **자연스러운 시선 흐름**(좌→우, 상→하, 중요 인사이트는 좌상/중앙), **관련 지표끼리 논리적 그룹핑**(예: 만족도 지표 묶음), **크기·위치로 중요도 신호**(핵심 메트릭은 크고 중앙에), **숫자 + 설명/비교/벤치마크로 맥락**, 정보 과부하 방지(과도한 데이터 방지), 맞춤·필터 제공.
- **적용**: 대시보드 상단에 가장 중요한 시장 지표 배치, KPI를 논리 그룹으로 묶음, 인사이트 카드에 벤치마크(전 기간 평균 등) 제공.

### 12. 2025 대시보드 트렌드 (Browser London 요약)
- **출처**: https://www.browserlondon.com/blog/2025/05/05/best-dashboard-designs-and-trends-in-2025/
- **트렌드**: ① AI 인사이트 하이라이트 ② 역할·취향 기반 개인화 ③ **스토리 주도 설계**(숫자 나열이 아닌 결론 유도) ④ 모바일 우선 ⑤ 필터·드릴다운·다이나믹 시각화로 **대화형 탐색**. 정보는 **상단 우선 배치, 빠른 답을 주는 시각화, 핵심 정보 우선**.

---

## ③ 이 대시보드에 추천하는 디자인(컬러·타이포·레이아웃·차트 UI)

### 컬러 팔레트 (토큰)
> 인디고 앵커 + 중성 표면 + 의미색. 컬러는 "의미"(증감·소스)에만 쓰고 장식엔 쓰지 않는다.

| 구분 | 토큰 | HEX | 용도 |
|---|---|---|---|
| 브랜드/앵커 | `--primary` | `#5E6AD2`(Linear 계열) | 버튼·링크·활성·선택, 메인 라인차트 시리즈 |
| 앵커 강조호버 | `--primary-strong` | `#4B38D8`~`#3B2FBF` | 호버·포커스 |
| 배경(페이지) | `--surface-0` | `#F7F8FA`(라이트) / `#0F0F1A`(다크) | 페이지 배경 |
| 카드/표면 | `--surface-1` | `#FFFFFF` / `#1B1B2E` | 카드·테이블 |
| 헤어라인 보더 | `--border` | `#E6EBF1` / `#2E2E4A` | 카드·테이블 경계 |
| 텍스트 최상 | `--text-strong` | `#1A1A1A`(라이트) / `#F1F1F4`(다크) | 제목·주요 수치 |
| 텍스트 보조 | `--text-muted` | `#6B6B80` | 부제·범례·보조설명 |
| 성공/상승 | `--positive` | `#24B47E` | MoM/YoY 상승 |
| 하락 | `--negative` | `#CD3D64` | MoM/YoY 하락 |
| 조정/보통 | `--neutral` | `#9B9BAD` | 변동 없음 |
| 경고 | `--warning` | `#FBBF24` | 주의 지표 |

**소스(플랫폼) 구분 컬러** — 4개 데이터 소스가 핵심이므로, 차트에서 소스를 식별할 때만 사용:
- 위시켓 `#5E6AD2`(인디고) · 프리모아 `#F59E0B`(앰버) · u300 `#10B981`(에메랄드) · Devpost `#F43F5E`(로즈). 보조 그래프 한정.

### 타이포 (한글 포함 제품)
- **UI/본문**: **Pretendard**(한국어 산스, 시스템 대비 균일 크로스플랫폼) 또는 Inter. weight 400/500/600/700.
- **숫자·차트·테이블**: **tabular numbers 필수** — mono(가령 JetBrains Mono) 또는 서체의 `font-variant-numeric: tabular-nums` 로 자릿수 폭을 고정(Stripe·Linear 스타일).
- **스케일**(1.25 비율): KPI 대표 수치 32px/700, 페이지 타이틀 24px/600, 섹션 헤더 16px/600, 본문 14px/400, 캡션·범례 12px/400, 데이터 레이블 13px.

### 레이아웃
1. **상단 고정 헤더**: 페이지 타이틀 + 기간 선택(date picker) + 비교 토글(전 기간/전년) + 소스 필터 칩(전체/위시켓/프리모아/u300/Devpost) + 다크/라이트 토글.
2. **KPI 카드 행(4~6개, 논리 그룹)**: 총 프로젝트/건수, 총 금액(계약 규모), 신규 등록, 평균 단가, 성장률 등. 각 카드 = 라벨 + 대표 수치 + **MoM/YoY 증감 배지(색상)** + **미니 스파크라인** + "이번 주/지난 주/고·저" 맥락 라인(Linear 원칙). 카드는 동일 카드 템플릿(중복 나열이 아니라 서로 다른 지표).
3. **메인 트렌드 차트(hero, 페이지 폭 크게)**: 가장 핵심 지표 1개의 라인/에어리어 차트. 기간 비교 시리즈(전 기간) + **주석 마커**(캠페인·출시·이벤트) + 범례. 클릭으로 지표 전환(Plausible 방식), 툴팁에 수치·증감.
4. **인사이트 카드 섹션(스토리 주도)**: "무엇이 눈에 띄나" 헤드라인 3~5개 + 한 줄 맥락 + 소형 근거 차트. AI 인사이트 강조(트렌드).
5. **분류 브레이크다운 패널**: 소스별(위시켓/프리모아/u300/Devpost) 분포 차트 — 소스 컬러 사용, 가로 바 차트로 비교.
6. **데이터 테이블(밀도 높은, 하단 전체 폭)**: sticky 헤더, 정렬, 소스 필터, 페이지네이션, 내보내기. 재무 정합성급(Stripe 패턴).

### 차트 UI 권장
- **라인/에어리어**: 시간 추이. 단색(앵커) + 비교 시리즈는 약한 그레이 점선. 에어리어는 10~15% 투명도 그라디언트.
- **바 차트**: 카테고리/소스 비교. 소스 컬러 4색, 라운드 모서리(4px), 기준선 명확.
- **파이/도넛**: 점유율 표현에만 한정(위치·크기에서 2차적).
- **스파크라인**: KPI 카드 내 미니 트렌드(성능 가볍게).
- **게이지/프로그레스**: 목표 달성도 표시 시.
- 모든 차트: 라벨·범례·툴팁 제공, 축 눈금 최소화(noise 제거), 색약 안전 팔레트(인디고/앰버/에메랄드/로즈는 구분 가능).

---

## ④ 재설계 적용 토큰 방향

- **컬러·타이포·간격·반경·그림자·모션을 CSS 변수(토큰)로 단일화** — 결제처럼 templates smell 제거.
  - 예: `--color-surface-1 / --color-text-strong / --font-sans / --radius-md(8px) / --space-4(16px) / --ease(150ms cubic-bezier(...))` (Stripe 4px 베이스).
- **라이트/다크 테마 토큰 구조** — 사용자 단위 다크모드(Metabase 관례).
- **숫자 전역 규칙**: `tabular-nums + thousand separator`, 증감 항상 부호·색상·전 기간 기준 표기.
- **테마 교체 용이성**: 소스 구분 컬러와 반응형 팔레트를 별도 토큰으로 분리해 브랜드 색만 바꿔도 전체 적용(Supabase/Metabase 방식).
- **접근성**: 본문-배경 명암비 4.5:1+ (권장 7:1), 의미색을 색 뿐만 아니라 기호(↑↓·배지)로도 전달, 포커스 링 명확, 키보드 탐색.

---

## 부록 — 출처 URL 모음
1. Linear 대시보드 설계 원칙: https://linear.app/now/dashboards-best-practices
2. Linear 컬러 팔레트: https://www.colorpalettegenerator.ai/brands/linear
3. Vercel Geist 디자인 시스템: https://vercel.com/geist/introduction
4. Stripe 디자인 시스템 Breakdown: https://www.designsystems.one/design-systems/stripe-design
5. Browser London 2025 대시보드 트렌드(Notion 포함): https://www.browserlondon.com/blog/2025/05/05/best-dashboard-designs-and-trends-in-2025/
6. Plausible 대시보드 공식 가이드: https://plausible.io/docs/guided-tour
7. Plausible 브랜드 컬러: https://colorfyi.com/brands/plausible-analytics/
8. GitHub Primer 디자인 시스템: https://primer.github.io/design/foundations/
9. Datadog DRUIDS 설계 시스템: https://www.datadoghq.com/blog/engineering/druids-the-design-system-that-powers-datadog/
10. Metabase 화이트라벨/외관: https://www.metabase.com/docs/latest/configuring-metabase/appearance
11. Supabase 디자인 시스템: https://supabase.com/design-system
12. 시장조사 대시보드 구조 가이드(Displayr): https://www.displayr.com/guide-to-market-research-dashboards/
