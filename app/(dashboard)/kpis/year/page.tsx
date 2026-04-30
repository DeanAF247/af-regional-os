import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import SectionLabel from "@/components/section-label";
import Link from "next/link";
import { formatCurrency, formatPercent, pct } from "@/lib/utils";
import { Calendar } from "lucide-react";

const CLUB_ORDER = [
  "Greenhills",
  "Thornton",
  "Newcastle West",
  "Kotara",
  "Edgeworth",
  "Lake Haven",
];

type Metric = "leads" | "sales" | "nnm" | "spend";

const METRICS: { key: Metric; label: string; format: (v: number | null) => string }[] = [
  { key: "leads", label: "Leads", format: (v) => v?.toLocaleString() ?? "—" },
  { key: "sales", label: "Sales", format: (v) => v?.toLocaleString() ?? "—" },
  { key: "nnm",   label: "NNM",   format: (v) => v != null ? (v >= 0 ? `+${v}` : String(v)) : "—" },
  { key: "spend", label: "Spend", format: (v) => v != null ? formatCurrency(v) : "—" },
];

function cell(val: number | null, target: number | null, format: (v: number | null) => string) {
  const p = pct(val, target);
  const color =
    p == null       ? "text-[#94A3B8]"
    : p >= 90       ? "text-[#10B981]"
    : p >= 70       ? "text-[#F59E0B]"
    :                 "text-[#EF4444]";
  return { display: format(val), color };
}

