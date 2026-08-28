/** 순수 집계 유틸 — Rust(WASM)와 동등한 TS 폴백 (tech-design §1 TQ-2, §11 에픽3).
 *  모든 함수는 순수(pure). wasmBridge가 Rust 로드 실패 시 이 구현을 사용.
 */
export interface Row { [k: string]: unknown }

export function rankKeywords(keywords: string[], topN = 30): { keyword: string; cnt: number }[] {
  const c = new Map<string, number>();
  for (const k of keywords) if (k) c.set(k, (c.get(k) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN)
    .map(([keyword, cnt]) => ({ keyword, cnt }));
}

export function budgetBuckets(values: (number | null)[], nullCount: number):
  { bucket: string; count: number }[] {
  const c = new Map<string, number>();
  for (const v of values) {
    if (v == null) continue;
    const m = v / 10_000;
    const b = m < 500 ? "0-500만" : m < 1000 ? "500-1000만" : m < 3000 ? "1000-3000만"
      : m < 5000 ? "3000-5000만" : "5000만+";
    c.set(b, (c.get(b) ?? 0) + 1);
  }
  const rows = [...c.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, count]) => ({ bucket, count }));
  if (nullCount > 0) rows.push({ bucket: `(null ${nullCount})`, count: nullCount });
  return rows;
}

export function growthRate(prev: number, cur: number): number | null {
  if (prev == null || prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export function sortByShare(cnt: Record<string, number>): { key: string; cnt: number; sharePct: number }[] {
  const total = Object.values(cnt).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(cnt).map(([key, v]) => ({
    key, cnt: v, sharePct: Math.round((v / total) * 1000) / 10,
  })).sort((a, b) => b.cnt - a.cnt);
}
