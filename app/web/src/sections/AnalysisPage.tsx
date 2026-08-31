import { Fragment, useEffect, useState } from "react";
import type { AnalysisItem, EnhancedAnalysis, OpportunityItem, Summary } from "../types.js";
import { api } from "../api/client.js";
import { Section, ErrorBlock, Skeleton } from "../components/ui.js";

const ACTION_LABEL: Record<string, string> = {
  add: "새로 더하기",
  reduce: "더 좁게 줄이기",
  pivot: "방향 바꾸기",
  watch: "잠깐 보류",
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
const PRIORITY_LABEL: Record<string, string> = { high: "꼭 필요", mid: "다음 차례", low: "나중에" };
const CONF_LABEL: Record<string, string> = { high: "높음", mid: "중간", low: "낮음" };
const PRIORITY_COLOR: Record<string, string> = {
  high: "text-danger",
  mid: "text-warning",
  low: "text-ink-faint",
};

/** 요약의 첫 문장만 분리 — "한 줄 요약" 리드용. 소수(6.28억 등) 보호를 위해 ". "(점+공백) 기준으로 자름. */
function splitLead(summary: string): [string, string] {
  const idx = summary.indexOf(". ");
  if (idx < 0) return [summary, ""];
  return [summary.slice(0, idx + 1), summary.slice(idx + 2)];
}

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
    ? `수집한 ${totalCollected.toLocaleString()}건${breakdown ? `(${breakdown})` : ""}의 실제 발주 내용에서 반복되는 수요를 찾아 ${items.length}개 아이템을 뽑았습니다.`
    : `${items.length}개 아이템 — 수집 데이터에서 반복되는 수요를 찾아 정리했습니다.`;  return (
    <Section id="analysis-page" title="분석 페이지" kicker="Data-driven strategy"
      description={description}
      action={<span className="text-xs text-ink-faint">근거: 최근 수집 데이터</span>}>

      {/* 요약 스트립 */}
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryStat value={add.length} label="새로 더하기" valueClass="text-success" />
        <SummaryStat value={reduce.length} label="더 좁게 줄이기" valueClass="text-warning" />
        <SummaryStat value={pivot.length} label="방향 바꾸기" valueClass="text-primary" />
        <SummaryStat value={items.length} label="전체 아이템" valueClass="text-ink" />
      </div>

      {/* 아이템 목록 */}
      <div className="grid gap-4">
        {items.map(item => {
          const [lead, rest] = splitLead(item.summary);
          return (
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

            <p className="mx-0 mt-2 mb-1 pl-2 leading-relaxed text-ink"><strong className="font-extrabold">한 줄 요약:</strong> {lead}</p>
            {rest && <p className="mx-0 mt-0 mb-2 pl-2 leading-relaxed text-ink">{rest}</p>}

            <p className="mt-2 mb-0 pl-2 text-sm text-ink-sub">🎯 어디에 팔까? — {item.market}</p>

            {/* 접힌 상세 */}
            {open === item.id && (
              <div className="mt-5 border-t border-line pt-5 pl-2">
                <h4 className="m-0 mb-1.5 font-bold text-ink">🧐 왜 지금? 시장에서 무슨 일이?</h4>
                <p className="m-0 leading-relaxed text-ink">{item.opportunity}</p>

                <h4 className="mt-5 mb-1.5 font-bold text-ink">🛠️ 우리가 만들 것</h4>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub">
                        <th>중요도</th><th>만들 것</th><th>무슨 일을 하나?</th>
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

                <h4 className="mt-5 mb-1.5 font-bold text-ink">🔀 처음과 뭐가 달라졌나</h4>
              <p className="m-0 leading-relaxed text-ink whitespace-pre-line">{item.direction_change ?? "—"}</p>

              <h4 className="mt-5 mb-1.5 font-bold text-ink">💰 돈은 어떻게 버나?</h4>
              <p className="m-0 leading-relaxed text-ink whitespace-pre-line">{item.expected_effect ?? "—"}</p>

              <h4 className="mt-5 mb-1.5 font-bold text-ink">📌 무엇이 증거인가?</h4>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full border-collapse text-sm">
                    <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                      {item.evidence.map((e, i) => (
                        <tr key={i}><td className="text-ink-sub">{e.metric}</td><td className="font-semibold">{e.value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 className="mt-5 mb-1.5 font-bold text-ink">⚠️ 조심할 점</h4>
                <ul className="my-0 list-disc pr-0 pl-5 leading-loose text-ink">
                  {item.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </article>
          );
        })}
      </div>

      <OpportunitySpace />
      <EnhancedAnalysis />
    </Section>
  );
}

const QUADRANT_BADGE: Record<string, string> = {
  Q1: "text-ink-sub border-line bg-surface2",
  Q2: "text-primary border-primary/60 bg-primary-soft",
  Q3: "text-warning border-warning/60 bg-warning/10",
  Q4: "text-ink-faint border-line bg-surface2",
};
const QUADRANT_LABEL: Record<string, string> = {
  Q1: "공통 수요", Q2: "C티어 후보", Q3: "한국 특화", Q4: "노이즈",
};
const ROUND_LABEL: Record<string, string> = { PRE_SEED: "프리시드", SEED: "시드", PRE_A: "프리A", SERIES_A: "시리즈A" };

/** 고도화 분석 — 갭 쿼드런트·투자 검증·재발주 그래프·주간 추이 (PART 9.5), 기본 접힘 */
function EnhancedAnalysis() {
  const [data, setData] = useState<EnhancedAnalysis | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.analysisEnhanced().then(setData).catch(e => setErr(String(e)));
  }, []);

  const q2 = data?.gap_quadrant.c_candidates ?? [];

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-lg font-bold tracking-tight text-ink">
            🔬 고도화 분석
            {data && <span className="ml-2 text-sm font-semibold text-ink-sub">전수 {data.total.toLocaleString()}건 · 기준일 {data.generated_at}</span>}
          </h3>
          <p className="mt-1 mb-0 text-sm text-ink-sub">
            한국 발주 × 글로벌 테마 교차(갭 쿼드런트)·투자 검증 트랙·재발주 그래프·주간 추이{q2.length > 0 ? ` — C티어 후보: ${q2.map(t => t.theme).join(", ")}` : ""}.
          </p>
        </div>
        <button aria-expanded={open} onClick={() => setOpen(o => !o)}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-surface2">
          {open ? "접기 ▲" : "펼치기 ▼"}
        </button>
      </div>

      {err && <div role="alert" className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-sub shadow-card">고도화 분석을 불러오지 못했습니다: {err}</div>}
      {!data && !err && <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card"><Skeleton className="h-40" /></div>}

      {open && data && (
        <div className="mt-4 grid gap-6">
          {/* 1) 갭 쿼드런트 */}
          <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h4 className="m-0 text-base font-bold text-ink">🧭 갭 쿼드런트 <span className="text-ink-sub">— 글로벌 {data.gap_quadrant.gl_total.toLocaleString()}건 vs 한국 도급 교차</span></h4>
            <p className="m-0 mt-1 text-xs text-ink-faint">Q2(글로벌 과열·한국 공백)가 C티어 후보로 자동 태깅됩니다. 임계값: 글로벌 점유 10%↑, 한국 15건↑ 또는 예산 1억↑.</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub">
                    <th>테마</th><th className="w-24">글로벌 점유</th><th className="w-20">한국 발주</th><th className="w-24">한국 예산합</th><th className="w-28">판정</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                  {data.gap_quadrant.themes.map(t => (
                    <tr key={t.theme} className={t.quadrant === "Q2" ? "bg-primary-soft/40" : ""}>
                      <td className={t.quadrant === "Q2" ? "font-extrabold text-primary" : "font-semibold"}>{t.theme}</td>
                      <td className="tnum">{t.global_share_pct}% <span className="text-xs text-ink-faint">({t.global_cnt})</span></td>
                      <td className="tnum">{t.kr_cnt}건</td>
                      <td className="tnum">{(t.kr_budget_sum / 1e8).toFixed(2)}억</td>
                      <td><span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${QUADRANT_BADGE[t.quadrant] ?? ""}`}>
                        {QUADRANT_LABEL[t.quadrant] ?? t.quadrant}
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* 2) 투자 검증 트랙 */}
          <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h4 className="m-0 text-base font-bold text-ink">💎 투자 검증 트랙 <span className="text-ink-sub">— u300 투자유치 {data.funding.total_rounds}건</span></h4>
            <p className="m-0 mt-1 text-xs text-ink-faint">라운드 분포: {Object.entries(data.funding.by_round).map(([k, v]) => `${ROUND_LABEL[k] ?? k} ${v}`).join(" · ")}</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub">
                    <th className="w-36">도메인</th><th className="w-20">투자건수</th><th className="w-48">라운드</th><th>팀 예시</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                  {data.funding.tracks.slice(0, 8).map(t => (
                    <tr key={t.domain}>
                      <td className="font-semibold">{t.domain}</td>
                      <td className="tnum font-extrabold">{t.cnt}</td>
                      <td className="text-ink-sub">{t.rounds_label}</td>
                      <td className="text-ink-sub">{t.examples.slice(0, 2).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* 3) 재발주 그래프 */}
          <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h4 className="m-0 text-base font-bold text-ink">🔁 재발주 그래프 <span className="text-ink-sub">— 재게시 {data.reorder.repeated_cnt}건 · 폐업·해지 신호 {data.reorder.closure_failures}건</span></h4>
            <p className="m-0 mt-1 text-xs text-ink-faint">같은 제목이 다시 올라왔다 = 그 자리에 돈이 반복 지출된다는 뜻. 폐업·계약해지는 '시스템을 잃고 다시 사는' 발주입니다.</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub">
                    <th>안건 제목</th><th className="w-16">재게시</th><th className="w-24">채널</th><th className="w-24">예산합</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                  {data.reorder.top.map((g, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{g.title}</td>
                      <td className="tnum font-extrabold text-warning">{g.cnt}회</td>
                      <td className="text-ink-sub">{Object.keys(g.channels).join(", ")}</td>
                      <td className="tnum">{(g.budget_sum / 1e8).toFixed(2)}억</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* 4) 주간 추이 */}
          <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h4 className="m-0 text-base font-bold text-ink">📅 수집 주간 추이</h4>
            <p className="m-0 mt-1 text-xs text-ink-faint">{data.weekly.note}</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub">
                    <th>주차</th><th className="w-24">위시켓</th><th className="w-24">프리모아</th><th className="w-24">Devpost</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line [&>tr>td]:px-4 [&>tr>td]:py-2.5">
                  {data.weekly.recent_weeks.map(w => (
                    <tr key={w.week}>
                      <td className="tnum font-semibold">{w.week}</td>
                      <td className="tnum">{w.counts.wishket ?? 0}</td>
                      <td className="tnum">{w.counts.freemoa ?? 0}</td>
                      <td className="tnum">{(w.counts.devpost ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}
    </div>
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

/** 기회 공간 지도 — Tier A 8개 외의 하위 계층(Tier B·C·D) 롱리스트, 기본 접힘. 행 클릭 시 등급 사유·승격 조건 표시 */
function OpportunitySpace() {
  const [space, setSpace] = useState<OpportunityItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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
                        <Fragment key={item.id}>
                          <tr className="cursor-pointer hover:bg-surface2/60" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                            <td className="tnum font-extrabold text-ink-sub">{item.id}</td>
                            <td className="text-ink-sub">{item.domain}</td>
                            <td>
                              <div className="flex flex-wrap items-center gap-2">
                                <span aria-hidden="true" className="text-xs text-ink-faint">{expanded === item.id ? "▾" : "▸"}</span>
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
                          {expanded === item.id && (
                            <tr className="bg-surface2/40">
                              <td colSpan={tier === "D" ? 3 : 4} className="border-t border-line">
                                <div className="grid gap-2 py-1">
                                  {item.summary && (
                                    <p className="m-0 text-sm leading-relaxed text-ink"><strong className="font-extrabold">한 줄 요약: </strong>{item.summary}</p>
                                  )}
                                  {item.grade_reason && (
                                    <p className="m-0 text-sm leading-relaxed text-ink"><strong className="font-extrabold text-warning">📌 왜 이 등급인가: </strong>{item.grade_reason}</p>
                                  )}
                                  {item.promotion && (
                                    <p className="m-0 text-sm leading-relaxed text-ink"><strong className="font-extrabold text-primary">🚀 상위티어·출시급이 되려면: </strong>{item.promotion}</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
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
