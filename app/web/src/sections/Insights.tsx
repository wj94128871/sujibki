import type { Insight } from "../types.js";
import { Section, TrustBadge, Empty, ErrorBlock } from "../components/ui.js";

type PersonaMetric = {
  cnt?: number;
  sharePct?: number;
  category?: string;
  rank?: number;
  persona_origin?: string;
  agreed_by?: string[];
  consensus?: string;
  evidence?: { metric: string; value: string }[];
};

const PERSONA_LABEL: Record<string, string> = {
  si_director: "SI 영업 이사",
  startup_pm: "스타트업 PM",
  vc: "VC 투자자",
  inhouse_pm: "인하우스 PM",
  // 구세대 페르소나 키 (DB analysis_insights 마이그레이션 전 호환)
  "SI-PM": "SI 영업 이사",
  "Startup-CTO": "스타트업 CTO",
  "Global-Researcher": "글로벌 리서처",
};

const CONSENSUS_STYLE: Record<string, string> = {
  high: "border-success/60 bg-success/10 text-success",
  mid:  "border-warning/60 bg-warning/10 text-warning",
  low:  "border-line bg-surface2 text-ink-faint",
};

const CONSENSUS_LABEL: Record<string, string> = {
  high: "강한 합의", mid: "부분 합의", low: "관망",
};

const ACTION_TONE: Record<string, string> = {
  feature: "border-primary/60 bg-primary-soft text-primary",
  market:  "border-warning/60 bg-warning/10 text-warning",
  keyword: "border-ink-faint/40 bg-surface2 text-ink-sub",
};

const ACTION_LABEL: Record<string, string> = {
  feature: "신규 기회", market: "방향 전환", keyword: "관망/신호",
};

/** 시장성 인사이트: 페르소나 합의 시그널 카드 + sharePct/cnt + 근거 evidence */
export function Insights({ items, error }: { items: Insight[] | null; error: string | null }) {
  return (
    <Section id="insights" title="시장성 인사이트" kicker="Market read"
      description={`4명 페르소나(SI 영업 이사·스타트업 PM·VC·인하우스 PM)가 실제 수집 데이터를 합의해 도출한 ${items?.length ?? 0}개 실행 시그널. 단일 시점 데이터는 추이를 단정하지 않습니다.`}>
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
              const m = (item.metric || {}) as PersonaMetric;
              const actionTone = ACTION_TONE[item.type] ?? ACTION_TONE.feature;
              const actionLabel = ACTION_LABEL[item.type] ?? "신규 기회";
              return (
                <article key={`${item.title}-${index}`}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 mb-1 text-xs font-extrabold tracking-[0.12em] text-primary uppercase">
                        Signal {String(m.rank ?? index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="m-0 font-bold leading-snug text-ink">{item.title}</h3>
                    </div>
                    <TrustBadge confidence={item.confidence} />
                  </div>

                  {/* 액션 칩 + 합의 칩 */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${actionTone}`}>
                      {actionLabel}
                    </span>
                    {m.consensus && (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${CONSENSUS_STYLE[m.consensus] ?? ""}`}>
                        {CONSENSUS_LABEL[m.consensus]}
                      </span>
                    )}
                    {m.persona_origin && (
                      <span className="inline-flex items-center rounded-full border border-line bg-surface2 px-2 py-0.5 text-xs text-ink-sub">
                        원안 · {PERSONA_LABEL[m.persona_origin] ?? m.persona_origin}
                      </span>
                    )}
                  </div>

                  {/* 메인 숫자: sharePct 우선, 없으면 cnt */}
                  {m.sharePct != null ? (
                    <p className="tnum m-0 text-3xl font-extrabold tracking-tight text-ink">
                      {m.sharePct}<span className="text-base font-semibold text-ink-faint">%</span>
                    </p>
                  ) : m.cnt != null ? (
                    <p className="tnum m-0 text-3xl font-extrabold tracking-tight text-ink">
                      {m.cnt.toLocaleString()}<span className="text-sm font-semibold text-ink-faint">건</span>
                    </p>
                  ) : null}

                  {/* 동의 페르소나 (있으면) */}
                  {m.agreed_by && m.agreed_by.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-xs text-ink-faint">
                      <span>동의</span>
                      {m.agreed_by.map((p) => (
                        <span key={p} className="rounded bg-primary-soft px-1.5 py-0.5 font-semibold text-primary">
                          {PERSONA_LABEL[p] ?? p}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="m-0 text-sm leading-relaxed text-ink-sub">{item.body}</p>

                  {/* 근거 evidence (있으면) */}
                  {m.evidence && m.evidence.length > 0 && (
                    <ul className="m-0 list-none space-y-1 rounded-lg border border-line bg-surface2 p-2 text-xs text-ink-sub">
                      {m.evidence.slice(0, 3).map((e, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span aria-hidden="true" className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="min-w-0">
                            <span className="font-semibold text-ink">{e.metric}</span>
                            <span className="ml-1 text-ink-faint">· {e.value}</span>
                          </span>
                        </li>
                      ))}
                      {m.evidence.length > 3 && (
                        <li className="text-ink-faint">+{m.evidence.length - 3}개 추가</li>
                      )}
                    </ul>
                  )}

                  <p className="mt-auto mb-0 text-xs text-ink-faint">
                    근거기간 · {item.period}{m.category ? ` · ${m.category}` : ""}
                  </p>
                </article>
              );
            })}
          </div>
        )}
    </Section>
  );
}
