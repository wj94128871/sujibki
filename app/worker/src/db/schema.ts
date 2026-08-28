/** Drizzle 스키마 — Neon projects/collection_runs/analysis_* (tech-design §5) */
import { pgTable, text, integer, timestamp, jsonb, bigint, serial, real } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  runtime: text("runtime").notNull().default(""),
  sourceRef: text("source_ref").notNull(),
  groupType: text("group_type").notNull(),
  title: text("title"),
  category: text("category"),
  budgetMin: bigint("budget_min", { mode: "number" }),
  budgetMax: bigint("budget_max", { mode: "number" }),
  budgetUnit: text("budget_unit").notNull().default("KRW"),
  periodDays: integer("period_days"),
  region: text("region"),
  workType: text("work_type"),
  registeredAt: timestamp("registered_at", { withTimezone: true }),
  applicants: integer("applicants"),
  sourceUrl: text("source_url"),
  techKeywords: text("tech_keywords").array(),
  rawJson: jsonb("raw_json"),
}, (t) => ({
  uniq: { name: "uq_projects_src", columns: [t.source, t.runtime, t.sourceRef] },
}));

export const collectionRuns = pgTable("collection_runs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  runtime: text("runtime").notNull().default(""),
  status: text("status").notNull(),
  total: integer("total").notNull().default(0),
  success: integer("success").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  error: jsonb("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const analysisCategory = pgTable("analysis_category", {
  source: text("source"), category: text("category"), cnt: integer("cnt"),
  sharePct: real("share_pct"), prevCnt: integer("prev_cnt"), growth: real("growth"), period: text("period"),
});
export const analysisBudget = pgTable("analysis_budget", {
  source: text("source"), bucket: text("bucket"), cnt: integer("cnt"), period: text("period"),
});
export const analysisKeyword = pgTable("analysis_keyword", {
  source: text("source"), keyword: text("keyword"), cnt: integer("cnt"),
  prevCnt: integer("prev_cnt"), growthRate: real("growth_rate"), period: text("period"),
});
export const analysisInsights = pgTable("analysis_insights", {
  type: text("type"), title: text("title"), body: text("body"),
  metric: jsonb("metric"), period: text("period"), confidence: text("confidence"),
});
