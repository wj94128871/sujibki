import { useEffect, useState } from "react";
import { api } from "./api/client.js";
import type { Analysis, Insight, RunItem, Source, Summary } from "./types.js";
import { Kpis } from "./sections/Kpis.js";
import { AnalysisSection } from "./sections/AnalysisSection.js";
import { Features } from "./sections/Features.js";
import { Insights } from "./sections/Insights.js";
import { SourcesTable } from "./sections/SourcesTable.js";
import { Runs } from "./sections/Runs.js";
import { AnalysisPage } from "./sections/AnalysisPage.js";
import { Sidebar } from "./components/Sidebar.js";
import { Topbar, HeroBanner } from "./components/Header.js";
import { applyTheme, getTheme, toggleTheme } from "./util/theme.js";

export default function App() {
  const [page, setPage] = useState<"dashboard" | "analysis">("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [source, setSource] = useState<Source | "all">("all");
  const [theme, setTheme] = useState<"dark" | "light">(getTheme());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [insightsErr, setInsightsErr] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunItem[] | null>(null);
  const [runsErr, setRunsErr] = useState<string | null>(null);

  useEffect(() => { applyTheme(); setTheme(getTheme()); }, []);
  useEffect(() => { api.summary().then(setSummary).catch(() => setSummary(null)); }, []);
  useEffect(() => { api.analysis(source === "all" ? "all" : source).then(setAnalysis).catch(() => setAnalysis(null)); }, [source]);
  useEffect(() => { api.insights().then(setInsights).catch(e => setInsightsErr(String(e))); }, []);
  useEffect(() => { api.runs().then(setRuns).catch(e => setRunsErr(String(e))); }, []);

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)}
        page={page} onNavigate={setPage}
        source={source} onSource={setSource}
        theme={theme} onToggleTheme={() => { toggleTheme(); setTheme(getTheme()); }} />

      <div className="lg:pl-60">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
          <HeroBanner page={page} theme={theme}
            onToggleTheme={() => { toggleTheme(); setTheme(getTheme()); }}
            onCollect={() => { /* MVP on-demand 트리거(Phase2 Cron) — 이력은 /api/runs에 기록 */ }} />

          {page === "analysis" ? (
            <div className="mt-8"><AnalysisPage summary={summary} /></div>
          ) : (
            <>
              <div className="mt-8"><Kpis summary={summary} analysis={analysis} /></div>
              <SourcesTable source={source} />
              <AnalysisSection analysis={analysis} />
              <Features items={insights?.filter(item => item.type === "feature") ?? (insights ? [] : null)} error={insightsErr} />
              <Insights items={insights?.filter(item => item.type === "market") ?? (insights ? [] : null)} error={insightsErr} />
              <Runs data={runs} error={runsErr} />
            </>
          )}

          <footer className="mt-12 border-t border-line pt-6 pb-10 text-center text-xs leading-relaxed text-ink-faint">
            데이터 출처: 위시켓·프리모아·u300·Devpost (공개 정보 크롤링, 개인정보 미포함). 수치는 시점 기준 추정치이며 단정 금지.
          </footer>
        </main>
      </div>
    </div>
  );
}
