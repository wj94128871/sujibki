/** 모바일 상단 바 — 햄버거 + 브랜드 축약 */
export function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onMenu} aria-label="메뉴 열기"
          className="grid size-10 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-surface2">
          <span aria-hidden="true" className="text-lg leading-none">☰</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm font-bold tracking-tight text-ink">시장조사 · 분석</p>
          <p className="m-0 truncate text-[11px] text-ink-faint">IT 프로젝트 수요 레이더</p>
        </div>
        <span aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-indigo-500 to-fuchsia-500 text-xs font-black text-white">
          시
        </span>
      </div>
    </header>
  );
}

/** 페이지 타이틀 히어로 — 볼드 그라디언트 배너 */
export function HeroBanner({ page, theme, onToggleTheme, onCollect, actions }: {
  page: "dashboard" | "analysis";
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onCollect: () => void;
  actions?: React.ReactNode;
}) {
  const title = page === "dashboard" ? "지금 시장 흐름을 한눈에" : "데이터로 도출한 전략 아이템";
  const subtitle = page === "dashboard"
    ? "위시켓·프리모아·u300·Devpost 안건 데이터 기반 수요 레이더"
    : "수집 데이터 기반 기능 추가/축소/방향 전환 제안";
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 shadow-lg shadow-indigo-500/20 md:p-8">
      <div aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-white/15 blur-3xl" />
      <div aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-fuchsia-300/25 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-bold tracking-[0.14em] text-white/75 uppercase">
            {page === "dashboard" ? "Market Dashboard" : "Strategy Analysis"}
          </p>
          <h1 className="mt-2 mb-0 text-2xl font-extrabold tracking-tight text-white md:text-3xl">{title}</h1>
          <p className="mt-2 mb-0 max-w-xl text-sm text-white/80">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={onCollect}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-indigo-700 shadow-md transition-all duration-150 hover:-translate-y-px hover:bg-indigo-50 active:translate-y-0"
          >
            <span aria-hidden="true">⟳</span> 수집 실행
          </button>
          <button
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            className="grid size-10 place-items-center rounded-xl border border-white/25 bg-white/10 text-lg text-white backdrop-blur transition-colors duration-150 hover:bg-white/20 lg:hidden"
          >
            {theme === "dark" ? "☼" : "◐"}
          </button>
        </div>
      </div>
    </div>
  );
}
