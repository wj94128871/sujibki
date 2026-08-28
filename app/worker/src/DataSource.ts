/** 데이터 소스 추상화 — NeonDataSource(프로덕션) · MemoryDataSource(테스트 픽스처).
 *  라우트 핸들러는 이 인터페이스만 의존해 순수하게 테스트 가능하다.
 */
import type { AnalysisData, AnalysisItem, Insight, ProjectDetail, ProjectItem, RunItem, Source, SummaryData } from "./types.js";

export interface ListParams { source?: Source; runtime?: string; page: number; size: number; q?: string; category?: string }
export interface DataSource {
  summary(): Promise<SummaryData>;
  sources(): Promise<{ key: string; label: string; group: string; count: number; lastRun: string | null }[]>;
  analysis(source?: string): Promise<AnalysisData>;
  insights(type?: "feature" | "market" | "category" | "keyword"): Promise<Insight[]>;
  listProjects(p: ListParams): Promise<{ items: ProjectItem[]; total: number; page: number; size: number }>;
  projectDetail(id: string): Promise<ProjectDetail | null>;
  runs(limit?: number): Promise<RunItem[]>;
  analysisItems(): Promise<AnalysisItem[]>;
}
