import type { ReactNode } from "react";
import { confidenceLabel } from "../util/format.js";
import { formatDelta, sign, SOURCE_COLORS } from "../util/trends.js";
import { Sparkline } from "../charts/index.js";
import type { Source } from "../types.js";

/** 증감 배지 — 색+부호(↑↓) 동시 전달(색 단독 신호 금지) */
export function DeltaBadge({ value, withBg = true }: { value: number | null; withBg?: boolean }) {
  const s = sign(value);
  const arrow = s === "up" ? "▲" : s === "down" ? "▼" : "—";
  const tone = s === "up"
    ? "text-success"
    : s === "down" ? "text-danger" : "text-ink-faint";
  return (
    <span aria-label={s === "up" ? "상승" : s === "down" ? "하락" : "변동 없음"}
      className={`tnum inline-flex items-center gap-1 text-xs font-bold ${tone} ${withBg ? "rounded-full bg-surface2 px-2 py-0.5" : ""}`}>
      <span aria-hidden="true">{arrow}</span>{formatDelta(value)}
    </span>
  );
}

/** KPI 카드: 그라디언트 아이콘+라벨+대표수치+증감배지+스파크라인 */
export function KpiCard({ label, value, delta, spark, color, context }: {
  label: string; value: string; delta?: number | null; spark?: number[]; color?: string; context?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card transition-all duration-200 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-card-hover">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1"
        style={{ background: color ? `linear-gradient(90deg, ${color}, transparent)` : "linear-gradient(90deg, var(--primary), transparent)" }} />
      <p className="m-0 truncate text-xs font-semibold text-ink-sub">{label}</p>
      <p className="tnum mt-2 mb-0 text-3xl leading-none font-extrabold tracking-tight text-ink md:text-4xl">{value}</p>
      <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2">
        {delta != null && <DeltaBadge value={delta} />}
        {delta != null && <span className="text-xs text-ink-faint">MoM</span>}
        {spark && spark.length > 1 && <Sparkline values={spark} color={color} className="ml-auto" />}
      </div>
      {context && <p className="mt-2 mb-0 text-xs text-ink-faint">{context}</p>}
    </div>
  );
}

/** 소스 필터 칩 — 소스 구분 4색 점 표시 */
export function SourceChip({ active, onClick, label, dot }: {
  active: boolean; onClick: () => void; label: string; dot?: string;
}) {
  return (
    <button aria-pressed={active} onClick={onClick}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all duration-150 ${
        active
          ? "bg-primary text-white shadow-sm shadow-indigo-500/30"
          : "border border-line bg-surface text-ink-sub hover:border-line-strong hover:text-ink"
      }`}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: dot }} />}
      {label}
    </button>
  );
}

/** 신뢰 뱃지 — 텍스트 포함(색 단독 금지) */
export function TrustBadge({ confidence }: { confidence: string }) {
  const ic = confidence === "high" ? "●" : confidence === "mid" ? "◐" : "○";
  const style = confidence === "high"
    ? { background: "var(--badge-high-bg)", color: "var(--badge-high)" }
    : confidence === "mid"
      ? { background: "var(--badge-mid-bg)", color: "var(--badge-mid)" }
      : { background: "var(--badge-low-bg)", color: "var(--badge-low)" };
  return (
    <span title={`신뢰도: ${confidenceLabel(confidence)} — 근거 데이터 기반(추정)`}
      style={style}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold">
      <span aria-hidden="true">{ic}</span> 신뢰: {confidenceLabel(confidence)}
    </span>
  );
}

const STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  success: { cls: "bg-success/12 text-success", label: "성공" },
  partial: { cls: "bg-warning/15 text-warning", label: "부분" },
  failed: { cls: "bg-danger/12 text-danger", label: "실패" },
  running: { cls: "bg-info/12 text-info", label: "진행" },
  none: { cls: "bg-info/12 text-info", label: "없음" },
};

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_STYLE[status] ?? { cls: "bg-info/12 text-info", label: status };
  return (
    <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-bold ${m.cls}`}>{m.label}</span>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden="true"
      className={`min-h-6 animate-pulse rounded-md bg-linear-to-r from-surface2 via-line to-surface2 bg-[length:200%_100%] ${className ?? ""}`}
      style={style} />
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl px-6 py-14 text-center">
      <strong className="text-ink">{title}</strong>
      {hint && <p className="mt-2 mb-0 text-sm text-ink-faint">{hint}</p>}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/8 px-6 py-10 text-center">
      <strong className="text-danger">데이터를 불러오지 못했습니다</strong>
      {message && <p className="m-0 text-sm break-all text-ink-faint">{message}</p>}
      {onRetry && <button className={btnClass()} onClick={onRetry}>재시도</button>}
    </div>
  );
}

export function btnClass(primary = false): string {
  const base = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45";
  return primary
    ? `${base} bg-primary text-white hover:bg-primary-hover`
    : `${base} border border-line bg-surface text-ink hover:bg-surface2`;
}

export function Section({ id, title, action, kicker, description, children }: {
  id: string; title: string; action?: ReactNode; kicker?: string; description?: string; children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <div className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {kicker && (
            <p className="m-0 mb-1 text-xs font-extrabold tracking-[0.12em] text-primary uppercase">{kicker}</p>
          )}
          <h2 id={`${id}-h`} className="m-0 text-xl font-extrabold tracking-tight text-ink md:text-2xl">{title}</h2>
          {description && <p className="mt-2 mb-0 max-w-2xl text-sm text-ink-sub">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function sourceDot(source: Source) { return SOURCE_COLORS[source] ?? "var(--primary)"; }
