import type { Insight } from "../types.js";
import { Empty, ErrorBlock, Section } from "../components/ui.js";

export function Features({ items, error }: { items: Insight[] | null; error: string | null }) {
  return (
    <Section id="features" title="기능개선 방향" kicker="Product opportunities" description="수요가 확인된 영역을 다음 기능 후보로 번역합니다.">
      {error ? <ErrorBlock message={error} />
        : !items ? (
          <div role="status" aria-live="polite" className="rounded-2xl border border-line bg-surface p-6 text-ink-sub shadow-card">
            분석 결과를 불러오는 중입니다.
          </div>
        )
        : items.length === 0 ? <div className="rounded-2xl border border-line bg-surface shadow-card"><Empty title="분석 미실행" hint="수요와 공급 데이터가 충분히 누적되면 기능 후보가 생성됩니다." /></div>
        : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => {
              const metric = item.metric as { cnt?: number; category?: string; avg_applicants?: number };
              return (
                <article key={`${item.title}-${index}`}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                  <p className="m-0 text-xs font-extrabold tracking-[0.12em] text-primary uppercase">Candidate {String(index + 1).padStart(2, "0")}</p>
                  <h3 className="m-0 font-bold leading-snug text-ink">{item.title}</h3>
                  <p className="m-0 text-sm leading-relaxed text-ink-sub">{item.body}</p>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-sub">
                    {metric.cnt != null && <strong className="tnum text-base text-ink">{metric.cnt.toLocaleString()}건</strong>}
                    {metric.avg_applicants != null && <span>평균 지원자 {metric.avg_applicants.toFixed(1)}명</span>}
                    {metric.category && <span>{metric.category}</span>}
                  </div>
                  <p className="mt-auto mb-0 text-xs text-ink-faint">근거기간 · {item.period}</p>
                </article>
              );
            })}
          </div>
        )}
    </Section>
  );
}
