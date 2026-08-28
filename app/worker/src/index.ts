/** Cloudflare Worker 진입점 (Epic3 · tech-design §7) — 라우팅·캐시·CORS·에러 규격.
 *  데이터소스는 NeonDataSource(프로덕션)로 교체 가능(프로덕션 배포 시). 여기선 Env.DS로 주입.
 */
import { DataSource } from "./DataSource.js";
import seedProjects from "./seed_projects.json" with { type: "json" };
import seedRuns from "./seed_runs.json" with { type: "json" };
import { MemoryDataSource } from "./MemoryDataSource.js";
import { NeonDataSource } from "./NeonDataSource.js";
import { hAnalysis, hAnalysisItems, hInsights, hProjectDetail, hProjects, hRuns, hSources, hSummary } from "./routes/handlers.js";
import { httpStatus, type ApiEnvelope } from "./util/error.js";

export interface Env {
  DB_URL_RO: string;
  CACHE_TTL?: string; // 초
}

function corsHeaders(): Record<string, string> {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}

// 캐시 무효화를 위한 집계 응답 태그 (수집 후 PURGE 신호 — Phase2 Cron)
const CACHEABLE = ["/api/summary", "/api/sources", "/api/analysis", "/api/insights"];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

    let ds: DataSource;
    if (env.DB_URL_RO) ds = new NeonDataSource(env.DB_URL_RO);
    else ds = new MemoryDataSource(seedProjects as any, seedRuns as any); // 로컬/demo (새 수집분 2,848건 시드)

    let payload: ApiEnvelope<unknown>;
    try {
      const path = url.pathname;
      if (path === "/api/summary") payload = await hSummary(ds);
      else if (path === "/api/sources") payload = await hSources(ds);
      else if (path === "/api/analysis") payload = await hAnalysis(ds, url);
      else if (path === "/api/insights") payload = await hInsights(ds, url);
      else if (path === "/api/projects") payload = await hProjects(ds, url);
      else if (path.startsWith("/api/projects/")) payload = await hProjectDetail(ds, path.split("/")[3] || "");
      else if (path === "/api/runs") payload = await hRuns(ds, url);
      else if (path === "/api/analysis/items") payload = await hAnalysisItems(ds);
      else if (path === "/api/crawl/trigger" && request.method === "POST") {
        // Phase2 Cron → 외부 러너 신호 (MVP는 on-demand+이력)
        payload = { ok: true, data: { scheduled: false, note: "Phase2" } };
      }
      else payload = { ok: false, error: { code: "NOT_FOUND", message: "unknown endpoint" } };
    } catch (e) {
      payload = { ok: false, error: { code: "DB_ERROR", message: (e as Error).message } };
    }

    const status = payload.ok ? 200 : httpStatus(payload.error?.code ?? "INTERNAL");
    const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() };
    if (payload.ok && CACHEABLE.includes(url.pathname)) {
      headers["Cache-Control"] = `public, s-maxage=${env.CACHE_TTL ?? "300"}`;
    }
    return new Response(JSON.stringify(payload), { status, headers });
  },
};
