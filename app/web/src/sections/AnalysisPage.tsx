import { useEffect, useState } from "react";
import type { AnalysisItem, OpportunityItem, Summary } from "../types.js";
import { api } from "../api/client.js";
import { Section, ErrorBlock, Skeleton } from "../components/ui.js";

const ACTION_LABEL: Record<string, string> = {
  add: "기능 추가",
  reduce: "기능 축소",
  pivot: "방향 전환",
  watch: "관망",
};
const ACTION_STYLE: Record<string, string> = {
  add: "text-success border-success/60 bg-success/8",
  reduce: "text-warning border-warning/60 bg-warning/10",
  pivot: "text-primary border-primary/60 bg-primary-soft",
  watch: "text-ink-sub border-line bg-surface2",
};
const ACTION_ACCENT: Record<string, string> = {
  add: "bg-success",
  reduce: "bg-warning",
  pivot: "bg-primary",
  watch: "bg-ink-faint",
};
const PRIORITY_LABEL: Record<string, string> = { high: "높음", mid: "중간", low: "낮음" };
const CONF_LABEL: Record<string, string> = { high: "높음", mid: "중간", low: "낮음" };
const PRIORITY_COLOR: Record<string, string> = {
  high: "text-danger",
  mid: "text-warning",
  low: "text-ink-faint",
};

