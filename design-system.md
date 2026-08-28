# 디자인 시스템 (design-system.md) — 시장조사·분석 대시보드 v2

- **작성팀**: 디자인팀 (design-team)
- **모드**: standard — 볼드 컬러 리디자인 (2026-08)
- **기준**: `storyboard.md`(화면·상태), `plan.md`(AC), `userflow.md`(전역 UX 규칙)
- **구현 기술**: **Tailwind CSS v4** (`@tailwindcss/vite` 플러그인) + 시맨틱 CSS 변수 토큰
- **단일 구현 기준**: `app/web/src/styles/globals.css`

---

## 0. 원칙

1. **데이터 우선**: 장식보다 수치 가독성·비교·신뢰 표기가 우선.
2. **볼드 아이덴티티**: 딥 네이비 사이드바 + 인디고→바이올렛→퓨샤 그라디언트 히어로로 강한 첫인상. 데이터 정체성 색(소스 4색)은 고정.
3. **신뢰**: 저신뢰 수치에 뱃지·주석, 단정 금지 표현은 디자인으로도 유지.
4. **접근성(WCAG AA)**: 키보드 전용 사용 가능, 명확한 포커스, 충분한 대비.
5. **토큰 기반**: light/dark를 CSS 변수로 정의하고 Tailwind `@theme inline`으로 유틸리티화 (`bg-surface`, `text-ink`, `border-line` 등).

---

## 1. 컬러 팔레트

### 1.1 Semantic 토큰 (Light / Dark)

| 역할 | 유틸리티 | Light | Dark |
|---|---|---|---|
| 캔버스 | `bg-canvas` | `#EEF0FA` (틴티드 라벤더) | `#0B0E1E` |
| 서피스(카드) | `bg-surface` | `#FFFFFF` | `#151A38` |
| 서피스-2 | `bg-surface2` | `#E4E7F7` | `#1E244A` |
| 경계 | `border-line` | `#D5DAEF` | `#262D5C` |
| 경계-강조 | `border-line-strong` | `#B6BEDE` | `#39427A` |
| 본문 텍스트 | `text-ink` | `#171A2E` | `#EEF1FF` |
| 이차 텍스트 | `text-ink-sub` | `#565D80` | `#A6ADD6` |
| 캡션/축 텍스트 | `text-ink-faint` | `#6B7294` | `#7C84B2` |
| 프라이머리 | `bg-primary` / `text-primary` | `#4F46E5` | `#818CF8` |
| 프라이머리-호버 | `hover:bg-primary-hover` | `#4338CA` | `#93A1FA` |
| 프라이머리-소프트 | `bg-primary-soft` | `#E3E2FD` | `#232A55` |

> 일반 텍스트 대비 ≥4.5:1, 대형 텍스트 ≥3:1 유지.

### 1.2 상태색 (Status)

| 의미 | Light | Dark | 사용처 |
|---|---|---|---|
| 성공 | `#0E9F6E` | `#2FBF8A` | 수집 성공 · "기능 추가" |
| 경고 | `#C27803` | `#EAB308` | 부분 실패 · "기능 축소" |
| 위험 | `#E02424` | `#F87171` | 실패 · 에러 · 높은 우선순위 |
| 정보 | `#1C64F2` | `#60A5FA` | 진행 중 · 안내 |

> 상태색은 아이콘/뱃지와 함께 사용(색 단독 판단 금지).

### 1.3 소스 식별색 (데이터 정체성 — 변경 금지)

| 소스 | 색 | 변수 |
|---|---|---|
| 위시켓 도급 | `#3456E0` | `--source-wishket` |
| 프리모아 도급 | `#F59E0B` | `--source-freemoa` |
| u300 공모 | `#10B981` | `--source-u300` |
| Devpost 해커톤 | `#F43F5E` | `--source-devpost` |
| 분석 아이디어 | `#8B5CF6` | `--source-idea` |

### 1.4 차트 categorical 팔레트 (볼드 8색, light/dark 각각 최적화)

- Light: `#4F46E5` `#0891B2` `#9333EA` `#059669` `#F97316` `#DB2777` `#CA8A04` `#64748B`
- Dark: `#818CF8` `#22D3EE` `#C084FC` `#34D399` `#FB923C` `#F472B6` `#FACC15` `#94A3B8`
- 순환 사용. 축·그리드 라벨은 `--text-3`, 그리드 선은 `--app-border`.

### 1.5 신뢰 뱃지 색

