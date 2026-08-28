import { useState } from "react";
import type { Analysis } from "../types.js";
import { DonutChart, HBarChart, HistogramChart, LineAreaChart, RankedBars } from "../charts/index.js";
import { Empty, Section, Skeleton } from "../components/ui.js";
import { computeMoM } from "../util/trends.js";

const METRICS = ["신규 등록", "누적"] as const;

function loadingCards() {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <Skeleton className="w-[42%]" />
          <Skeleton className="mt-5 h-45" />
        </div>
      ))}
    </div>
  );
}

export function AnalysisSection({ analysis }: { analysis: Analysis | null }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]>("신규 등록");

  if (!analysis) {
    return (
      <Section id="analysis" title="시장조사 분석" kicker="Market signals" description="수요의 구성과 흐름을 한 화면에서 비교합니다.">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card"><Skeleton className="h-65" /></div>
        {loadingCards()}
      </Section>
    );
  }

  const monthly = analysis.monthly;
  const labels = monthly.map(item => item.month);
  const monthlyValues = monthly.map(item => item.cnt);
  const values = metric === "신규 등록" ? monthlyValues : cumsum(monthlyValues);
  const compare = values.map((_, index) => index === 0 ? 0 : values[index - 1]);
  const delta = computeMoM(monthlyValues);
  const peak = values.length > 1 ? values.indexOf(Math.max(...values)) : -1;
  const categoryRows = analysis.categories.slice(0, 8).map(category => ({ label: category.name, value: category.cnt }));
  const budgetRows = analysis.budget.histogram.map((item, index) => ({ label: item.bucket, value: item.count, color: `var(--chart-${(index % 6) + 1})` }));
  const periodRows = analysis.period.histogram.map((item, index) => ({ label: item.bucket, value: item.count, color: `var(--chart-${((index + 2) % 6) + 1})` }));
  const workTypeRows = Object.entries(analysis.workType).map(([label, value]) => ({ label, value }));
  const budgetSample = analysis.budget.histogram.reduce((sum, item) => sum + item.count, 0);
  const periodSample = analysis.period.histogram.reduce((sum, item) => sum + item.count, 0);

  return (
    <Section
      id="analysis"
      title="시장조사 분석"
      kicker="Market signals"
      description="카테고리·예산·기간·근무형태·키워드의 수요 구조와 월간 흐름을 비교합니다."
      action={<span className="text-sm text-ink-sub">최근 증감 <strong className="tnum text-ink">{delta == null ? "-" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}</strong></span>}
    >
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card md:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="m-0 text-lg font-bold tracking-tight text-ink">월간 등록 추이</h3>
            <p className="mt-1 mb-0 text-sm text-ink-sub">현재 기간과 직전 기간을 겹쳐 시장의 방향을 확인합니다.</p>
            <p className="mt-1 mb-0 text-xs text-ink-faint">등록일이 공개된 안건만 반영됩니다.</p>
          </div>
          <div role="group" aria-label="추이 지표 선택" className="flex flex-wrap gap-2">
            {METRICS.map(item => (
              <button key={item} aria-pressed={metric === item} onClick={() => setMetric(item)}
                className={`min-h-9 rounded-lg px-3 text-sm transition-colors duration-150 ${
                  metric === item
                    ? "bg-primary-soft font-bold text-primary"
                    : "border border-line bg-surface text-ink-sub hover:border-line-strong hover:text-ink"
                }`}>
                {item}
              </button>
            ))}
          </div>
        </div>
        {labels.length === 0
          ? <Empty title="월간 데이터 부족" hint="수집 데이터가 누적되면 추이가 표시됩니다." />
          : <LineAreaChart title={`월간 ${metric} 추이`} labels={labels} values={values} compare={compare} compareLabels={[metric, "직전 기간"]} annotations={peak >= 0 ? [{ index: peak, label: "고점" }] : []} />}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h3 className="m-0 text-lg font-bold tracking-tight text-ink">카테고리 수요 점유율</h3>
          <p className="mt-1 mb-0 text-sm text-ink-sub">상위 카테고리 기준 · 전체 {analysis.categories.reduce((sum, item) => sum + item.cnt, 0).toLocaleString()}건</p>
          <div className="mt-4"><DonutChart title="카테고리 수요 점유율" slices={categoryRows} /></div>
          {analysis.categories.length > 0 && (() => {
            const total = analysis.categories.reduce((sum, item) => sum + item.cnt, 0) || 1;
            const top = analysis.categories.slice(0, 5);
            return (
              <ul className="mt-4 space-y-1.5">
                {top.map(cat => {
                  const pct = ((cat.cnt / total) * 100);
                  return (
                    <li key={cat.name} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-ink">{cat.name}</span>
                      <span className="tnum font-extrabold text-ink">{cat.cnt.toLocaleString()}</span>
                      <span className="tnum w-14 text-right text-ink-sub">{pct.toFixed(1)}%</span>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </article>
        <article className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h3 className="m-0 text-lg font-bold tracking-tight text-ink">상주 vs 도급</h3>
          <p className="mt-1 mb-0 text-sm text-ink-sub">근무 형태별 안건 수</p>
          <div className="mt-6"><HBarChart title="상주 및 도급 안건 분포" rows={workTypeRows} /></div>
          {workTypeRows.length === 0 && <Empty title="근무 형태 데이터 없음" hint="원천 데이터의 유형 필드가 채워지면 표시됩니다." />}
        </article>
        <article className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-lg font-bold tracking-tight text-ink">예산 분포</h3>
            <CoverageBadge sample={budgetSample} missing={analysis.budget.nullCount} />
          </div>
          <p className="mt-1 mb-0 text-sm text-ink-sub">예산 단위 · {analysis.budget.unit}</p>
          <div className="mt-6"><HistogramChart title="예산 구간 분포" rows={budgetRows} /></div>
          {analysis.budget.nullCount > 0 && <p className="mt-3 mb-0 text-xs text-ink-faint">예산 정보 없음 {analysis.budget.nullCount.toLocaleString()}건은 분포에서 제외했습니다.</p>}
        </article>
        <article className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-lg font-bold tracking-tight text-ink">기간 분포</h3>
            <CoverageBadge sample={periodSample} missing={analysis.period.nullCount} />
          </div>
          <p className="mt-1 mb-0 text-sm text-ink-sub">프로젝트 예상 기간 · 일 기준</p>
          <div className="mt-6"><HistogramChart title="프로젝트 기간 분포" rows={periodRows} /></div>
          {analysis.period.nullCount > 0 && <p className="mt-3 mb-0 text-xs text-ink-faint">기간 정보 없음 {analysis.period.nullCount.toLocaleString()}건은 분포에서 제외했습니다.</p>}
        </article>
        <article className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card md:col-span-2">
          <h3 className="m-0 text-lg font-bold tracking-tight text-ink">기술 키워드 랭킹</h3>
          <p className="mt-1 mb-0 text-sm text-ink-sub">안건에 함께 등장한 기술 키워드 상위 8개</p>
          <div className="mt-6"><RankedBars title="기술 키워드 랭킹" rows={analysis.keywords.map(item => ({ label: item.keyword, value: item.cnt, growthRate: item.growthRate }))} /></div>
        </article>
      </div>
    </Section>
  );
}

function cumsum(values: number[]) {
  let total = 0;
  return values.map(value => total += value);
}

function CoverageBadge({ sample, missing }: { sample: number; missing: number }) {
  if (missing <= 0) return null;
  const total = sample + missing;
  const pct = total > 0 ? Math.round((sample / total) * 100) : 0;
  const tone = pct < 50
    ? "text-warning border-warning/60 bg-warning/10"
    : "text-success border-success/60 bg-success/8";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      표본 {sample.toLocaleString()} / {total.toLocaleString()}건 ({pct}%)
    </span>
  );
}
