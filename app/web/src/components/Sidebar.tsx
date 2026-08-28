import { useEffect } from "react";
import { SOURCE_COLORS, SOURCE_KEYS, SOURCE_LABEL } from "../util/trends.js";
import type { Source } from "../types.js";

const ANCHORS = [
  ["summary", "요약"],
  ["sources", "안건"],
  ["analysis", "분석"],
  ["features", "기능 방향"],
  ["insights", "시장성"],
  ["runs", "수집 이력"],
] as const;

function SidebarBody({ page, onNavigate, source, onSource }: {
  page: "dashboard" | "analysis";
  onNavigate: (page: "dashboard" | "analysis") => void;
  source: Source | "all";
  onSource: (source: Source | "all") => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        <span aria-hidden="true"
          className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-fuchsia-500 text-base font-black text-white shadow-lg shadow-indigo-950/40">
          시
        </span>
        <div>
          <p className="m-0 text-[15px] font-bold tracking-tight text-white">시장조사 · 분석</p>
          <p className="m-0 text-xs text-indigo-200/70">IT 프로젝트 수요 레이더</p>
        </div>
      </div>

      <nav aria-label="페이지 메뉴" className="mt-4 flex flex-col gap-1 px-3">
        <button
          onClick={() => onNavigate("dashboard")}
          aria-current={page === "dashboard" ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 ${
            page === "dashboard"
              ? "bg-linear-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-950/50"
              : "text-indigo-100/75 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span aria-hidden="true" className="text-base leading-none">▦</span> 대시보드
        </button>
        <button
          onClick={() => onNavigate("analysis")}
          aria-current={page === "analysis" ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 ${
            page === "analysis"
              ? "bg-linear-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-950/50"
              : "text-indigo-100/75 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span aria-hidden="true" className="text-base leading-none">◎</span> 분석 페이지
        </button>
      </nav>

      {page === "dashboard" && (
        <nav aria-label="섹션 바로가기" className="mt-5 flex flex-col gap-0.5 border-t border-white/10 px-3 pt-4">
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-300/60">섹션</p>
          {ANCHORS.map(([id, label]) => (
            <a key={id} href={`#${id}`}
              className="rounded-md px-3 py-1.5 text-[13px] text-indigo-100/65 transition-colors duration-150 hover:bg-white/5 hover:text-white">
              {label}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t border-white/10 px-6 py-5">
        <div role="group" aria-label="분석 소스 필터" className="flex flex-wrap gap-1.5">
          <SourcePill label="전체" active={source === "all"} onClick={() => onSource("all")} />
          {SOURCE_KEYS.map(key => (
            <SourcePill key={key} label={SOURCE_LABEL[key]} dot={SOURCE_COLORS[key]}
              active={source === key} onClick={() => onSource(source === key ? "all" : key)} />
          ))}
        </div>
        <p className="m-0 text-[11px] leading-relaxed text-indigo-200/45">
          위시켓·프리모아·u300·Devpost 공개 정보 크롤링 · 개인정보 미포함
        </p>
      </div>
    </div>
  );
}

function SourcePill({ active, onClick, label, dot }: {
  active: boolean; onClick: () => void; label: string; dot?: string;
}) {
  return (
    <button aria-pressed={active} onClick={onClick}
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors duration-150 ${
        active ? "bg-white text-[#101332]" : "bg-white/8 text-indigo-100/80 hover:bg-white/15 hover:text-white"
      }`}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: dot }} />}
      {label}
    </button>
  );
}

/** 데스크톱 고정 사이드바 + 모바일 오버레이 드로어 */
export function Sidebar({ open, onClose, page, onNavigate, source, onSource, theme, onToggleTheme }: {
  open: boolean;
  onClose: () => void;
  page: "dashboard" | "analysis";
  onNavigate: (page: "dashboard" | "analysis") => void;
  source: Source | "all";
  onSource: (source: Source | "all") => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* 데스크톱 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-linear-to-b from-[var(--sidebar-from)] to-[var(--sidebar-to)] lg:block">
        <SidebarBody page={page} onNavigate={onNavigate} source={source} onSource={onSource} />
      </aside>

      {/* 모바일 드로어 */}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="메뉴" className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0b0e1e]/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-linear-to-b from-[var(--sidebar-from)] to-[var(--sidebar-to)] shadow-2xl">
            <div className="flex justify-end px-4 pt-4">
              <button onClick={onClose} aria-label="메뉴 닫기"
                className="grid size-10 place-items-center rounded-lg text-xl text-indigo-100 hover:bg-white/10">
                ✕
              </button>
            </div>
            <SidebarBody page={page} onNavigate={p => { onNavigate(p); onClose(); }} source={source} onSource={onSource} />
          </aside>
        </div>
      )}

      {/* 테마 토글 — 사이드바 하단 우측(데스크톱) / 상단바(모바일) */}
      <button
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        className="fixed right-5 bottom-5 z-40 hidden size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-lg text-white backdrop-blur transition-colors duration-150 hover:bg-white/20 lg:grid"
      >
        {theme === "dark" ? "☼" : "◐"}
      </button>
    </>
  );
}
