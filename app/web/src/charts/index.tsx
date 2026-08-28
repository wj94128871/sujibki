/**
 * 번들 내장 SVG 차트. 모든 차트는 시각화와 함께 표 형태의 대체 정보를 제공한다.
 */
export interface Row {
  label: string;
  value: number;
  color?: string;
}

export interface RankedRow extends Row {
  growthRate?: number | null;
}

function SrTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <thead><tr><th scope="col">항목</th><th scope="col">수치</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.label}><td>{r.label}</td><td>{r.value.toLocaleString()}</td></tr>)}</tbody>
    </table>
  );
}

/** KPI 카드용 미니 추이선. */
export function Sparkline({ values, width = 96, height = 28, color = "var(--primary)", className }: {
  values: number[]; width?: number; height?: number; color?: string; className?: string;
}) {
  if (values.length < 2) return <span aria-hidden="true" />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * (width - 2) + 1;
    const y = height - 2 - ((value - min) / Math.max(max - min, 1)) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} role="img" aria-label="최근 기간 추이" className={`tnum ${className ?? ""}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 메인 트렌드 차트: 현재 시리즈와 직전 기간 비교 시리즈를 함께 보여준다. */
export function LineAreaChart({ title, labels, values, compare, compareLabels, annotations = [] }: {
  title: string;
  labels: string[];
  values: number[];
  compare?: number[];
  compareLabels?: string[];
  annotations?: { index: number; label: string }[];
}) {
  const W = 1200;
  const H = 320;
  const padL = 56;
  const padR = 20;
  const padT = 24;
  const padB = 38;
  const all = compare ? [...values, ...compare] : values;
  const max = Math.max(...all, 1);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const x = (index: number) => padL + (index / Math.max(labels.length - 1, 1)) * plotW;
  const y = (value: number) => padT + plotH - (value / max) * plotH;
  const line = (series: number[]) => series.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const area = (series: number[]) => `${padL},${padT + plotH} ${line(series)} ${x(series.length - 1).toFixed(1)},${padT + plotH}`;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={title} width="100%">
        <defs>
          <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity=".16" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, .25, .5, .75, 1].map((fraction) => (
          <g key={fraction}>
            <line x1={padL} x2={W - padR} y1={padT + plotH * (1 - fraction)} y2={padT + plotH * (1 - fraction)} stroke="var(--app-border)" strokeDasharray="3 7" />
            <text x={padL - 10} y={padT + plotH * (1 - fraction) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)">{Math.round(max * fraction).toLocaleString()}</text>
          </g>
        ))}
        {compare && compare.length > 0 && <>
          <polyline points={line(compare)} fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeDasharray="5 6" />
        </>}
        <polygon points={area(values)} fill="url(#hero-fill)" />
        <polyline points={line(values)} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((value, index) => (
          <circle key={`${labels[index]}-${value}`} cx={x(index)} cy={y(value)} r="3" fill="var(--app-surface)" stroke="var(--primary)" strokeWidth="2" />
        ))}
        {annotations.map(annotation => (
          <g key={`${annotation.index}-${annotation.label}`}>
            <line x1={x(annotation.index)} x2={x(annotation.index)} y1={padT} y2={padT + plotH} stroke="var(--warning)" strokeWidth="1.5" strokeDasharray="3 4" />
            <text x={x(annotation.index)} y={padT - 8} textAnchor="middle" fontSize="11" fill="var(--warning)">{annotation.label}</text>
          </g>
        ))}
        <text x={padL} y={H - 10} fontSize="11" fill="var(--text-3)">{labels[0] ?? ""}</text>
        <text x={W - padR} y={H - 10} textAnchor="end" fontSize="11" fill="var(--text-3)">{labels[labels.length - 1] ?? ""}</text>
      </svg>
      {compare && compareLabels && (
        <ul className="m-3 mb-0 flex list-none flex-wrap gap-4 p-0 text-xs text-ink-sub" aria-label="차트 범례">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-[3px] w-2.5 shrink-0 rounded-xs" style={{ background: "var(--primary)" }} />
            {compareLabels[0] ?? "현재"}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0 w-2.5 shrink-0 border-t-2 border-dashed border-ink-faint" />
            {compareLabels[1] ?? "이전 기간"}
          </li>
        </ul>
      )}
      <SrTable title={title} rows={labels.map((label, index) => ({ label, value: values[index] ?? 0 }))} />
    </figure>
  );
}

const BAR_ROW = "grid grid-cols-[92px_minmax(0,1fr)_64px] items-center gap-2 md:grid-cols-[120px_minmax(0,1fr)_72px] md:gap-3";
const BAR_LABEL = "overflow-hidden truncate text-sm whitespace-nowrap text-ink-sub";
const BAR_VAL = "tnum text-right text-sm text-ink";

function BarList({ rows, title, variant = "default" }: { rows: Row[]; title: string; variant?: "default" | "histogram" }) {
  const max = Math.max(...rows.map(row => row.value), 1);
  const trackCls = variant === "histogram"
    ? "h-[18px] overflow-hidden rounded-xs bg-surface2"
    : "h-2.5 overflow-hidden rounded-full bg-surface2";
  return (
    <figure className="m-0">
      <div role="img" aria-label={title} className="flex flex-col gap-3">
        {rows.length === 0 && <p className="m-0 rounded-lg bg-surface2 px-4 py-3 text-sm text-ink-sub">데이터 없음</p>}
        {rows.map(row => (
          <div className={BAR_ROW} key={row.label}>
            <span className={BAR_LABEL} title={row.label}>{row.label}</span>
            <div className={trackCls}>
              <div className="h-full min-w-0.5 transition-[width] duration-300 ease-out"
                style={{ width: `${(row.value / max) * 100}%`, background: row.color || "var(--primary)", borderRadius: "inherit" }} />
            </div>
            <span className={BAR_VAL}>{row.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <SrTable title={title} rows={rows} />
    </figure>
  );
}

/** 소스·상주 유형 등 범주 비교용 가로 바 차트. */
export function HBarChart({ rows, title = "범주별 분포" }: { rows: Row[]; title?: string }) {
  return <BarList rows={rows} title={title} />;
}

/** 예산·기간 구간 분포용 차트. */
export function HistogramChart({ rows, title }: { rows: Row[]; title: string }) {
  return <BarList rows={rows} title={title} variant="histogram" />;
}

/** 키워드 순위용 차트. */
export function RankedBars({ rows, title }: { rows: RankedRow[]; title: string }) {
  const ranked = [...rows].sort((a, b) => b.value - a.value).slice(0, 8);
  return (
    <figure className="m-0">
      <div role="img" aria-label={title} className="flex flex-col gap-3">
        {ranked.length === 0 && <p className="m-0 rounded-lg bg-surface2 px-4 py-3 text-sm text-ink-sub">데이터 없음</p>}
        {ranked.map((row, index) => {
          const max = ranked[0]?.value || 1;
          return (
            <div className={BAR_ROW} key={row.label}>
              <span className={BAR_LABEL} title={row.label}>{index + 1}. {row.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface2">
                <div className="h-full min-w-0.5 transition-[width] duration-300 ease-out"
                  style={{ width: `${(row.value / max) * 100}%`, background: `var(--chart-${(index % 6) + 1})`, borderRadius: "inherit" }} />
              </div>
              <span className={BAR_VAL}>{row.value.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      <SrTable title={title} rows={ranked} />
    </figure>
  );
}

/** 점유율 표현에 한정한 도넛 차트. */
export function DonutChart({ title, slices, size = 164 }: { title: string; slices: Row[]; size?: number }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = 34;
  const center = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  const arcs = slices.map((slice, index) => {
    const fraction = slice.value / total;
    const dash = fraction * circumference;
    const arc = {
      ...slice,
      dash,
      offset: circumference * (1 - accumulated),
      color: slice.color || `var(--chart-${(index % 8) + 1})`,
    };
    accumulated += fraction;
    return arc;
  });
  return (
    <figure className="m-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${title}, 전체 ${total.toLocaleString()}건`} className="self-center md:self-auto">
          <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--app-surface-2)" strokeWidth="14" />
          {arcs.map(arc => <circle key={arc.label} cx={center} cy={center} r={radius} fill="none" stroke={arc.color} strokeWidth="14" strokeDasharray={`${arc.dash} ${circumference - arc.dash}`} strokeDashoffset={-arc.offset} transform="rotate(-90 50 50)" />)}
          <text x="50" y="47" textAnchor="middle" fontSize="7" fill="var(--text-3)">전체</text>
          <text x="50" y="57" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-1)">{total.toLocaleString()}</text>
        </svg>
        <ul aria-label={`${title} 범례`}
          className="m-0 grid w-full flex-1 list-none gap-2 p-0 text-xs text-ink-sub md:w-auto [&>li]:grid [&>li]:grid-cols-[10px_minmax(0,1fr)_auto] [&>li]:items-center [&>li]:gap-1.5 [&>li>strong]:tnum [&>li>strong]:font-bold [&>li>strong]:text-ink">
          {arcs.map(arc => (
            <li key={arc.label}>
              <span aria-hidden="true" className="inline-block h-[3px] w-2.5 shrink-0 rounded-xs" style={{ background: arc.color }} />
              <span>{arc.label}</span>
              <strong>{arc.value.toLocaleString()}</strong>
            </li>
          ))}
        </ul>
      </div>
      <SrTable title={title} rows={slices} />
    </figure>
  );
}
