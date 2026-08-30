/** API fetch 래퍼 — 공통 envelope 해석 (tech-design §6.8) */
import type { Analysis, AnalysisItem, Insight, ProjectDetail, ProjectItem, RunItem, Summary } from "../types.js";
const BASE = (import.meta as any).env?.VITE_API ?? "https://market-dashboard-worker.whip-mockingbird.workers.dev";
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body.ok) throw new Error(body.error?.message ?? "API 오류");
  return body.data as T;
}
export const api = {
  summary: () => get<Summary>("/api/summary"),
  analysis: (source = "all") => get<Analysis>(`/api/analysis?source=${source}`),
  insights: () => get<Insight[]>("/api/insights"),
  projects: (params: Record<string, string>) => get<{ items: ProjectItem[]; total: number }>(
    `/api/projects?${new URLSearchParams(params).toString()}`),
  project: (id: string) => get<ProjectDetail>(`/api/projects/${id}`),
  runs: () => get<RunItem[]>("/api/runs"),
  analysisItems: () => get<AnalysisItem[]>("/api/analysis/items"),
};
