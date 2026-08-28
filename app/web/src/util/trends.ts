/** 트렌드/증감 계산 (design-research: 모든 증감은 부호+색+전기간 기준) */
import type { Source } from "../types.js";
export const SOURCE_COLORS: Record<Source | "all", string> = {
  all: "var(--primary)", wishket: "var(--source-wishket)", freemoa: "var(--source-freemoa)",
  u300: "var(--source-u300)", devpost: "var(--source-devpost)", idea: "var(--source-idea, var(--primary))",
};
export const SOURCE_LABEL: Record<Source, string> = {
  wishket: "위시켓 도급", freemoa: "프리모아 도급", u300: "u300 공모", devpost: "Devpost 해커톤", idea: "💡 분석 아이디어",
};
export const SOURCE_KEYS = ["wishket", "freemoa", "u300", "devpost", "idea"] as const;

/** 전기간 vs 이전 기간 증감(%): 전기간 <=0 → null(계산 불가, "—" 표기) */
export function computeMoM(series: number[]): number | null {
  if (series.length < 2) return null;
  const cur = series[series.length - 1];
  const prev = series[series.length - 2] ?? 0;
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}
export function sign(v: number | null): "up" | "down" | "flat" {
  if (v == null || Math.abs(v) < 0.05) return "flat";
  return v > 0 ? "up" : "down";
}
export function formatDelta(v: number | null): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