| 신뢰도 | 배경/글자 (Light) | 배경/글자 (Dark) | 표기 |
|---|---|---|---|
| 높음 | `#E3E2FD` / `#4338CA` | `#232A55` / `#A5B4FC` | ● 신뢰: 높음 |
| 중간 | `#FDF0D2` / `#925B02` | `#33290F` / `#FBBF24` | ◐ 신뢰: 중간 |
| 낮음 | `#FDE3E1` / `#C81E1E` | `#3D1A1A` / `#FCA5A5` | ○ 신뢰: 낮음 |

### 1.6 시그니처 그라디언트

- **사이드바**: `linear-gradient(180deg, #101332 → #191D45)` — 라이트/다크 무관 딥 네이비 고정.
- **히어로 배너**: `from-indigo-600 via-violet-600 to-fuchsia-600` + 흰 타이틀, blur 글로우 장식.
- **브랜드 마크**: `from-indigo-500 to-fuchsia-500` rounded-xl.
- KPI 카드 상단: 소스 포인트 컬러 → transparent 수평 그라디언트 스트립.

---

## 2. 타이포그래피

- **폰트**: Pretendard Variable (jsdelivr CDN dynamic-subset) + system-ui fallback. `--font-sans` 테마 토큰으로 전역 적용.
- **숫자**: 모든 지표 숫자는 `.tnum` (tabular-nums) 클래스로 자릿수 정렬.

### 2.1 폰트 계층

| 용도 | Tailwind 클래스 | 비고 |
|---|---|---|
| 히어로 타이틀 | `text-2xl md:text-3xl font-extrabold tracking-tight` | 흰색 on 그라디언트 |
| 섹션 타이틀 | `text-xl md:text-2xl font-extrabold tracking-tight text-ink` | |
| 카드 타이틀 | `text-lg font-bold tracking-tight` | 차트/카드 h3 |
| KPI 수치 | `text-3xl md:text-4xl font-extrabold tracking-tight .tnum` | |
| 인사이트 빅수치 | `text-3xl font-extrabold tracking-tight` | |
| 본문 | `text-sm` (14px) | |
| 캡션/주석 | `text-xs` (12px) `text-ink-faint` | |
| 킥커/라벨 | `text-xs font-extrabold uppercase tracking-[0.12em] text-primary` | 섹션 식별 |

---

## 3. 레이아웃 & IA

```
┌────────────┬──────────────────────────────────┐
│ SIDEBAR    │  Topbar (모바일만: 햄버거+브랜드)   │
│ 브랜드      │  HERO 그라디언트 배너              │
│ ─ 대시보드  │    (타이틀 + 수집실행 + 테마토글)   │
│ ─ 분석     │  KPI 카드 그리드 (6)               │
│ ── 섹션     │  섹션들: 안건 테이블 → 분석 차트     │
│    앵커 6개 │   → 기능 방향 → 시장성 → 수집이력   │
│ 소스 칩     │  FOOTER                           │
│ 출처 문구   │                                   │
└────────────┴──────────────────────────────────┘
```

- **데스크톱(≥1024)**: 사이드바 `fixed w-60` + 본문 `lg:pl-60`. 테마 토글은 우하단 플로팅 버튼.
- **모바일(<1024)**: 사이드바 숨김 → Topbar 햄버거 → 오버레이 드로어(`w-72 max-w-[85vw]`, dim+blur 배경, Escape 닫기, `role="dialog" aria-modal`). 테마 토글은 히어로 내 배치.
- **앵커 스크롤**: 섹션에 `scroll-mt-24`.
- **컨텐츠 폭**: `max-w-6xl mx-auto px-4 md:px-8`.
- **KPI 그리드**: 모바일 2열 → md 3열 → xl 6열.
- **차트 그리드**: md 2열, 키워드 랭킹은 `md:col-span-2`.
- **테이블**: 데스크톱 밀도 테이블(sticky 헤더), 모바일 가로 스크롤(`overflow-x-auto`).
- breakpoint: `≥1024` 데스크톱, `≥768` 태블릿, `<768` 모바일.

---

## 4. 컴포넌트 규칙

### 4.1 카드
- 기본: `rounded-2xl border border-line bg-surface shadow-card p-4~5`
- 호버 상호작용 카드(KPI/인사이트): `hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200`
- 그림자 토큰: `--shadow-card`(정적), `--shadow-card-hover`(호버) — globals.css @theme 정의.

### 4.2 버튼 (`components/ui.tsx`의 `btnClass()`)
- Primary: `bg-primary text-white hover:bg-primary-hover rounded-lg min-h-10 px-4 text-sm font-bold`
- Secondary: `border border-line bg-surface text-ink hover:bg-surface2`
- disabled: `opacity-45 cursor-not-allowed`
- 포커스: 전역 `:focus-visible { outline: 2px solid var(--primary); offset 2px }`.

