import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectDetail, ProjectItem, Source } from "../types.js";
import { api } from "../api/client.js";
import { Section, Empty, ErrorBlock, Skeleton, btnClass } from "../components/ui.js";
import { SOURCE_LABEL, SOURCE_COLORS } from "../util/trends.js";
import { formatDate, formatMoney, formatPeriod } from "../util/format.js";

type SortKey = "title" | "budgetMin" | "periodDays" | "registeredAt";

/** 밀도 높은 데이터 테이블 — sticky 헤더·정렬·소스필터·페이징 */
export function SourcesTable({ source }: { source: Source | "all" }) {
  const [rows, setRows] = useState<ProjectItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("registeredAt");
  const [asc, setAsc] = useState(false);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { let m = true; setErr(null);
    api.projects({ source: source === "all" ? "" : source, q, page: String(page), size: "30" })
      .then(d => { if (m) { setRows(d.items); setTotal(d.total); } })
      .catch(e => { if (m) setErr(String(e)); });
    return () => { m = false; };
  }, [source, q, page, reload]);

  useEffect(() => {
    if (!detail) return;
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDetail(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detail]);

  const sorted = useMemo(() => {
    const arr = rows ? [...rows] : [];
    arr.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; if (bv == null) return -1;
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      return asc ? c : -c;
    });
    return arr;
  }, [rows, sortKey, asc]);

  function toggleSort(k: SortKey) { if (sortKey === k) setAsc(a => !a); else { setSortKey(k); setAsc(false); } }

  async function openDetail(id: string) { try { setDetail(await api.project(id)); } catch { setDetail(null); } }

  const sortBtnClass = "inline-flex items-center gap-1 border-0 bg-transparent p-0 font-inherit text-inherit cursor-pointer hover:text-primary";

  return (
    <Section id="sources" title="사이트별 수집 안건" kicker="Source explorer" description="원천 안건을 소스별로 필터링하고 원본 근거까지 확인합니다."
      action={
        <div className="flex w-full items-center gap-2 md:w-auto">
          <input className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none md:w-60"
            value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="제목 검색" aria-label="안건 검색" />
        </div>
      }>
      {err ? <ErrorBlock message={err} onRetry={() => setReload(value => value + 1)} />
        : !rows ? <div className="rounded-xl border border-line bg-surface p-4 shadow-card"><SkeletonRows /></div>
        : rows.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface shadow-card"><Empty title="이 조건의 안건이 없습니다" hint="소스/검색 조건을 바꿔보세요." /></div>
        ) : (
          <div className="max-h-[560px] overflow-auto rounded-xl border border-line bg-surface shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-5 [&>th]:border-b [&>th]:border-line [&>th]:bg-surface2 [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-extrabold [&>th]:text-ink-sub [&>th]:whitespace-nowrap">
                  <th><button className={sortBtnClass} onClick={() => toggleSort("title")}>제목 {caret("title")}</button></th>
                  <th><button className={sortBtnClass} onClick={() => toggleSort("budgetMin")}>예산 {caret("budgetMin")}</button></th>
                  <th><button className={sortBtnClass} onClick={() => toggleSort("periodDays")}>기간 {caret("periodDays")}</button></th>
                  <th>카테고리</th>
                  <th><button className={sortBtnClass} onClick={() => toggleSort("registeredAt")}>등록일 {caret("registeredAt")}</button></th>
                  <th>소스</th><th>원본</th>
                </tr>
              </thead>
              <tbody className="[&>tr:hover]:bg-surface2 [&>tr]:cursor-pointer [&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&>tr>td]:px-4 [&>tr>td]:py-3 [&>tr>td.num]:text-right [&>tr>td.num]:tnum">
                {sorted.map(it => (
                  <tr key={it.id} onClick={() => openDetail(it.id)} tabIndex={0} onKeyDown={e => e.key === "Enter" && openDetail(it.id)}
                    aria-label={`${it.title ?? "제목 없음"} 상세 보기`}>
                    <td className="font-semibold">{it.title ?? "제목 없음"}</td>
                    <td className="num" data-label="예산">{formatMoney(it.budgetMin ?? it.budgetMax, it.budgetUnit)}</td>
                    <td className="num" data-label="기간">{formatPeriod(it.periodDays)}</td>
                    <td data-label="카테고리">{it.category ?? "기타"}</td>
                    <td className="num" data-label="등록일">{formatDate(it.registeredAt)}</td>
                    <td data-label="소스">
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" style={{ color: SOURCE_COLORS[it.source] }}>●</span>
                        {SOURCE_LABEL[it.source] ?? it.source}
                      </span>
                    </td>
                    <td data-label="원본"><a href={it.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>원본 ↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-ink-faint">
              <span>총 {total.toLocaleString()}건</span>
              <span className="flex items-center gap-2">
                <button className={`${btnClass()} min-h-9 px-3`} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>◀ 이전</button>
                <span aria-live="polite" className="tnum px-1 font-bold text-ink">{page}</span>
                <button className={`${btnClass()} min-h-9 px-3`} disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}>다음 ▶</button>
              </span>
            </div>
          </div>
        )}
      {detail && (
        <div role="dialog" aria-modal="true" aria-label="안건 상세"
          onClick={() => setDetail(null)}
          className="fixed inset-0 z-100 flex items-center justify-center bg-[#0b0e1e]/50 p-4 backdrop-blur-sm">
          <div className="card-pad max-h-[85dvh] w-full max-w-150 overflow-auto rounded-2xl border border-line bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="m-0 pr-2 font-bold text-ink">{detail.title ?? "정보 없음"}</h3>
              <button ref={closeButtonRef} aria-label="닫기"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-surface2"
                onClick={() => setDetail(null)}>✕</button>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <DetailItem label="카테고리" value={detail.category ?? "정보 없음"} />
              <DetailItem label="유형" value={detail.workType ?? "정보 없음"} />
              <DetailItem label="예산" value={formatMoney(detail.budgetMin ?? detail.budgetMax, detail.budgetUnit)} num />
              <DetailItem label="기간" value={formatPeriod(detail.periodDays)} num />
              <DetailItem label="지역" value={detail.region ?? "정보 없음"} />
              <DetailItem label="등록일" value={formatDate(detail.registeredAt)} num />
            </dl>
            <p className="mt-4 mb-0 text-sm text-ink">기술키워드: {(detail.techKeywords ?? []).join(", ") || "정보 없음"}</p>
            {detail.description && (
              <div className="mt-4">
                <dt className="mb-1 text-xs font-extrabold tracking-wide text-ink-faint uppercase">상세 내용 (크롤링)</dt>
                <dd className="m-0 max-h-60 overflow-auto text-sm leading-relaxed whitespace-pre-wrap text-ink">{detail.description}</dd>
              </div>
            )}
            {detail.recruitCondition && (
              <div className="mt-4">
                <dt className="mb-1 text-xs font-extrabold tracking-wide text-ink-faint uppercase">모집 요건 (크롤링)</dt>
                <dd className="m-0 max-h-45 overflow-auto text-sm leading-relaxed text-ink">{detail.recruitCondition}</dd>
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <a className={`${btnClass(true)} no-underline hover:no-underline`} href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">원본 보기 ↗</a>
              <button className={btnClass()} onClick={() => setDetail(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );

  function caret(k: SortKey) { return sortKey === k ? (asc ? "▲" : "▼") : "↕"; }
}

function DetailItem({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className={`m-0 mt-0.5 ${num ? "tnum" : ""}`}>{value}</dd>
    </div>
  );
}

function SkeletonRows() {
  return <div className="p-4">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="mb-3 h-5" />)}</div>;
}
