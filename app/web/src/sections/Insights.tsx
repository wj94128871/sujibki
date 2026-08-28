import type { Insight } from "../types.js";
import { Section, TrustBadge, Empty, ErrorBlock } from "../components/ui.js";

/** 시장성 인사이트: 숫자와 근거 기간, 신뢰도를 한 카드 안에서 함께 보여준다. */
export function Insights({ items, error }: { items: Insight[] | null; error: string | null }) {
  return (
    <Section id="insights" title="시장성 인사이트" kicker="Market read" description="현재 데이터로 확인되는 기회를 추정치로 표시합니다. 단일 시점 데이터는 추이를 단정하지 않습니다.">
      {error ? <ErrorBlock message={error} />
        : !items ? (
          <div role="status" aria-live="polite" className="rounded-2xl border border-line bg-surface p-6 text-ink-sub shadow-card">
            시장성 인사이트를 불러오는 중입니다.
          </div>
        )
        : items.length === 0 ? <div className="rounded-2xl border border-line bg-surface shadow-card"><Empty title="분석 미실행" hint="수집 데이터가 누적되면 시장성 인사이트가 생성됩니다." /></div>
        : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => {
              const metric = item.metric as { cnt?: number; sharePct?: number; category?: string };
              return (
                <article key={`${item.title}-${index}`}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 mb-1 text-xs font-extrabold tracking-[0.12em] text-primary uppercase">Signal {String(index + 1).padStart(2, "0")}</p>
                      <h3 className="m-0 font-bold leading-snug text-ink">{item.title}</h3>
                    </div>
                    <TrustBadge confidence={item.confidence} />
                  </div>
                  {metric.sharePct != null && <p className="tnum m-0 text-3xl font-extrabold tracking-tight text-ink">{metric.sharePct}%</p>}
                  {metric.cnt != null && (
                    <p className="tnum m-0 text-3xl font-extrabold tracking-tight text-ink">
                      {metric.cnt.toLocaleString()}<span className="text-sm font-semibold text-ink-faint">건</span>
                    </p>
                  )}
                  <p className="m-0 text-sm leading-relaxed text-ink-sub">{item.body}</p>
                  <p className="mt-auto mb-0 text-xs text-ink-faint">근거기간 · {item.period}{metric.category ? ` · ${metric.category}` : ""}</p>
                </article>
              );
            })}
          </div>
        )}
    </Section>
  );
}
