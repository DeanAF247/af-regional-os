"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Edit2, Trash2, AlertTriangle } from "lucide-react";
import { deletePeriod, deleteAllPeriods } from "@/app/(dashboard)/kpis/actions";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface PeriodSummary {
  id: string;
  period_label: string;
  club_count: number;
  total_leads: number;
  leads_pct: number | null;
  total_sales: number;
  sales_pct: number | null;
  total_spend: number;
  spend_pct: number | null;
}

export default function PeriodsTable({ periods }: { periods: PeriodSummary[] }) {
  const [pending, startTransition] = useTransition();
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleDelete(id: string) {
    setError("");
    startTransition(async () => {
      try {
        await deletePeriod(id);
        setConfirmId(null);
      } catch (e: any) {
        setError(e.message ?? "Delete failed");
      }
    });
  }

  function handleDeleteAll() {
    setError("");
    startTransition(async () => {
      try {
        await deleteAllPeriods();
        setConfirmAll(false);
      } catch (e: any) {
        setError(e.message ?? "Delete failed");
      }
    });
  }

  return (
    <>
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-[#FEE2E2]/40 border border-[#EF4444]/30 rounded-lg text-[#EF4444] text-sm">
          <AlertTriangle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Reset All confirmation */}
      {confirmAll && (
        <div className="mb-4 flex items-center gap-4 px-4 py-3 bg-[#FEE2E2]/30 border border-[#EF4444]/40 rounded-xl text-sm">
          <AlertTriangle size={16} className="text-[#EF4444] flex-shrink-0" />
          <span className="text-[#0F172A] flex-1">
            Delete <strong>all {periods.length} periods</strong> and every data point? This cannot be undone.
          </span>
          <button
            onClick={handleDeleteAll}
            disabled={pending}
            className="px-4 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {pending ? "Deleting…" : "Yes, delete everything"}
          </button>
          <button
            onClick={() => setConfirmAll(false)}
            className="px-4 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] text-xs font-semibold rounded-lg hover:text-[#0F172A] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
        {/* Table header with Reset All */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">
            {periods.length} Period{periods.length !== 1 ? "s" : ""}
          </span>
          {periods.length > 0 && !confirmAll && (
            <button
              onClick={() => setConfirmAll(true)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-xs text-[#EF4444]/70 hover:text-[#EF4444] transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              Reset all data
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FFFFFF]/60 text-[#64748B] text-[11px] uppercase tracking-wide border-b border-[#E2E8F0]">
                <th className="text-left px-4 py-3 font-semibold">Period</th>
                <th className="text-center px-4 py-3 font-semibold">Clubs</th>
                <th className="text-right px-4 py-3 font-semibold">Leads</th>
                <th className="text-right px-4 py-3 font-semibold">Leads %</th>
                <th className="text-right px-4 py-3 font-semibold">Sales</th>
                <th className="text-right px-4 py-3 font-semibold">Sales %</th>
                <th className="text-right px-4 py-3 font-semibold">Spend</th>
                <th className="text-right px-4 py-3 font-semibold">Spend %</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr
                  key={period.id}
                  className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/50 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">
                    {period.period_label}
                  </td>
                  <td className="px-4 py-3 text-center text-[#64748B]">{period.club_count}</td>
                  <td className="px-4 py-3 text-right text-[#0F172A]">{period.total_leads.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    period.leads_pct == null ? "text-[#94A3B8]"
                      : period.leads_pct >= 90 ? "text-[#059669]"
                      : period.leads_pct >= 70 ? "text-[#D97706]"
                      : "text-[#EF4444]"
                  }`}>
                    {formatPercent(period.leads_pct)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0F172A]">{period.total_sales.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    period.sales_pct == null ? "text-[#94A3B8]"
                      : period.sales_pct >= 90 ? "text-[#059669]"
                      : period.sales_pct >= 70 ? "text-[#D97706]"
                      : "text-[#EF4444]"
                  }`}>
                    {formatPercent(period.sales_pct)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0F172A]">{formatCurrency(period.total_spend)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    period.spend_pct == null ? "text-[#94A3B8]"
                      : period.spend_pct <= 100 ? "text-[#059669]"
                      : period.spend_pct <= 115 ? "text-[#D97706]"
                      : "text-[#EF4444]"
                  }`}>
                    {formatPercent(period.spend_pct)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/kpis/upload?period=${period.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#6D28D9] transition-colors"
                      >
                        <Edit2 size={12} />
                        Edit
                      </Link>
                      {confirmId === period.id ? (
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-[#EF4444]">Delete?</span>
                          <button
                            onClick={() => handleDelete(period.id)}
                            disabled={pending}
                            className="text-[#EF4444] hover:text-white font-semibold disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-[#94A3B8] hover:text-[#0F172A]"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(period.id)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#EF4444] transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
