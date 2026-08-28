/** 숫자/날짜/예산 포맷 (design-system §2·§3.6 — tabular-nums·만원→원/월) */
export function formatMoney(v: number | null, unit = "KRW"): string {
  if (v == null) return "정보 없음";
  const wan = v / 10000;
  const base = wan >= 10000 ? `${(wan / 10000).toFixed(1)}억` : `${wan.toLocaleString()}만`;
  return unit === "KRW_MONTH" ? `${base}/월` : `${base}원`;
}
export function formatNumber(v: number | null): string {
  return v == null ? "정보 없음" : v.toLocaleString();
}
export function formatDate(iso: string | null): string {
  if (!iso) return "정보 없음";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "정보 없음";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function formatPeriod(days: number | null): string {
  if (days == null) return "정보 없음";
  if (days < 30) return `${days}일`;
  if (days < 365) return `${Math.round(days / 30)}개월`;
  return `${(days / 365).toFixed(1)}년`;
}
// 신뢰도 라벨 (design-system §1.5)
export function confidenceLabel(c: string): string {
  const map: Record<string, string> = { high: "높음", mid: "중간", low: "낮음" };
  return map[c] ?? c;
}
