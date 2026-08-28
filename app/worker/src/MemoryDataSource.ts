/** 테스트/데모용 인메모리 데이터 소스 — Neon 없이 API 로직 검증. */
import type { AnalysisData, AnalysisItem, Insight, ProjectDetail, ProjectItem, RunItem, Source, SummaryData, Confidence } from "./types.js";
import analysisItemsData from "./analysis_items.json" with { type: "json" };
import seedKeywordsData from "./seed_keywords.json" with { type: "json" };
import type { DataSource, ListParams } from "./DataSource.js";
import { sortByShare as fbSortByShare, budgetBuckets as fbBudgetBuckets, rankKeywords as fbRankKeywords } from "./agg/tsFallback.js";

interface SeedKeywordStat { keyword: string; cnt: number; prevCnt: number | null; growthRate: number | null; }
const KEYWORD_STATS = new Map<string, SeedKeywordStat>(
  ((seedKeywordsData as any).keywords ?? []).map((k: SeedKeywordStat) => [k.keyword, k]),
);

export interface SeedProject {
  id: string; source: Source; runtime?: string; title: string; category: string;
  budgetMin?: number | null; budgetMax?: number | null; budgetUnit?: string;
  periodDays?: number | null; region?: string | null; workType?: string;
  registeredAt?: string | null; applicants?: number | null; sourceUrl: string;
  techKeywords?: string[];
  description?: string | null; recruitCondition?: string | null;
}

export class MemoryDataSource implements DataSource {
  constructor(private projects: SeedProject[] = [], private _runs: RunItem[] = []) {}

  private all() { return this.projects; }

  async summary(): Promise<SummaryData> {
    const bySource: Record<string, number> = {};
    for (const p of this.projects) bySource[p.source] = (bySource[p.source] ?? 0) + 1;
    const last = this._runs[0];
    return {
      total: this.projects.length,
      lastRunAt: last?.startedAt ?? null,
      status: (last?.status ?? "none") as SummaryData["status"],
      bySource,
      recentRuns: this._runs.slice(0, 5).map(r => ({ source: r.source, status: r.status, count: r.total, at: r.startedAt })),
    };
  }

  async sources() {
    const by: Record<string, { count: number; lastRun: string | null; group: string; label: string }> = {};
    const groups: Record<Source, string> = { wishket: "si_contract", freemoa: "si_contract", u300: "startup", devpost: "hackathon" };
    const labels: Record<Source, string> = { wishket: "위시켓 도급", freemoa: "프리모아 도급", u300: "u300 공모", devpost: "해커톤" };
    for (const p of this.projects) {
      const g = groups[p.source] ?? "other";
      const b = by[p.source] ??= { count: 0, lastRun: null, group: g, label: labels[p.source] ?? p.source };
      b.count++;
    }
    for (const r of this._runs) {
      if (by[r.source] && !by[r.source]!.lastRun) by[r.source]!.lastRun = r.startedAt;
    }
    return Object.entries(by).map(([k, v]) => ({ key: k, label: v.label, group: v.group, count: v.count, lastRun: v.lastRun }));
  }

  async analysis(source = "all"): Promise<AnalysisData> {
    const pr = source === "all" ? this.projects : this.projects.filter(p => p.source === source);
    const catCnt: Record<string, number> = {};
    for (const p of pr) catCnt[p.category || "기타"] = (catCnt[p.category || "기타"] ?? 0) + 1;
    const budgetVals = pr.map(p => p.budgetMin ?? p.budgetMax ?? null);
    const nullBudget = budgetVals.filter(v => v == null).length;
    const months: Record<string, number> = {};
    for (const p of pr) {
      if (p.registeredAt) { const m = p.registeredAt.slice(0, 7); months[m] = (months[m] ?? 0) + 1; }
    }
    const workTypeCnt: Record<string, number> = {};
    for (const p of pr) {
      const wt = p.workType || "unknown";
      workTypeCnt[wt] = (workTypeCnt[wt] ?? 0) + 1;
    }
    return {
      categories: fbSortByShare(catCnt).map(c => ({ source: c.key, name: c.key, cnt: c.cnt, sharePct: c.sharePct })),
      budget: { histogram: fbBudgetBuckets(budgetVals, nullBudget), nullCount: nullBudget, unit: "KRW" },
      period: { histogram: [], nullCount: 0 },
      workType: workTypeCnt, 
      keywords: fbRankKeywords(pr.flatMap(p => p.techKeywords ?? [])).map(k => {
        const stat = KEYWORD_STATS.get(k.keyword);
        return { ...k, prevCnt: stat?.prevCnt ?? null, growthRate: stat?.growthRate ?? null };
      }),
      monthly: Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).map(([month, cnt]) => ({ month, cnt })),
    };
  }

  async insights(type?: "feature" | "market" | "category" | "keyword"): Promise<Insight[]> {
    const cats = (await this.analysis()).categories;
    const conf: Confidence = "mid";
    const base: Insight[] = cats.slice(0, 5).map((c, i) => ({
      type: "market" as const, title: `${c.name} 점유율 ${c.sharePct}%`,
      body: `${c.name} 카테고리가 ${c.sharePct}%로 추정(건수 ${c.cnt}). 단일 시점 데이터로 추이 미확인.`,
      metric: { category: c.name, cnt: c.cnt, sharePct: c.sharePct }, period: "2026-08", confidence: conf,
    }));
    if (type) return base.filter(i => i.type === type || type === "market" || i.type === type);
    return base;
  }

  async listProjects(p: ListParams) {
    let items = this.projects;
    if (p.source) items = items.filter(x => x.source === p.source);
    if (p.category) items = items.filter(x => x.category === p.category);
    const q = p.q;
    if (q) items = items.filter(x => (x.title || "").includes(q));
    const total = items.length;
    const pageItems = items.slice((p.page - 1) * p.size, p.page * p.size);
    return {
      items: pageItems.map((x): ProjectItem => ({
        id: x.id, source: x.source, runtime: x.runtime ?? "",
        title: x.title, budgetMin: x.budgetMin ?? null, budgetMax: x.budgetMax ?? null,
        budgetUnit: x.budgetUnit ?? "KRW", periodDays: x.periodDays ?? null,
        category: x.category, registeredAt: x.registeredAt ?? null, applicants: x.applicants ?? null,
        sourceUrl: x.sourceUrl,
      })),
      total, page: p.page, size: p.size,
    };
  }

  async projectDetail(id: string): Promise<ProjectDetail | null> {
    const x = this.projects.find(p => p.id === id);
    if (!x) return null;
    return { ...(await this.listProjects({ source: x.source as any, page: 1, size: 1 })).items[0]!, 
      region: x.region ?? null, workType: x.workType ?? null, role: null, level: null, techKeywords: x.techKeywords ?? [],
      description: (x as any).description ?? null, recruitCondition: (x as any).recruitCondition ?? null };
  }

  async runs(limit = 50) { return this._runs.slice(0, limit); }

  async analysisItems(): Promise<AnalysisItem[]> {
    return analysisItemsData as AnalysisItem[];
  }
}
