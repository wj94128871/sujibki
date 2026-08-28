/** 프로덕션 데이터 소스 — Neon(PostgreSQL) 조회 (tech-design §5.1·§7).
 *  읽기 전용 계정(DB_URL_RO) 사용. Precompute 테이블 조회로 원본 대량 스캔 회피(ADR-2).
 */
import { neon } from "@neondatabase/serverless";
import type { DataSource, ListParams } from "./DataSource.js";
import type { AnalysisData, AnalysisItem, Insight, ProjectDetail, ProjectItem, RunItem, SummaryData } from "./types.js";

export class NeonDataSource implements DataSource {
  private sql: any;
  constructor(dsn: string) { this.sql = neon(dsn); }

  async summary(): Promise<SummaryData> {
    const rows = await this.sql`SELECT source, COUNT(*) c FROM projects GROUP BY source`;
    const last = await this.sql`SELECT source,status,total,started_at FROM collection_runs ORDER BY started_at DESC LIMIT 5`;
    const bySource: Record<string, number> = {};
    for (const r of rows as any[]) bySource[r.source] = Number(r.c);
    const recentRuns = (last as any[]).map((r: any) => ({ source: r.source, status: r.status, count: Number(r.total), at: String(r.started_at) }));
    const status: SummaryData["status"] = recentRuns[0]?.status === "success" ? "success" : recentRuns[0]?.status ?? "none";
    return { total: Object.values(bySource).reduce((a, b) => a + b, 0), lastRunAt: recentRuns[0]?.at ?? null, status, bySource, recentRuns };
  }
  async sources() {
    const r = await this.sql`SELECT source, COUNT(*) c, MAX(started_at) last FROM collection_runs GROUP BY source`;
    const groups: Record<string, string> = { wishket: "si_contract", freemoa: "si_contract", u300: "startup", devpost: "hackathon" };
    const labels: Record<string, string> = { wishket: "위시켓 도급", freemoa: "프리모아 도급", u300: "u300 공모", devpost: "해커톤" };
    return (r as any[]).map((x: any) => ({ key: x.source, label: labels[x.source] ?? x.source, group: groups[x.source] ?? "other", count: Number(x.c), lastRun: x.last ? String(x.last) : null }));
  }
  async analysis(source = "all"): Promise<AnalysisData> {
    const cats = await this.sql`SELECT category, SUM(cnt) total FROM analysis_category GROUP BY category ORDER BY total DESC`;
    const bud = await this.sql`SELECT * FROM analysis_budget`;
    const kw = await this.sql`SELECT * FROM analysis_keyword ORDER BY cnt DESC LIMIT 30`;
    const monthly = await this.sql`SELECT to_char(date_trunc('month', registered_at),'YYYY-MM') m, COUNT(*) c FROM projects WHERE registered_at IS NOT NULL GROUP BY 1 ORDER BY 1`;
    return {
      categories: (cats as any[]).map((c: any) => ({ source: "all", name: c.category, cnt: Number(c.total), sharePct: 0 })),
      budget: { histogram: bud.filter((b: any) => !b.bucket.startsWith("(null")).map((b: any) => ({ bucket: b.bucket, count: Number(b.cnt) })),
        nullCount: bud.filter((b: any) => b.bucket.startsWith("(null")).reduce((a: number, b: any) => a + Number(b.cnt), 0), unit: "KRW" },
      period: { histogram: [], nullCount: 0 },
      workType: {},
      keywords: (kw as any[]).map((k: any) => ({ keyword: k.keyword, cnt: Number(k.cnt),
        prevCnt: k.prev_cnt != null ? Number(k.prev_cnt) : null,
        growthRate: k.growth_rate != null ? Number(k.growth_rate) : null })),
      monthly: monthly.map((m: any) => ({ month: m.m, cnt: Number(m.c) })),
    };
  }
  async insights(type?: "feature" | "market" | "category" | "keyword"): Promise<Insight[]> {
    const rows = await this.sql`SELECT * FROM analysis_insights ORDER BY created_at DESC LIMIT 50`;
    return (rows as Insight[]).filter(i => !type || i.type === type || type === "market");
  }
  async listProjects(p: ListParams) {
    const where: string[] = [];
    const args: unknown[] = [];
    if (p.source) { args.push(p.source); where.push(`source = $${args.length}`); }
    if (p.category) { args.push(p.category); where.push(`category = $${args.length}`); }
    if (p.q) { args.push(`%${p.q}%`); where.push(`title ILIKE $${args.length}`); }
    const w = where.length ? "WHERE " + where.join(" AND ") : "";
    const countRows: any = await (this.sql as any)(`SELECT COUNT(*) c FROM projects ${w}`, args);
    const total = countRows[0].c;
    const offset = (p.page - 1) * p.size;
    const dataArgs = [...args, p.size, offset];
    const limitIdx = args.length + 1;
    const offsetIdx = args.length + 2;
    const rows: any = await (this.sql as any)(`SELECT * FROM projects ${w} ORDER BY registered_at DESC NULLS LAST LIMIT $${limitIdx} OFFSET $${offsetIdx}`, dataArgs);
    const items: ProjectItem[] = rows.map((r: any) => ({ id: String(r.id), source: r.source, runtime: r.runtime, title: r.title, budgetMin: r.budget_min != null ? Number(r.budget_min) : null, budgetMax: r.budget_max != null ? Number(r.budget_max) : null, budgetUnit: r.budget_unit, periodDays: r.period_days, category: r.category, registeredAt: r.registered_at, applicants: r.applicants, sourceUrl: r.source_url }));
    return { items, total: Number(total), page: p.page, size: p.size };
  }
  async projectDetail(id: string): Promise<ProjectDetail | null> {
    const r = (await this.sql`SELECT * FROM projects WHERE id = ${Number(id)}`)[0];
    let desc: string | null = null, recruit: string | null = null;
    if (r?.raw_json) { try { const raw = typeof r.raw_json === 'string' ? JSON.parse(r.raw_json) : r.raw_json; desc = raw.description ?? raw.desc ?? null; recruit = raw.recruit_condition ?? raw.recruitCondition ?? null; } catch {} }
    return r ? { id: String(r.id), source: r.source, runtime: r.runtime, title: r.title, budgetMin: r.budget_min != null ? Number(r.budget_min) : null, budgetMax: r.budget_max != null ? Number(r.budget_max) : null, budgetUnit: r.budget_unit, periodDays: r.period_days, category: r.category, registeredAt: r.registered_at, applicants: r.applicants, sourceUrl: r.source_url, region: r.region, workType: r.work_type, role: r.role, level: r.level, techKeywords: r.tech_keywords || [], description: desc, recruitCondition: recruit } : null;
  }
  async analysisItems(): Promise<AnalysisItem[]> {
    return (await import("./analysis_items.json", { with: { type: "json" } })).default as AnalysisItem[];
  }
  async runs(limit = 50): Promise<RunItem[]> {
    const rows = await this.sql`SELECT * FROM collection_runs ORDER BY started_at DESC LIMIT ${limit}`;
    return rows.map((r: any) => ({ id: Number(r.id), source: r.source, runtime: r.runtime, status: r.status, total: Number(r.total), success: Number(r.success), failed: Number(r.failed), error: r.error, startedAt: String(r.started_at), finishedAt: r.finished_at ? String(r.finished_at) : null }));
  }
}
