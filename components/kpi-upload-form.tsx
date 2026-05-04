"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Plus, PencilLine } from "lucide-react";

interface Club   { id: string; name: string; }
interface Period { id: string; period_label: string; period_date: string; }

interface Row {
  club_id:      string;
  leads_actual: string;
  leads_target: string;
  sales_actual: string;
  sales_target: string;
  nnm_actual:   string;
  nnm_target:   string;
  cpl:          string;
  spend_actual: string;
  spend_budget: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CY     = new Date().getFullYear();
const YEARS  = [CY - 1, CY, CY + 1];

function numOrNull(v: string): number | null {
  const n = parseFloat(v.replace(/[,$\s]/g, ""));
  return isNaN(n) ? null : n;
}

function blank(clubs: Club[]): Row[] {
  return clubs.map((c) => ({
    club_id: c.id, leads_actual: "", leads_target: "",
    sales_actual: "", sales_target: "", nnm_actual: "", nnm_target: "",
    cpl: "", spend_actual: "", spend_budget: "",
  }));
}

const INPUT = "w-full px-2 py-1.5 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm text-right focus:outline-none focus:border-[#7C3AED] transition-colors placeholder:text-[#2D3555]";

const FIELDS: { key: keyof Row; label: string; hint?: string }[] = [
  { key: "leads_actual",  label: "Leads"       },
  { key: "leads_target",  label: "Leads Tgt"   },
  { key: "sales_actual",  label: "Sales"       },
  { key: "sales_target",  label: "Sales Tgt"   },
  { key: "nnm_actual",    label: "NNM"         },
  { key: "nnm_target",    label: "NNM Tgt"     },
  { key: "cpl",           label: "CPL ($)"     },
  { key: "spend_actual",  label: "Spend ($)"   },
  { key: "spend_budget",  label: "Budget ($)"  },
];

export default function KpiEntryForm({
  clubs,
  periods,
}: {
  clubs:   Club[];
  periods: Period[];
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const preselected  = searchParams.get("period");

  // "existing" = editing a known period id, "new" = creating fresh
  const [mode,     setMode]     = useState<"existing" | "new">(preselected ? "existing" : periods.length > 0 ? "existing" : "new");
  const [selPeriod, setSelPeriod] = useState<string>(preselected ?? periods[0]?.id ?? "");
  const [newMonth,  setNewMonth]  = useState(MONTHS[new Date().getMonth()]);
  const [newYear,   setNewYear]   = useState(String(CY));
  const [rows,      setRows]      = useState<Row[]>(blank(clubs));
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");

  // Load existing data when period selection changes
  const loadPeriod = useCallback(async (periodId: string) => {
    if (!periodId) return;
    setFetching(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("club_kpis")
      .select("*")
      .eq("period_id", periodId);

    if (err) { setError(err.message); setFetching(false); return; }

    setRows(blank(clubs).map((r) => {
      const existing = data?.find((k) => k.club_id === r.club_id);
      if (!existing) return r;
      return {
        club_id:      r.club_id,
        leads_actual: existing.leads_actual  != null ? String(existing.leads_actual)  : "",
        leads_target: existing.leads_target  != null ? String(existing.leads_target)  : "",
        sales_actual: existing.sales_actual  != null ? String(existing.sales_actual)  : "",
        sales_target: existing.sales_target  != null ? String(existing.sales_target)  : "",
        nnm_actual:   existing.nnm_actual    != null ? String(existing.nnm_actual)    : "",
        nnm_target:   existing.nnm_target    != null ? String(existing.nnm_target)    : "",
        cpl:          existing.cpl           != null ? String(existing.cpl)           : "",
        spend_actual: existing.spend_actual  != null ? String(existing.spend_actual)  : "",
        spend_budget: existing.spend_budget  != null ? String(existing.spend_budget)  : "",
      };
    }));
    setFetching(false);
  }, [clubs]);

  useEffect(() => {
    if (mode === "existing" && selPeriod) loadPeriod(selPeriod);
    if (mode === "new") setRows(blank(clubs));
  }, [mode, selPeriod, loadPeriod, clubs]);

  function update(clubId: string, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r) => r.club_id === clubId ? { ...r, [field]: value } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    try {
      let periodId: string;

      if (mode === "existing") {
        periodId = selPeriod;
      } else {
        const label = `${newMonth} ${newYear}`;
        const monthNum = MONTHS.indexOf(newMonth) + 1;
        const date  = `${newYear}-${String(monthNum).padStart(2, "0")}-01`;
        const { data: period, error: pErr } = await supabase
          .from("kpi_periods")
          .upsert({ period_label: label, period_date: date }, { onConflict: "period_label" })
          .select()
          .single();
        if (pErr) throw pErr;
        periodId = period.id;
      }

      const kpiRows = rows
        .filter((r) => r.leads_actual || r.sales_actual || r.spend_actual || r.nnm_actual)
        .map((r) => ({
          club_id:      r.club_id,
          period_id:    periodId,
          leads_actual: numOrNull(r.leads_actual),
          leads_target: numOrNull(r.leads_target),
          sales_actual: numOrNull(r.sales_actual),
          sales_target: numOrNull(r.sales_target),
          nnm_actual:   numOrNull(r.nnm_actual),
          nnm_target:   numOrNull(r.nnm_target),
          cpl:          numOrNull(r.cpl),
          spend_actual: numOrNull(r.spend_actual),
          spend_budget: numOrNull(r.spend_budget),
        }));

      if (kpiRows.length === 0) throw new Error("Enter data for at least one club before saving.");

      const { error: kpiErr } = await supabase
        .from("club_kpis")
        .upsert(kpiRows, { onConflict: "club_id,period_id" });
      if (kpiErr) throw kpiErr;

      setSuccess(true);
      setTimeout(() => router.push("/"), 1200);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <CheckCircle size={48} className="text-[#10B981] mb-4" />
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-2">KPIs Saved!</h2>
        <p className="text-[#94A3B8] text-sm">Returning to dashboard…</p>
      </div>
    );
  }

  const periodLabel = mode === "existing"
    ? periods.find((p) => p.id === selPeriod)?.period_label ?? "—"
    : `${newMonth} ${newYear}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Period selector ──────────────────────────────────────────────────── */}
      <div className="bg-[#131729] border border-[#252B45] rounded-xl p-5">
        <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Select Period</div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          {periods.length > 0 && (
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "existing"
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#1A1F35] border border-[#252B45] text-[#64748B] hover:text-[#F1F5F9]"
              }`}
            >
              <PencilLine size={14} className="inline mr-1.5 -mt-0.5" />
              Edit Existing Period
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "new"
                ? "bg-[#7C3AED] text-white"
                : "bg-[#1A1F35] border border-[#252B45] text-[#64748B] hover:text-[#F1F5F9]"
            }`}
          >
            <Plus size={14} className="inline mr-1.5 -mt-0.5" />
            New Period
          </button>
        </div>

        {mode === "existing" ? (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selPeriod}
              onChange={(e) => setSelPeriod(e.target.value)}
              className="px-3 py-2 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED]"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.period_label}</option>
              ))}
            </select>
            {fetching && (
              <span className="text-[#64748B] text-sm animate-pulse">Loading data…</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
              className="px-3 py-2 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED]"
            >
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <select
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="px-3 py-2 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED]"
            >
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        )}

        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#3B1F7A]/30 border border-[#7C3AED]/30 rounded-lg text-[#A78BFA] text-sm font-semibold">
          {periodLabel}
        </div>
      </div>

      {/* ── KPI Entry Table ───────────────────────────────────────────────────── */}
      <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
        <div className="bg-[#1A1F35] px-4 py-3 border-b border-[#252B45] flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            Club KPIs — {periodLabel}
          </span>
          <span className="text-[11px] text-[#64748B]">Tab between cells to move quickly</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0B0E1A]/60 text-[#64748B] text-[10px] uppercase tracking-wide border-b border-[#252B45]">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-[#0B0E1A]/80">Club</th>
                {FIELDS.map((f) => (
                  <th key={f.key} className="text-right px-2 py-2.5 font-semibold whitespace-nowrap">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clubs.map((club, i) => {
                const row = rows.find((r) => r.club_id === club.id)!;
                return (
                  <tr key={club.id} className={`border-t border-[#252B45]/60 ${i % 2 === 1 ? "bg-[#1A1F35]/20" : ""}`}>
                    <td className="px-4 py-2 font-semibold text-[#F1F5F9] whitespace-nowrap sticky left-0 bg-[#131729]">
                      {club.name}
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="px-1.5 py-1.5">
                        <input
                          type="number"
                          step="any"
                          placeholder="—"
                          value={row[f.key]}
                          onChange={(e) => update(club.id, f.key, e.target.value)}
                          className={INPUT}
                          style={{ minWidth: 72 }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 bg-[#7F1D1D]/40 border border-[#EF4444]/30 rounded-lg px-4 py-3 text-[#EF4444] text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || fetching}
          className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {loading ? "Saving…" : "Save KPIs"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-[#1A1F35] border border-[#252B45] hover:border-[#3B1F7A] text-[#94A3B8] hover:text-[#F1F5F9] font-semibold rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
