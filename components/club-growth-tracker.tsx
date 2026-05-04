"use client";

import { useState, useEffect } from "react";
import { Target, TrendingUp, TrendingDown, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface Period  { id: string; period_label: string; period_date: string; }
interface KpiRow  { period_id: string; sales_actual: number | null; nnm_actual: number | null; spend_actual: number | null; }
interface Transfer { period_id: string; transfers_in: number | null; transfers_out: number | null; }
interface MemberCount { period_id: string; count: number | null; }

interface Props {
  clubId:      string;
  periods:     Period[];
  kpis:        KpiRow[];
  transfers:   Transfer[];
  counts:      MemberCount[];
}

function getPeriodFY(dateStr: string) {
  const d = new Date(dateStr); const m = d.getMonth() + 1; const y = d.getFullYear();
  return m >= 7 ? y + 1 : y;
}

export default function ClubGrowthTracker({ clubId, periods, kpis, transfers, counts }: Props) {
  const storageKey = `growth_goal_${clubId}`;
  const [goal,      setGoal]      = useState<number | "">(50);
  const [editing,   setEditing]   = useState(false);
  const [draftGoal, setDraftGoal] = useState<string>("");

  // Load goal from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) setGoal(Number(stored));
  }, [storageKey]);

  function saveGoal() {
    const val = Number(draftGoal);
    if (!isNaN(val)) {
      setGoal(val);
      localStorage.setItem(storageKey, String(val));
    }
    setEditing(false);
  }

  // Sort periods chronologically
  const sortedPeriods = [...periods].sort(
    (a, b) => new Date(a.period_date).getTime() - new Date(b.period_date).getTime(),
  );

  // Current FY
  const now   = new Date();
  const thisFY = now.getMonth() + 1 >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  const fyPeriods = sortedPeriods.filter((p) => getPeriodFY(p.period_date) === thisFY);

  // Find opening count for FY (count from the period BEFORE the first FY period, or first FY period itself)
  const firstFYPeriodIdx = sortedPeriods.findIndex((p) => getPeriodFY(p.period_date) === thisFY);
  const openingPeriod = firstFYPeriodIdx > 0 ? sortedPeriods[firstFYPeriodIdx - 1] : sortedPeriods[firstFYPeriodIdx];
  const openingCount = openingPeriod
    ? counts.find((c) => c.period_id === openingPeriod.id)?.count ?? null
    : null;

  // Latest period
  const latestFYPeriod = fyPeriods[fyPeriods.length - 1];
  const latestCount    = latestFYPeriod
    ? counts.find((c) => c.period_id === latestFYPeriod.id)?.count ?? null
    : null;

  const ytdGrowth = latestCount != null && openingCount != null ? latestCount - openingCount : null;
  const goalNum   = typeof goal === "number" ? goal : 0;
  const progressPct = goalNum > 0 && ytdGrowth != null ? Math.round((ytdGrowth / goalNum) * 100) : null;

  // Build rows for the table — all FY periods
  const rows = fyPeriods.map((p, i) => {
    const kpi       = kpis.find((k) => k.period_id === p.id);
    const transfer  = transfers.find((t) => t.period_id === p.id);
    const memberCount = counts.find((c) => c.period_id === p.id)?.count ?? null;
    const sales     = kpi?.sales_actual ?? null;
    const nnm       = kpi?.nnm_actual ?? null;
    const cancels   = sales != null && nnm != null ? sales - nnm : null;
    const spend     = kpi?.spend_actual ?? null;
    const tIn       = transfer?.transfers_in ?? null;
    const tOut      = transfer?.transfers_out ?? null;

    // Cumulative growth from FY opening
    const cumGrowth = memberCount != null && openingCount != null ? memberCount - openingCount : null;

    return { period: p, sales, nnm, cancels, spend, tIn, tOut, memberCount, cumGrowth };
  });

  if (fyPeriods.length === 0) {
    return (
      <div className="bg-[#131729] border border-[#252B45] rounded-xl p-6 text-center mb-8">
        <p className="text-[#64748B] text-sm">No FY{thisFY} periods found. Upload KPI data to begin tracking.</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Goal header */}
      <div className="bg-[#131729] border border-[#252B45] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3B1F7A]/40 flex items-center justify-center">
              <Target size={16} className="text-[#A78BFA]" />
            </div>
            <div>
              <div className="text-[#F1F5F9] font-bold text-[15px]">FY{thisFY} Growth Goal</div>
              <div className="text-[#64748B] text-[12px]">Net member growth target for the financial year</div>
            </div>
          </div>

          {/* Goal input */}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <span className="text-[#64748B] text-sm">+</span>
                <input
                  type="number"
                  value={draftGoal}
                  onChange={(e) => setDraftGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveGoal()}
                  autoFocus
                  className="w-24 bg-[#1A1F35] border border-[#7C3AED] text-[#F1F5F9] text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none text-center"
                />
                <span className="text-[#64748B] text-sm">members</span>
                <button onClick={saveGoal} className="p-1.5 text-[#34D399] hover:bg-[#0A3B2A]/50 rounded-lg transition-colors">
                  <Check size={15} />
                </button>
              </>
            ) : (
              <>
                <span className="text-[#F1F5F9] font-bold text-lg">+{goalNum} members</span>
                <button onClick={() => { setDraftGoal(String(goalNum)); setEditing(true); }}
                  className="p-1.5 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#1A1F35] rounded-lg transition-colors">
                  <Pencil size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[#1A1F35] rounded-xl px-4 py-3">
            <div className="text-[#64748B] text-[10px] font-semibold uppercase tracking-wider mb-1">YTD Growth</div>
            <div className={cn("text-xl font-bold",
              ytdGrowth == null ? "text-[#475569]"
              : ytdGrowth >= 0 ? "text-[#34D399]" : "text-[#F87171]"
            )}>
              {ytdGrowth == null ? "—" : (ytdGrowth >= 0 ? `+${ytdGrowth}` : ytdGrowth)}
            </div>
            <div className="text-[#64748B] text-[11px] mt-0.5">vs FY opening</div>
          </div>
          <div className="bg-[#1A1F35] rounded-xl px-4 py-3">
            <div className="text-[#64748B] text-[10px] font-semibold uppercase tracking-wider mb-1">Goal Progress</div>
            <div className={cn("text-xl font-bold",
              progressPct == null ? "text-[#475569]"
              : progressPct >= 100 ? "text-[#34D399]"
              : progressPct >= 50 ? "text-[#FBBF24]" : "text-[#F87171]"
            )}>
              {progressPct == null ? "—" : `${progressPct}%`}
            </div>
            <div className="text-[#64748B] text-[11px] mt-0.5">of {goalNum > 0 ? `+${goalNum}` : "—"} target</div>
          </div>
          <div className="bg-[#1A1F35] rounded-xl px-4 py-3">
            <div className="text-[#64748B] text-[10px] font-semibold uppercase tracking-wider mb-1">Remaining</div>
            <div className={cn("text-xl font-bold",
              ytdGrowth == null ? "text-[#475569]"
              : goalNum - ytdGrowth <= 0 ? "text-[#34D399]" : "text-[#F1F5F9]"
            )}>
              {ytdGrowth == null ? "—"
                : goalNum - ytdGrowth <= 0 ? "Goal met! 🎉"
                : `+${goalNum - ytdGrowth}`}
            </div>
            <div className="text-[#64748B] text-[11px] mt-0.5">to reach goal</div>
          </div>
        </div>

        {/* Progress bar */}
        {progressPct != null && (
          <div className="h-2 bg-[#252B45] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700",
                progressPct >= 100 ? "bg-[#10B981]"
                : progressPct >= 50  ? "bg-[#F59E0B]" : "bg-[#7C3AED]"
              )}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Monthly tracker table */}
      <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1A1F35] text-[#94A3B8] text-[11px] uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">Month</th>
                <th className="text-right px-4 py-3 font-semibold">Members</th>
                <th className="text-right px-4 py-3 font-semibold">Sales</th>
                <th className="text-right px-4 py-3 font-semibold">Cancels</th>
                <th className="text-right px-4 py-3 font-semibold">NNM</th>
                <th className="text-right px-4 py-3 font-semibold">Ad Spend</th>
                <th className="text-right px-4 py-3 font-semibold">T/In</th>
                <th className="text-right px-4 py-3 font-semibold">T/Out</th>
                <th className="text-right px-4 py-3 font-semibold">Cum. Growth</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isPositiveNnm = row.nnm != null && row.nnm >= 0;
                const isPositiveCum = row.cumGrowth != null && row.cumGrowth >= 0;
                return (
                  <tr key={row.period.id} className="border-t border-[#252B45]/60 hover:bg-[#1A1F35]/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#F1F5F9]">{row.period.period_label}</td>
                    <td className="px-4 py-3 text-right text-[#F1F5F9]">
                      {row.memberCount != null ? row.memberCount.toLocaleString() : <span className="text-[#334155]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[#F1F5F9]">
                      {row.sales != null ? row.sales : <span className="text-[#334155]">—</span>}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-semibold",
                      row.cancels != null && row.cancels > 0 ? "text-[#F87171]" : "text-[#334155]")}>
                      {row.cancels != null ? row.cancels : "—"}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-semibold",
                      row.nnm == null ? "text-[#334155]"
                      : isPositiveNnm ? "text-[#34D399]" : "text-[#F87171]")}>
                      {row.nnm != null ? (row.nnm >= 0 ? `+${row.nnm}` : row.nnm) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">
                      {row.spend != null ? formatCurrency(row.spend) : <span className="text-[#334155]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[#34D399]">
                      {row.tIn != null ? `+${row.tIn}` : <span className="text-[#334155]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[#F87171]">
                      {row.tOut != null ? `-${row.tOut}` : <span className="text-[#334155]">—</span>}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-bold",
                      row.cumGrowth == null ? "text-[#334155]"
                      : isPositiveCum ? "text-[#34D399]" : "text-[#F87171]")}>
                      {row.cumGrowth != null ? (row.cumGrowth >= 0 ? `+${row.cumGrowth}` : row.cumGrowth) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {rows.length > 1 && (() => {
              const totSales   = rows.reduce((s, r) => s + (r.sales   ?? 0), 0);
              const totCancels = rows.reduce((s, r) => s + (r.cancels ?? 0), 0);
              const totNnm     = rows.reduce((s, r) => s + (r.nnm    ?? 0), 0);
              const totSpend   = rows.reduce((s, r) => s + (r.spend  ?? 0), 0);
              const totTIn     = rows.reduce((s, r) => s + (r.tIn    ?? 0), 0);
              const totTOut    = rows.reduce((s, r) => s + (r.tOut   ?? 0), 0);
              return (
                <tfoot>
                  <tr className="border-t-2 border-[#252B45] bg-[#1A1F35] font-bold text-[13px]">
                    <td className="px-4 py-3 text-[#A78BFA]">FY{thisFY} Total</td>
                    <td className="px-4 py-3 text-right text-[#64748B]">—</td>
                    <td className="px-4 py-3 text-right text-[#F1F5F9]">{totSales}</td>
                    <td className="px-4 py-3 text-right text-[#F87171]">{totCancels}</td>
                    <td className={cn("px-4 py-3 text-right", totNnm >= 0 ? "text-[#34D399]" : "text-[#F87171]")}>
                      {totNnm >= 0 ? `+${totNnm}` : totNnm}
                    </td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{formatCurrency(totSpend)}</td>
                    <td className="px-4 py-3 text-right text-[#34D399]">+{totTIn}</td>
                    <td className="px-4 py-3 text-right text-[#F87171]">-{totTOut}</td>
                    <td className={cn("px-4 py-3 text-right", (ytdGrowth ?? 0) >= 0 ? "text-[#34D399]" : "text-[#F87171]")}>
                      {ytdGrowth != null ? (ytdGrowth >= 0 ? `+${ytdGrowth}` : ytdGrowth) : "—"}
                    </td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      </div>
    </div>
  );
}