### 4.3 필터 칩
- 활성: `bg-primary text-white` (사이드바 내에서는 반전: `bg-white text-[#101332]`)
- 비활성: `border border-line bg-surface text-ink-sub hover:border-line-strong`
- 소스 점(dot)을 라벨 앞에 표시.

### 4.4 차트 (외부 CDN 금지 — 번들 내장 SVG)
- 도넛/파이: 카테고리 점유율. 범례는 우측 그리드(`스와치 | 라벨 | 값`).
- 바/히스토그램: 예산·기간 분포(히스토그램은 18px 트랙), 키워드 랭킹(categorical 순환색).
- 라인/영역: 월간 추이 — 영역 `--primary` 16%→0 그라디언트, 비교 시리즈는 dashed `--text-3`.
- **공통 규칙**: 축·그리드 `--text-3`, `<svg>`는 `aria-label` + 스크린리더 전용 `<table class="sr-only">` 제공, null은 "제외+건수" 주석.

### 4.5 신뢰 뱃지
- `rounded-full px-2.5 py-0.5 text-xs font-bold`, 아이콘(●◐○)+텍스트 필수(색 단독 금지), `title`에 근거 명시.

### 4.6 상태 Pill
- 성공/부분/실패/진행 → `bg-{status}/12 text-{status}` 반투명 배경 + 상태색 텍스트, `rounded-full min-h-6 text-xs font-bold`.

### 4.7 테이블
- 헤더: `sticky top-0 bg-surface2 text-xs font-extrabold text-ink-sub`
- 행: `border-b border-line hover:bg-surface2 cursor-pointer`(클릭 행), 숫자 열 `.tnum text-right`.
- 페이지네이션: 하단 바, "총 N건" + 이전/다음 버튼.

### 4.8 모달 (안건 상세)
- 오버레이: `bg-[#0b0e1e]/50 backdrop-blur-sm`, 패널: `max-w-[600px] max-h-[85dvh] overflow-auto rounded-2xl`.
- `Esc`·배경 클릭·닫기 버튼으로 닫힘, 열림 시 닫기 버튼 포커스, `role="dialog" aria-modal="true"`.
- 필드 null → "정보 없음".

### 4.9 빈/에러/로딩 상태
- **빈 상태**: 제목+설명 중앙 정렬 (`Empty`).
- **에러**: `border-danger/30 bg-danger/8` 박스 + role="alert" + 재시도 버튼.
- **로딩**: Skeleton — `animate-pulse bg-linear-to-r from-surface2 via-line to-surface2` 카드별 배치(전역 로더 금지).

---

## 5. 접근성 (WCAG AA)

### 5.1 대비
- 일반 텍스트 ≥4.5:1, 대형 ≥3:1. 상태·신뢰는 색과 함께 텍스트/아이콘 복합 표기.

### 5.2 키보드
- 전체 흐름 Tab 탐색 가능. 모달/드로어: 열림 시 첫 요소 포커스 → `Esc` 닫힘.
- 테이블 행: `tabIndex=0` + Enter로 상세 열기.

### 5.3 포커스/기타
- `:focus-visible outline 2px var(--primary)` 전역 적용.
- 시맨틱 랜드마크(`<aside><header><nav><main><footer>`), skip-link("본문으로 건너뛰기") 최상단.
- 동적 로딩/에러 `role="status"` / `aria-live="polite"`.
- 장식 요소는 `aria-hidden="true"`. 터치 타겟 최소 40px.
- `prefers-reduced-motion` 시 애니메이션 최소화.

---

## 6. 다크모드 & 반응형

- 전환: `<html data-theme="dark|light">` + CSS 변수 오버라이드 (`util/theme.ts`: OS 선호 초기값 → localStorage 우선). Tailwind `dark:` 변형도 동일 속성 기반(`@custom-variant dark`).
- 사이드바는 테마 무관 딥 네이비 고정(브랜드 요소).
- 차트·뱃지·컴포넌트 모두 semantic 토큰 경유 — hard-coded 색은 시그니처 그라디언트와 소스 식별색뿐.

---

## 7. 금지/준수 목록 (개발팀 전달)

1. 외부 차트 CDN 사용 금지 → 번들 내장 SVG (Pretendard 폰트 CDN만 예외 허용).
2. 하드코딩 색 금지 → semantic 토큰/Tailwind 유틸 사용.
3. 신뢰 뱃지 없이 저신뢰 수치 단정 금지.
4. 개인정보를 어떤 UI에도 노출 금지(NFR-06).
5. 로그인/권한 UI 없음(NG5), 색상 단독 신호 금지.
6. 소스 식별 4색 변경 금지(데이터 정체성).

---
*끝 — storyboard.md의 화면·상태 설계를 볼드 컬러 시스템의 토큰·컴포넌트 규칙이 뒷받침한다.*