export default async function YearOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string }>;
}) {
  const supabase = await createClient();
  const { metric: metricParam } = await searchParams;
  const activeMetric = (METRICS.find((m) => m.key === metricParam) ?? METRICS[0]).key;

  // All periods, ascending
  const { data: periods } = await supabase
    .from("kpi_periods")
    .select("id, period_label, period_date")
    .order("period_date", { ascending: true });

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  let allKpis: any[] = [];
  if (periods && periods.length > 0) {
    const periodIds = periods.map((p) => p.id);
    const { data } = await supabase
      .from("club_kpis")
      .select("club_id, period_id, leads_actual, leads_target, sales_actual, sales_target, nnm_actual, nnm_target, spend_actual, spend_budget, cpl")
      .in("period_id", periodIds);
    allKpis = data ?? [];
  }

  // Build lookup: kpiMap[club_id][period_id] = kpi row
  const kpiMap: Record<string, Record<string, any>> = {};
  for (const k of allKpis) {
    if (!kpiMap[k.club_id]) kpiMap[k.club_id] = {};
    kpiMap[k.club_id][k.period_id] = k;
  }

  // Sort clubs by the defined order (unknown clubs at end)
  const sortedClubs = [...(clubs ?? [])].sort((a, b) => {
    const ai = CLUB_ORDER.indexOf(a.name);
    const bi = CLUB_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  function getActual(k: any | undefined, metric: Metric): number | null {
    if (!k) return null;
    if (metric === "leads") return k.leads_actual;
    if (metric === "sales") return k.sales_actual;
    if (metric === "nnm")   return k.nnm_actual;
    if (metric === "spend") return k.spend_actual;
    return null;
  }

  function getTarget(k: any | undefined, metric: Metric): number | null {
    if (!k) return null;
    if (metric === "leads") return k.leads_target;
    if (metric === "sales") return k.sales_target;
    if (metric === "nnm")   return k.nnm_target;
    if (metric === "spend") return k.spend_budget;
    return null;
  }

  const fmt = METRICS.find((m) => m.key === activeMetric)!.format;

  // Compute period group totals (actual + target)
  const periodTotals: Record<string, number | null> = {};
  const periodTargetTotals: Record<string, number | null> = {};
  for (const p of periods ?? []) {
    const periodKpis = allKpis.filter((k) => k.period_id === p.id);
    const vals = periodKpis.map((k) => getActual(k, activeMetric));
    const tvals = periodKpis.map((k) => getTarget(k, activeMetric));
    periodTotals[p.id] = vals.some((v) => v != null) ? vals.reduce((s, v) => (s ?? 0) + (v ?? 0), 0) : null;
    periodTargetTotals[p.id] = tvals.some((v) => v != null) ? tvals.reduce((s, v) => (s ?? 0) + (v ?? 0), 0) : null;
  }

  const hasData = allKpis.length > 0;

  return (
    <div>
      <PageHeader
        title="Yearly Overview"
        subtitle={periods && periods.length > 0
          ? `${periods.length} period${periods.length !== 1 ? "s" : ""} · all clubs`
          : "No data uploaded yet"}
      />

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1F35] border border-[#252B45] flex items-center justify-center mb-4">
            <Calendar size={28} className="text-[#64748B]" />
          </div>
          <h2 className="text-lg font-bold text-[#F1F5F9] mb-2">No data yet</h2>
          <p className="text-[#64748B] text-sm mb-6 max-w-sm">
            Upload KPI data for each month to see the yearly breakdown here.
          </p>
          <Link
            href="/kpis/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Upload KPIs
          </Link>
        </div>
      ) : (
        <>
          {/* Metric tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {METRICS.map((m) => (
              <Link
                key={m.key}
                href={`/kpis/year?metric=${m.key}`}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeMetric === m.key
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#131729] border border-[#252B45] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#7C3AED]"
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>

          {/* Group totals row at top */}
          <SectionLabel>Group Total — {METRICS.find((m) => m.key === activeMetric)!.label} by Month</SectionLabel>
          <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1A1F35] text-[#94A3B8] text-[11px] uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#1A1F35] min-w-[140px]">Club</th>
                    {periods?.map((p) => (
                      <th key={p.id} className="text-right px-3 py-3 font-semibold whitespace-nowrap min-w-[90px]">
                        {p.period_label.split(" ")[0].slice(0, 3)} {p.period_label.split(" ")[1]?.slice(2)}
                      </th>
                    ))}
                    <th className="text-right px-4 py-3 font-semibold bg-[#1A1F35] min-w-[110px]">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClubs.map((club) => {
                    const rowVals = (periods ?? []).map((p) => {
                      const k = kpiMap[club.id]?.[p.id];
                      const val = getActual(k, activeMetric);
                      const target = getTarget(k, activeMetric);
                      return { val, target };
                    });
                    const ytd = rowVals.some((r) => r.val != null)
                      ? rowVals.reduce((s, r) => (s ?? 0) + (r.val ?? 0), 0 as number | null)
                      : null;
                    const ytdTarget = rowVals.some((r) => r.target != null)
                      ? rowVals.reduce((s, r) => (s ?? 0) + (r.target ?? 0), 0 as number | null)
                      : null;
                    const ytdDiff = ytd != null && ytdTarget != null ? ytd - ytdTarget : null;

                    return (
                      <tr key={club.id} className="border-t border-[#252B45]/60 hover:bg-[#1A1F35]/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#F1F5F9] sticky left-0 bg-[#131729] hover:bg-[#1A1F35]/50">
                          {club.name}
                        </td>
                        {rowVals.map((r, i) => {
                          const { display, color } = cell(r.val, r.target, fmt);
                          return (
                            <td key={i} className={`px-3 py-3 text-right font-medium ${r.val == null ? "text-[#475569]" : color}`}>
                              {display}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right font-bold">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[#A78BFA]">{ytd != null ? fmt(ytd) : "—"}</span>
                            {ytdDiff != null && (
                              <span className={`text-[11px] font-semibold ${ytdDiff >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                                {ytdDiff >= 0 ? "+" : ""}{fmt(ytdDiff)} vs target
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Group total row */}
                  <tr className="border-t-2 border-[#252B45] bg-[#1A1F35] font-bold">
                    <td className="px-4 py-3 text-[#A78BFA] sticky left-0 bg-[#1A1F35]">Group Total</td>
                    {(periods ?? []).map((p) => {
                      const total = periodTotals[p.id];
                      return (
                        <td key={p.id} className="px-3 py-3 text-right text-[#F1F5F9]">
                          {total != null ? fmt(total) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-[#A78BFA]">
                      {(() => {
                        const actVals = Object.values(periodTotals);
                        const tgtVals = Object.values(periodTargetTotals);
                        if (actVals.every((v) => v == null)) return "—";
                        const ytdTotal = actVals.reduce((s, v) => (s ?? 0) + (v ?? 0), 0 as number | null);
                        const ytdTgtTotal = tgtVals.every((v) => v == null) ? null : tgtVals.reduce((s, v) => (s ?? 0) + (v ?? 0), 0 as number | null);
                        const diff = ytdTotal != null && ytdTgtTotal != null ? ytdTotal - ytdTgtTotal : null;
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{fmt(ytdTotal)}</span>
                            {diff != null && (
                              <span className={`text-[11px] font-semibold ${diff >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                                {diff >= 0 ? "+" : ""}{fmt(diff)} vs target
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-club monthly breakdown */}
          <SectionLabel>Per-Club Monthly Breakdown</SectionLabel>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
            {sortedClubs.map((club) => {
              const rows = (periods ?? []).map((p) => {
                const k = kpiMap[club.id]?.[p.id];
                return {
                  label: p.period_label,
                  actual: getActual(k, activeMetric),
                  target: getTarget(k, activeMetric),
                  cpl: k?.cpl ?? null,
                };
              });
              const hasClubData = rows.some((r) => r.actual != null);

              return (
                <div key={club.id} className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#1A1F35] border-b border-[#252B45] flex items-center justify-between">
                    <span className="font-bold text-[#F1F5F9]">{club.name}</span>
                    {hasClubData && (
                      <span className="text-[11px] text-[#64748B] uppercase tracking-wide">
                        {METRICS.find((m) => m.key === activeMetric)!.label}
                      </span>
                    )}
                  </div>
                  {!hasClubData ? (
                    <div className="px-4 py-6 text-center text-[#475569] text-sm">No data</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[#64748B] text-[11px] uppercase tracking-wide border-b border-[#252B45]">
                            <th className="text-left px-4 py-2 font-semibold">Month</th>
                            <th className="text-right px-4 py-2 font-semibold">Actual</th>
                            <th className="text-right px-4 py-2 font-semibold">Target</th>
                            <th className="text-right px-4 py-2 font-semibold">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => {
                            const p = pct(r.actual, r.target);
                            const pColor =
                              p == null     ? "text-[#64748B]"
                              : p >= 90     ? "text-[#10B981]"
                              : p >= 70     ? "text-[#F59E0B]"
                              :               "text-[#EF4444]";
                            return (
                              <tr key={i} className="border-t border-[#252B45]/40 hover:bg-[#1A1F35]/50 transition-colors">
                                <td className="px-4 py-2 text-[#94A3B8]">{r.label}</td>
                                <td className="px-4 py-2 text-right text-[#F1F5F9] font-semibold">
                                  {r.actual != null ? fmt(r.actual) : "—"}
                                </td>
                                <td className="px-4 py-2 text-right text-[#64748B]">
                                  {r.target != null ? fmt(r.target) : "—"}
                                </td>
                                <td className={`px-4 py-2 text-right font-semibold ${pColor}`}>
                                  {p != null ? formatPercent(p) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
