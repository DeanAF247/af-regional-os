"use client";

import { useState } from "react";

interface ReconRow {
  club:          { id: string; name: string };
  period:        { id: string; period_label: string };
  prev:          number | null;
  sales:         number | null;
  cancellations: number | null;
  nnm:           number | null;
  tIn:           number | null;
  tOut:          number | null;
  expected:      number | null;
  actual:        number | null;
  variance:      number | null;
}

export default function ReconTable({ rows }: { rows: ReconRow[] }) {
  // Unique periods in chronological order (rows already sorted that way)
  const periods = Array.from(
    new Map(rows.map((r) => [r.period.id, r.period])).values()
  );

  const [activePeriodId, setActivePeriodId] = useState<string>(
    periods[periods.length - 1]?.id ?? ""
  );

  const visible = rows.filter((r) => r.period.id === activePeriodId);

  // Group totals for the active period
  const totals = visible.reduce(
    (acc, r) => ({
      prev:          acc.prev          + (r.prev          ?? 0),
      sales:         acc.sales         + (r.sales         ?? 0),
      cancellations: acc.cancellations + (r.cancellations ?? 0),
      nnm:           acc.nnm           + (r.nnm           ?? 0),
      tIn:           acc.tIn           + (r.tIn           ?? 0),
      tOut:          acc.tOut          + (r.tOut          ?? 0),
      expected:      acc.expected      + (r.expected      ?? 0),
      actual:        acc.actual        + (r.actual        ?? 0),
      variance:      acc.variance      + (r.variance      ?? 0),
    }),
    { prev: 0, sales: 0, cancellations: 0, nnm: 0, tIn: 0, tOut: 0, expected: 0, actual: 0, variance: 0 }
  );

  if (periods.length === 0) return null;

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden mb-8">

      {/* Month tabs */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-0 flex-wrap border-b border-[#E2E8F0]">
        {periods.map((p) => {
          const isActive = p.id === activePeriodId;
          // Shorten label: "January 2025" → "Jan 25"
          const parts = p.period_label.split(" ");
          const short = `${parts[0]?.slice(0, 3)} ${parts[1]?.slice(2) ?? ""}`;
          return (
            <button
              key={p.id}
              onClick={() => setActivePeriodId(p.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap -mb-px ${
                isActive
                  ? "border-[#7C3AED] text-[#6D28D9] bg-[#F8FAFC]/60"
                  : "border-transparent text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8FAFC]/30"
              }`}
            >
              {short}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#F8FAFC] min-w-[140px]">Club</th>
              <th className="text-right px-3 py-3 font-semibold">Opening</th>
              <th className="text-right px-3 py-3 font-semibold text-[#059669]">Sales</th>
              <th className="text-right px-3 py-3 font-semibold text-[#EF4444]">Cancels</th>
              <th className="text-right px-3 py-3 font-semibold">NNM</th>
              <th className="text-right px-3 py-3 font-semibold">Trans In</th>
              <th className="text-right px-3 py-3 font-semibold">Trans Out</th>
              <th className="text-right px-3 py-3 font-semibold">Expected</th>
              <th className="text-right px-3 py-3 font-semibold">Actual</th>
              <th className="text-right px-4 py-3 font-semibold">Variance</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={i} className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/50 transition-colors">
                <td className="px-4 py-2.5 font-semibold text-[#0F172A] sticky left-0 bg-[#FFFFFF]">
                  {r.club.name}
                </td>
                <td className="px-3 py-2.5 text-right text-[#64748B]">
                  {r.prev != null ? r.prev.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-[#059669]">
                  {r.sales != null ? r.sales.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-[#EF4444]">
                  {r.cancellations != null ? r.cancellations.toLocaleString() : "—"}
                </td>
                <td className={`px-3 py-2.5 text-right font-semibold ${
                  r.nnm == null ? "text-[#475569]"
                  : r.nnm > 0 ? "text-[#059669]"
                  : r.nnm < 0 ? "text-[#EF4444]"
                  : "text-[#94A3B8]"
                }`}>
                  {r.nnm != null ? (r.nnm > 0 ? `+${r.nnm}` : r.nnm) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[#059669]">
                  {r.tIn != null && r.tIn > 0 ? `+${r.tIn}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[#EF4444]">
                  {r.tOut != null && r.tOut > 0 ? `-${r.tOut}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[#64748B]">
                  {r.expected != null ? r.expected.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[#0F172A] font-semibold">
                  {r.actual != null ? r.actual.toLocaleString() : "—"}
                </td>
                <td className={`px-4 py-2.5 text-right font-bold ${
                  r.variance == null   ? "text-[#475569]"
                  : r.variance === 0   ? "text-[#94A3B8]"
                  : r.variance > 0     ? "text-[#059669]"
                  : "text-[#EF4444]"
                }`}>
                  {r.variance != null
                    ? r.variance === 0 ? "✓ 0"
                    : r.variance > 0   ? `+${r.variance}`
                    : r.variance
                  : "—"}
                </td>
              </tr>
            ))}

            {/* Group Total row */}
            {visible.length > 1 && (
              <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] font-bold text-sm">
                <td className="px-4 py-3 text-[#6D28D9] sticky left-0 bg-[#F8FAFC]">Group Total</td>
                <td className="px-3 py-3 text-right text-[#0F172A]">{totals.prev.toLocaleString()}</td>
                <td className="px-3 py-3 text-right font-bold text-[#059669]">{totals.sales.toLocaleString()}</td>
                <td className="px-3 py-3 text-right font-bold text-[#EF4444]">{totals.cancellations.toLocaleString()}</td>
                <td className={`px-3 py-3 text-right font-bold ${totals.nnm > 0 ? "text-[#059669]" : totals.nnm < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                  {totals.nnm > 0 ? `+${totals.nnm}` : totals.nnm}
                </td>
                <td className="px-3 py-3 text-right text-[#059669]">
                  {totals.tIn > 0 ? `+${totals.tIn}` : "—"}
                </td>
                <td className="px-3 py-3 text-right text-[#EF4444]">
                  {totals.tOut > 0 ? `-${totals.tOut}` : "—"}
                </td>
                <td className="px-3 py-3 text-right text-[#64748B]">{totals.expected.toLocaleString()}</td>
                <td className="px-3 py-3 text-right text-[#0F172A]">{totals.actual.toLocaleString()}</td>
                <td className={`px-4 py-3 text-right font-bold ${
                  totals.variance === 0 ? "text-[#94A3B8]"
                  : totals.variance > 0 ? "text-[#059669]"
                  : "text-[#EF4444]"
                }`}>
                  {totals.variance === 0 ? "✓ 0" : totals.variance > 0 ? `+${totals.variance}` : totals.variance}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="px-4 py-2.5 text-[11px] text-[#475569] border-t border-[#E2E8F0]">
        Expected = Opening + NNM + Transfers In − Transfers Out &nbsp;·&nbsp;
        Variance = Actual − Expected (non-zero may indicate cancellations, freezes, or data gaps)
      </p>
    </div>
  );
}
