/** Rust(WASM) 로드 브리지 — 빌드된 pkg 모듈이 실제 함수를 제공하면 Rust 사용,
 *  아니면 TS 폴백(tsFallback)을 사용(tech-design §1 TQ-2·§11 에픽3).
 *  두 구현이 동등 출력함을 test/agg.test.ts 로 검증한다.
 */
import * as fn from "./pkg/market_dashboard_wasm.js";
import * as fb from "./tsFallback.js";

const rust = fn as unknown as {
  rank_keywords?: (json: string, n: number) => string;
  budget_buckets?: (json: string, nullCount: number) => string;
  growth_rate?: (prev: number, cur: number) => number | null;
  sort_by_share?: (json: string) => string;
};
const READY = typeof rust.rank_keywords === "function";

export function rankKeywords(keywords: string[], topN = 30) {
  if (READY && rust.rank_keywords) return JSON.parse(rust.rank_keywords(JSON.stringify(keywords), topN));
  return fb.rankKeywords(keywords, topN);
}
export function budgetBuckets(values: (number | null)[], nullCount: number) {
  if (READY && rust.budget_buckets) return JSON.parse(rust.budget_buckets(JSON.stringify(values), nullCount));
  return fb.budgetBuckets(values, nullCount);
}
export function growthRate(prev: number, cur: number): number | null {
  if (READY && rust.growth_rate) return rust.growth_rate(prev, cur);
  return fb.growthRate(prev, cur);
}
export function sortByShare(cnt: Record<string, number>) {
  if (READY && rust.sort_by_share) return JSON.parse(rust.sort_by_share(JSON.stringify(cnt)));
  return fb.sortByShare(cnt);
}
export { fb };
