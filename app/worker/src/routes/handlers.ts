/** 엔드포인트 핸들러 (tech-design §7) — DataSource로부터 데이터를 읽어 API 응답 규격으로 변환.
 *  데이터 로직(집계)은 src/agg, 저장은 DataSource impl이 담당.
 */
import type { DataSource } from "../DataSource.js";
import type { ApiEnvelope } from "../util/error.js";
import { ok } from "../util/error.js";

function asInt(v: unknown, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : dflt;
}

export async function hSummary(ds: DataSource): Promise<ApiEnvelope<unknown>> {
  return ok(await ds.summary());
}
export async function hSources(ds: DataSource): Promise<ApiEnvelope<unknown>> {
  return ok(await ds.sources());
}
export async function hAnalysis(ds: DataSource, url: URL): Promise<ApiEnvelope<unknown>> {
  const source = url.searchParams.get("source") ?? "all";
  return ok(await ds.analysis(source));
}
export async function hInsights(ds: DataSource, url: URL): Promise<ApiEnvelope<unknown>> {
  const type = (url.searchParams.get("type") || undefined) as "feature" | "market" | undefined;
  return ok(await ds.insights(type));
}
export async function hProjects(ds: DataSource, url: URL): Promise<ApiEnvelope<unknown>> {
  const source = (url.searchParams.get("source") || undefined) as any;
  const category = url.searchParams.get("category") || undefined;
  const q = url.searchParams.get("q") || undefined;
  return ok(await ds.listProjects({
    source, category, q, page: asInt(url.searchParams.get("page"), 1), size: asInt(url.searchParams.get("size"), 20),
  }));
}
export async function hProjectDetail(ds: DataSource, id: string): Promise<ApiEnvelope<unknown>> {
  const detail = await ds.projectDetail(id);
  if (!detail) return { ok: false, error: { code: "NOT_FOUND", message: "project not found" } };
  return ok(detail);
}
export async function hAnalysisItems(ds: DataSource): Promise<ApiEnvelope<unknown>> {
  return ok(await ds.analysisItems());
}
export async function hRuns(ds: DataSource, url: URL): Promise<ApiEnvelope<unknown>> {
  const limit = asInt(url.searchParams.get("limit"), 50);
  return ok(await ds.runs(limit));
}
