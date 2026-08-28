import type { Analysis, Summary } from "../types.js";
import { KpiCard, Section, Skeleton, StatusPill } from "../components/ui.js";
import { SOURCE_KEYS, SOURCE_LABEL, SOURCE_COLORS, computeMoM } from "../util/trends.js";

function formatRunAt(value: string | null) {
  if (!value) return "최근 수집 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export function Kpis({ summary, analysis }: { summary: Summary | null; analysis: Analysis | null }) {
  if (!summary) {
    return (
      <Section id="summary" title="지금 시장 요약" kicker="Overview" description="수집된 안건을 기준으로 시장의 현재 규모와 흐름을 요약합니다.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <Skeleton className="w-[55%]" />
              <Skeleton className="mt-3 h-9 w-3/4" />
              <Skeleton className="mt-3 w-[72%]" />
            </div>
          ))}
        </div>
      </Section>
    );
  }

  const monthly = analysis?.monthly.map(month => month.cnt) ?? [];
  const newDelta = computeMoM(monthly);
  const total = summary.total;
  return (
    <Section
      id="summary"
      title="지금 시장 요약"
      kicker="Overview"
      description="수집된 안건을 기준으로 시장의 현재 규모와 흐름을 요약합니다."
      action={
        <div className="flex items-center gap-2 text-sm text-ink-sub">
          <span>최근 수집 {formatRunAt(summary.lastRunAt)}</span>
          <StatusPill status={summary.status} />
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="총 수집 건" value={total.toLocaleString()} delta={newDelta} spark={monthly} context="전체 소스 · 누적" />
        {SOURCE_KEYS.map(key => (
          <KpiCard
            key={key}
            label={SOURCE_LABEL[key]}
            value={(summary.bySource[key] ?? 0).toLocaleString()}
            spark={monthly}
            color={SOURCE_COLORS[key]}
            context="수집된 안건"
          />
        ))}
        <KpiCard label="최근 월 신규" value={(monthly[monthly.length - 1] ?? 0).toLocaleString()} delta={newDelta} spark={monthly} context="월간 등록 추이" />
      </div>
    </Section>
  );
}