/** 분석 페이지 — 수집 데이터 기반 전략 아이템 (기능 추가/축소/방향 전환) */
export function AnalysisPage({ summary }: { summary?: Summary | null }) {
  const [items, setItems] = useState<AnalysisItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.analysisItems()
      .then(setItems)
      .catch(e => setErr(String(e)));
  }, []);

  if (err) return <Section id="analysis-page" title="분석 페이지" kicker="Strategy analysis"><ErrorBlock message={err} /></Section>;
  if (!items) return <Section id="analysis-page" title="분석 페이지" kicker="Strategy analysis"><div className="rounded-2xl border border-line bg-surface shadow-card"><Skeleton className="h-50" /></div></Section>;

  const add = items.filter(i => i.action === "add");
  const reduce = items.filter(i => i.action === "reduce");
  const pivot = items.filter(i => i.action === "pivot");

  // 수집 규모 요약 — API 값 기반 동적 생성(재수집 시 자동 갱신)
  const bySource = summary?.bySource ?? {};
  const totalCollected = Object.values(bySource).reduce((sum, n) => sum + n, 0);
  const SOURCE_LABEL: Record<string, string> = { wishket: "위시켓", freemoa: "프리모아", u300: "u300", devpost: "Devpost", hackathon: "해커톤·챌린지" };
  const breakdown = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .map(([src, n]) => `${SOURCE_LABEL[src] ?? src} ${n.toLocaleString()}`)
    .join(" · ");
  const description = totalCollected > 0
    ? `수집된 ${totalCollected.toLocaleString()}건${breakdown ? `(${breakdown})` : ""}의 실제 발주 패턴에서 도출한 ${items.length}대 실행 아이템. SI가 이번 분기 착수 가능한 패키지·수직·매출구조 관점으로 재편했습니다.`
    : `${items.length}대 실행 아이템 — 수집 데이터 기반 패키지·수직·매출구조 관점의 전략입니다.`;  return (
    <Section id="analysis-page" title="분석 페이지" kicker="Data-driven strategy"
      description={description}
      action={<span className="text-xs text-ink-faint">근거: 최근 수집 데이터</span>}>

      {/* 요약 스트립 */}
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryStat value={add.length} label="기능 추가" valueClass="text-success" />
        <SummaryStat value={reduce.length} label="기능 축소" valueClass="text-warning" />
        <SummaryStat value={pivot.length} label="방향 전환" valueClass="text-primary" />
        <SummaryStat value={items.length} label="전체 아이템" valueClass="text-ink" />
      </div>

      {/* 아이템 목록 */}
      <div className="grid gap-4">
        {items.map(item => (
          <article key={item.id} className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover">
            <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${ACTION_ACCENT[item.action] ?? "bg-primary"}`} />
            <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold tracking-[0.12em] text-primary uppercase">아이템 {String(item.rank).padStart(2, "0")}</span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${ACTION_STYLE[item.action] ?? ""}`}>
                    {ACTION_LABEL[item.action]}
                  </span>
                  <span className="text-xs text-ink-faint">신뢰도 {CONF_LABEL[item.confidence]}</span>
                </div>
                <h3 className="mt-2 mb-1 text-lg font-bold tracking-tight text-ink">{item.title}</h3>
              </div>
              <button aria-expanded={open === item.id}
                onClick={() => setOpen(open === item.id ? null : item.id)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-surface2">
                {open === item.id ? "접기 ▲" : "상세 보기 ▼"}
              </button>
            </div>

            <p className="mx-0 mt-2 mb-2 pl-2 leading-relaxed text-ink">{item.summary}</p>

            <p className="mt-2 mb-0 pl-2 text-sm text-ink-sub">🎯 {item.market}</p>

            {/* 접힌 상세 */}
            {open === item.id && (
              <div className="mt-5 border-t border-line pt-5 pl-2">
                <h4 className="m-0 mb-1.5 font-bold text-ink">💡 기회 요인 (왜 유망한가)</h4>
                <p className="m-0 leading-relaxed text-ink">{item.opportunity}</p>

                <h4 className="mt-5 mb-1.5 font-bold text-ink">⚙️ 기능 정의</h4>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub">
                        <th>우선순위</th><th>기능</th><th>정의</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                      {item.features.map((f, i) => (
                        <tr key={i}>
                          <td><span className={`font-extrabold ${PRIORITY_COLOR[f.priority] ?? ""}`}>{PRIORITY_LABEL[f.priority]}</span></td>
                          <td className="font-semibold">{f.name}</td>
                          <td>{f.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 className="mt-5 mb-1.5 font-bold text-ink">🔄 방향 변경</h4>
              <p className="m-0 leading-relaxed text-ink whitespace-pre-line">{item.direction_change ?? "—"}</p>

              <h4 className="mt-5 mb-1.5 font-bold text-ink">📈 기대 효과</h4>
              <p className="m-0 leading-relaxed text-ink whitespace-pre-line">{item.expected_effect ?? "—"}</p>

              <h4 className="mt-5 mb-1.5 font-bold text-ink">📊 데이터 근거</h4>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full border-collapse text-sm">
                    <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                      {item.evidence.map((e, i) => (
                        <tr key={i}><td className="text-ink-sub">{e.metric}</td><td className="font-semibold">{e.value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 className="mt-5 mb-1.5 font-bold text-ink">⚠️ 리스크</h4>
                <ul className="my-0 list-disc pr-0 pl-5 leading-loose text-ink">
                  {item.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>

      <OpportunitySpace />
    </Section>
  );
}

const TIER_META: Record<string, { label: string; desc: string }> = {
  B: { label: "Tier B — 도메인 수직형", desc: "서브 도메인 신호 기반 니치. 아래 트리거 조건 충족 시 승격 검토." },
  C: { label: "Tier C — 글로벌 전이형", desc: "해외에서 검증되고 한국에 공백인 영역. 조기 신호 감지 시 진입." },
  D: { label: "Tier D — 관망·기각", desc: "데이터가 부정적으로 판정한 영역. 지표 개선 전까지 잠금." },
};
const SPACE_PRIORITY_BADGE: Record<string, string> = {
  high: "text-success border-success/60 bg-success/8",
  mid: "text-warning border-warning/60 bg-warning/10",
  low: "text-ink-faint border-line bg-surface2",
};
const SPACE_PRIORITY_LABEL: Record<string, string> = { high: "우선도 상", mid: "우선도 중", low: "우선도 하" };

/** 기회 공간 지도 — Tier A 8개 외의 하위 계층(Tier B·C·D) 롱리스트, 기본 접힘 */
function OpportunitySpace() {
  const [space, setSpace] = useState<OpportunityItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.analysisSpace().then(setSpace).catch(e => setErr(String(e)));
  }, []);

  const counts = space
    ? { B: space.filter(i => i.tier === "B").length, C: space.filter(i => i.tier === "C").length, D: space.filter(i => i.tier === "D").length }
    : null;
  const triggerCount = space?.filter(i => i.trigger).length ?? 0;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-lg font-bold tracking-tight text-ink">
            🗺️ 기회 공간 지도
            {counts && <span className="ml-2 text-sm font-semibold text-ink-sub">Tier B {counts.B} · C {counts.C} · D {counts.D} / 총 {space!.length}개</span>}
          </h3>
          <p className="mt-1 mb-0 text-sm text-ink-sub">
            위 8개 아이템은 컨빅션 컷을 통과한 1순위. 아래는 전체 기회 공간 롱리스트입니다{triggerCount > 0 ? ` (트리거 보유 ${triggerCount}개)` : ""}.
          </p>
        </div>
        <button aria-expanded={open} onClick={() => setOpen(o => !o)}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-surface2">
          {open ? "접기 ▲" : "펼치기 ▼"}
        </button>
      </div>

      {err && <div role="alert" className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-sub shadow-card">기회 공간을 불러오지 못했습니다: {err}</div>}
      {!space && !err && <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card"><Skeleton className="h-40" /></div>}

      {open && space && (
        <div className="mt-4 grid gap-6">
          {(["B", "C", "D"] as const).map(tier => {
            const rows = space.filter(i => i.tier === tier);
            const meta = TIER_META[tier];
            return (
              <article key={tier} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="m-0 text-base font-bold text-ink">{meta.label} <span className="text-ink-sub">({rows.length}개)</span></h4>
                  <p className="m-0 text-xs text-ink-faint">{meta.desc}</p>
                </div>
                <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub">
                        <th className="w-12">번호</th>
                        <th className="w-32">{tier === "D" ? "영역" : "도메인"}</th>
                        <th>{tier === "D" ? "영역·기각 사유" : "아이템"}</th>
                        {tier !== "D" && <th className="w-20">우선도</th>}
                      </tr>
                    </thead>
                    <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                      {rows.map(item => (
                        <tr key={item.id}>
                          <td className="tnum font-extrabold text-ink-sub">{item.id}</td>
                          <td className="text-ink-sub">{item.domain}</td>
                          <td>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-semibold ${tier === "D" ? "" : "text-ink"}`}>{item.title}</span>
                              <span className="rounded bg-surface2 px-1.5 py-0.5 text-xs text-ink-sub">{item.form}</span>
                            </div>
                            <p className="m-0 mt-1 text-xs leading-relaxed text-ink-sub">{item.evidence}</p>
                            {item.trigger && <p className="m-0 mt-1 text-xs font-semibold text-primary">⚡ 트리거: {item.trigger}</p>}
                          </td>
                          {tier !== "D" && (
                            <td><span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${SPACE_PRIORITY_BADGE[item.priority] ?? ""}`}>
                              {SPACE_PRIORITY_LABEL[item.priority] ?? item.priority}
                            </span></td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryStat({ value, label, valueClass }: { value: number; label: string; valueClass: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 text-center shadow-card">
      <p className={`tnum m-0 text-xl font-extrabold tracking-tight md:text-2xl ${valueClass}`}>{value}</p>
      <p className="mt-1 mb-0 text-xs text-ink-faint">{label}</p>
    </div>
  );
}
