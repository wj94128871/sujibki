import { describe, it, expect } from "vitest";
import { MemoryDataSource } from "../src/MemoryDataSource.js";
import analysisItemsData from "../src/analysis_items.json" with { type: "json" };
import opportunitySpaceData from "../src/opportunity_space.json" with { type: "json" };
import { hSummary, hAnalysis, hAnalysisItems, hAnalysisSpace, hInsights, hProjectDetail, hProjects, hRuns, hSources } from "../src/routes/handlers.js";
import type { SeedProject } from "../src/MemoryDataSource.js";

const seed: SeedProject[] = [
  { id: "1", source: "freemoa", title: "B2B AI 구축", category: "AI·데이터", budgetMin: 25_000_000, sourceUrl: "https://freemoa" },
  { id: "2", source: "freemoa", title: "웹 쇼핑몰", category: "웹", budgetMin: 5_000_000, periodDays: 60, sourceUrl: "https://freemoa", techKeywords: ["react"] },
  { id: "3", source: "u300", title: "영어 학습 플랫폼", category: "AI·데이터", sourceUrl: "https://u300", techKeywords: ["rag", "ai"] },
  { id: "4", source: "devpost", title: "해커톤", category: "웹", sourceUrl: "https://devpost", techKeywords: ["python"] },
];
const runs = [ { id: 1, source: "freemoa", runtime: "", status: "success", total: 2, success: 2, failed: 0, error: null, startedAt: "2026-08-20T00:00:00Z", finishedAt: "2026-08-20T00:05:00Z" } ];
const ds = new MemoryDataSource(seed, runs);

describe("Worker API 계약 (MemoryDataSource)", () => {
  it("/api/summary", async () => {
    const res = await hSummary(ds);
    expect(res.ok).toBe(true);
    const d = res.data as any;
    expect(d.total).toBe(4);
    expect(d.bySource.freemoa).toBe(2);
    expect(d.status).toBe("success");
  });

  it("/api/analysis: 카테고리 점유·키워드·예산", async () => {
    const url = new URL("https://x/api/analysis");
    const res = await hAnalysis(ds, url);
    const d = res.data as any;
    expect(d.categories[0].name).toBe("AI·데이터");
    expect(d.keywords.some((k: any) => k.keyword === "rag")).toBe(true);
    expect(d.budget.histogram.some((b: any) => b.bucket === "500-1000만")).toBe(true);
  });

  it("/api/projects: 소스 필터 + 페이징", async () => {
    const url = new URL("https://x/api/projects?source=freemoa&page=1&size=10");
    const res = await hProjects(ds, url);
    const d = res.data as any;
    expect(d.total).toBe(2);
    expect(d.items[0].source).toBe("freemoa");
  });

  it("/api/projects/:id: 경량 상세 + null 처리", async () => {
    const res = await hProjectDetail(ds, "1");
    const d = res.data as any;
    expect(d.title).toBe("B2B AI 구축");
    expect(d.budgetUnit).toBe("KRW");
  });

  it("/api/projects/:id 미존재 → NOT_FOUND", async () => {
    const res = await hProjectDetail(ds, "999");
    expect(res.ok).toBe(false);
    expect((res as any).error.code).toBe("NOT_FOUND");
  });

  it("/api/insights: confidence 포함", async () => {
    const url = new URL("https://x/api/insights");
    const res = await hInsights(ds, url);
    const d = res.data as any;
    expect(d.length).toBeGreaterThan(0);
    expect(["high", "mid", "low"]).toContain(d[0].confidence);
  });

  it("/api/analysis/items: 전략 아이템 계약 검증", async () => {
    const res = await hAnalysisItems(ds);
    expect(res.ok).toBe(true);
    const d = res.data as any[];
    // 건수는 소스 JSON과 동일해야 함 (하드코딩으로 구버전 수치 고착 방지)
    expect(d.length).toBe((analysisItemsData as any[]).length);
    const ids = new Set(d.map(i => i.id));
    expect(ids.size).toBe(d.length);
    const ranks = d.map(i => i.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: d.length }, (_, i) => i + 1));
    for (const item of d) {
      expect(["add", "reduce", "pivot", "watch"]).toContain(item.action);
      expect(["high", "mid", "low"]).toContain(item.confidence);
      expect(item.title).toBeTruthy();
      expect(item.summary).toBeTruthy();
      expect(item.opportunity).toBeTruthy();
      expect(item.market).toBeTruthy();
      expect(item.features.length).toBeGreaterThan(0);
      for (const f of item.features) {
        expect(f.name).toBeTruthy();
        expect(f.desc).toBeTruthy();
        expect(["high", "mid", "low"]).toContain(f.priority);
      }
      expect(item.evidence.length).toBeGreaterThan(0);
      for (const e of item.evidence) {
        expect(e.metric).toBeTruthy();
        expect(e.value).toBeTruthy();
      }
      expect(item.risks.length).toBeGreaterThan(0);
    }
  });

  it("/api/analysis/space: 기회 공간 계약 검증", async () => {
    const res = await hAnalysisSpace();
    expect(res.ok).toBe(true);
    const d = res.data as any[];
    // 건수는 소스 JSON과 동일해야 함
    expect(d.length).toBe((opportunitySpaceData as any[]).length);
    expect(new Set(d.map(i => i.tier))).toEqual(new Set(["B", "C", "D"]));
    const ids = new Set(d.map(i => i.id));
    expect(ids.size).toBe(d.length);
    for (const item of d) {
      expect(["B", "C", "D"]).toContain(item.tier);
      expect(["high", "mid", "low"]).toContain(item.priority);
      expect(item.title).toBeTruthy();
      expect(item.form).toBeTruthy();
      expect(item.domain).toBeTruthy();
      expect(item.evidence).toBeTruthy();
    }
    // Tier A와 아이템 id가 겹치지 않아야 함 (A는 /api/analysis/items 소관)
    const spaceIds = new Set(d.map(i => i.id));
    for (const a of analysisItemsData as any[]) {
      expect(spaceIds.has(a.id)).toBe(false);
    }
  });
});
