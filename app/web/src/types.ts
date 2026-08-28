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
  action: "add" | "reduce" | "pivot";
  title: string; summary: string; opportunity: string; market: string;
  features: { name: string; desc: string; priority: "high" | "mid" | "low" }[];
  evidence: { metric: string; value: string }[];
  risks: string[]; confidence: Confidence;
}
