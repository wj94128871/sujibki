/** 공통 도메인/응답 타입 (tech-design §7) */
export type Source = "wishket" | "freemoa" | "u300" | "devpost";
export type Confidence = "high" | "mid" | "low";

export interface SummaryData {
  total: number;
  lastRunAt: string | null;
  status: "success" | "partial" | "failed" | "none";
  bySource: Record<string, number>;
  recentRuns: { source: string; status: string; count: number; at: string }[];
}

export interface AnalysisData {
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
  id: string; source: string; runtime: string; title: string | null;
  budgetMin: number | null; budgetMax: number | null; budgetUnit: string;
  periodDays: number | null; category: string | null; registeredAt: string | null;
  applicants: number | null; sourceUrl: string;
}

export interface ProjectDetail extends ProjectItem {
  region: string | null; workType: string | null; role: string | null;
  level: string | null; techKeywords: string[];
  description: string | null;      // 크롤링 상세 본문
  recruitCondition: string | null; // 위시켓 모집 요건 등
}

export interface RunItem {
  id: number; source: string; runtime: string; status: string;
  total: number; success: number; failed: number; error: string | null;
  startedAt: string; finishedAt: string | null;
}

export interface AnalysisItem {
  id: string;
  rank: number;
  action: "add" | "reduce" | "pivot";       // 기능 추가 / 축소 / 방향 전환
  title: string;
  summary: string;
  opportunity: string;                        // 왜 유망한가
  market: string;                             // 타깃 시장/고객 (B2B/B2C/B2G)
  features: { name: string; desc: string; priority: "high" | "mid" | "low" }[];
  evidence: { metric: string; value: string }[];  // 데이터 근거
  risks: string[];
  confidence: Confidence;
}
