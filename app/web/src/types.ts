export type Source = "wishket" | "freemoa" | "u300" | "devpost" | "idea";
export type Confidence = "high" | "mid" | "low";
export interface Summary {
  total: number; lastRunAt: string | null; status: "success" | "partial" | "failed" | "none";
  bySource: Record<string, number>;
  recentRuns: { source: string; status: string; count: number; at: string }[];
}
export interface Analysis {
  categories: { source: string; name: string; cnt: number; sharePct: number }[];
  budget: { histogram: { bucket: string; count: number }[]; nullCount: number; unit: string };
  period: { histogram: { bucket: string; count: number }[]; nullCount: number };
  workType: Record<string, number>;
  keywords: { keyword: string; cnt: number; prevCnt: number | null; growthRate: number | null }[];
  monthly: { month: string; cnt: number }[];
}
export interface Insight {
  type: "category" | "keyword" | "feature" | "market";
  title: string; body: string; metric: Record<string, unknown>;
  period: string; confidence: Confidence;
}
export interface ProjectItem {
  id: string; source: Source; runtime: string; title: string | null;
  budgetMin: number | null; budgetMax: number | null; budgetUnit: string;
  periodDays: number | null; category: string | null; registeredAt: string | null;
  applicants: number | null; sourceUrl: string;
}
export interface ProjectDetail extends ProjectItem {
  region: string | null; workType: string | null; role: string | null; level: string | null; techKeywords: string[];
  description: string | null; recruitCondition: string | null;
}
export interface RunItem {
  id: number; source: string; runtime: string; status: string; total: number;
  success: number; failed: number; error: string | null; startedAt: string; finishedAt: string | null;
}
export interface AnalysisItem {
  id: string; rank: number;
  action: "add" | "reduce" | "pivot" | "watch";
  title: string; summary: string; opportunity: string; market: string;
  features: { name: string; desc: string; priority: "high" | "mid" | "low" }[];
  evidence: { metric: string; value: string }[];
  risks: string[]; confidence: Confidence;
  direction_change?: string;
  expected_effect?: string;
}
/** 기회 공간 지도 항목 — Tier B(도메인 수직)/C(글로벌 전이)/D(관망·기각) 롱리스트 */
export interface OpportunityItem {
  id: string; tier: "B" | "C" | "D"; domain: string; title: string; form: string;
  priority: "high" | "mid" | "low";
  evidence: string;
  trigger?: string | null;
  /** 상세 분석 — 한 줄 요약 / 왜 이 등급인가 / 상위티어·출시급 승격 조건 */
  summary?: string;
  grade_reason?: string;
  promotion?: string;
}
/** 고도화 분석 (PART 9.5) — scripts/analyze_enhanced.py 산출물 */
export interface EnhancedAnalysis {
  generated_at: string; total: number;
  gap_quadrant: {
    gl_total: number;
    themes: { theme: string; global_cnt: number; global_share_pct: number; kr_cnt: number; kr_budget_sum: number; quadrant: "Q1" | "Q2" | "Q3" | "Q4"; note: string }[];
    c_candidates: { theme: string }[];
  };
  funding: {
    total_rounds: number;
    by_round: Record<string, number>;
    tracks: { domain: string; cnt: number; rounds_label: string; examples: string[] }[];
  };
  reorder: {
    repeated_cnt: number; closure_failures: number;
    top: { title: string; cnt: number; budget_sum: number; channels: Record<string, number> }[];
  };
  weekly: {
    note: string;
    recent_weeks: { week: string; counts: Record<string, number> }[];
  };
}
