import type { RunItem } from "../types.js";
import { Section, Empty, ErrorBlock, StatusPill } from "../components/ui.js";
import { formatDate } from "../util/format.js";

export function Runs({ data, error }: { data: RunItem[] | null; error: string | null }) {
  return (
    <Section id="runs" title="수집 이력" kicker="Collection history" description="수집 시각, 소스별 처리 건수와 실패 원인을 확인합니다.">
      {error ? <ErrorBlock message={error} />
        : !data ? (
          <div role="status" aria-live="polite" className="rounded-2xl border border-line bg-surface p-6 text-ink-sub shadow-card">
            로딩…
          </div>
        )
        : data.length === 0 ? <div className="rounded-2xl border border-line bg-surface shadow-card"><Empty title="아직 수집 없음" /></div>
        : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub [&>th]:whitespace-nowrap">
                  <th>시각</th><th>소스</th><th className="num">건수</th><th className="num">성공</th><th className="num">실패</th><th>상태</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-3 [&>tr>td.num]:text-right [&>tr>td.num]:tnum">
                {data.map(r => (
                  <tr key={r.id}>
                    <td className="num" data-label="시각">{formatDate(r.startedAt)}</td>
                    <td data-label="소스">{r.source}{r.runtime ? ` (${r.runtime})` : ""}</td>
                    <td className="num" data-label="건수">{r.total}</td>
                    <td className="num" data-label="성공">{r.success}</td>
                    <td className="num" data-label="실패">{r.failed}{r.failed > 0 ? ` (${r.error ?? "원인 미상"})` : ""}</td>
                    <td data-label="상태"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Section>
  );
}
