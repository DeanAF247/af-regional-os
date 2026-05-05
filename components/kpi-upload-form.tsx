"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Plus, PencilLine } from "lucide-react";

interface Club   { id: string; name: string; }
interface Period { id: string; period_label: string; period_date: string; }

const LEAD_SOURCES = [
  "Web / Online",
  "Referral",
  "Mobile App",
  "Brand / Marketing",
  "In-Person / Walk-in",
  "None",
] as const;
type LeadSource = (typeof LEAD_SOURCES)[number] | "";

interface Row {
  club_id:       string;
  leads_actual:  string;
  leads_target:  string;
  sales_actual:  string;
  sales_target:  string;
  nnm_actual:    string;
  nnm_target:    string;
  cpl:           string;
  spend_actual:  string;
  spend_budget:  string;
  transfers_in:  string;
  transfers_out: string;
  lead_source:   LeadSource;
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
    transfers_in: "", transfers_out: "",
    lead_source: "",
  }));
}

const INPUT = "w-full px-2 py-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm text-right focus:outline-none focus:border-[#7C3AED] transition-colors placeholder:text-[#CBD5E1]";

const FIELDS: { key: keyof Row; label: string; group?: string }[] = [
  { key: "leads_actual",  label: "Leads",       group: "KPIs"      },
  { key: "leads_target",  label: "Leads Tgt",   group: "KPIs"      },
  { key: "sales_actual",  label: "Sales",        group: "KPIs"      },
  { key: "sales_target",  label: "Sales Tgt",   group: "KPIs"      },
  { key: "nnm_actual",    label: "NNM",          group: "KPIs"      },
  { key: "nnm_target",    label: "NNM Tgt",     group: "KPIs"      },
  { key: "cpl",           label: "CPL ($)",      group: "KPIs"      },
  { key: "spend_actual",  label: "Spend ($)",    group: "KPIs"      },
  { key: "spend_budget",  label: "Budget ($)",   group: "KPIs"      },
  { key: "transfers_in",  label: "T/In",         group: "Transfers" },
  { key: "transfers_out", label: "T/Out",        group: "Transfers" },
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

    const [{ data: kpiData, error: kpiErr }, { data: transferData, error: tErr }] = await Promise.all([
      supabase.from("club_kpis").select("*").eq("period_id", periodId),
      supabase.from("transfers").select("*").eq("period_id", periodId),
    ]);

    if (kpiErr || tErr) { setError((kpiErr ?? tErr)!.message); setFetching(false); return; }

    setRows(blank(clubs).map((r) => {
      const kpi = kpiData?.find((k) => k.club_id === r.club_id);
      const tr  = transferData?.find((t) => t.club_id === r.club_id);
      return {
        club_id:       r.club_id,
        leads_actual:  kpi?.leads_actual  != null ? String(kpi.leads_actual)  : "",
        leads_target:  kpi?.leads_target  != null ? String(kpi.leads_target)  : "",
        sales_actual:  kpi?.sales_actual  != null ? String(kpi.sales_actual)  : "",
        sales_target:  kpi?.sales_target  != null ? String(kpi.sales_target)  : "",
        nnm_actual:    kpi?.nnm_actual    != null ? String(kpi.nnm_actual)    : "",
        nnm_target:    kpi?.nnm_target    != null ? String(kpi.nnm_target)    : "",
        cpl:           kpi?.cpl           != null ? String(kpi.cpl)           : "",
        spend_actual:  kpi?.spend_actual  != null ? String(kpi.spend_actual)  : "",
        spend_budget:  kpi?.spend_budget  != null ? String(kpi.spend_budget)  : "",
        transfers_in:  tr?.transfers_in   != null ? String(tr.transfers_in)   : "",
        transfers_out: tr?.transfers_out  != null ? String(tr.transfers_out)  : "",
        lead_source:   (kpi?.lead_source  ?? "") as LeadSource,
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

      const hasAnyData = rows.some((r) => r.leads_actual || r.sales_actual || r.spend_actual || r.nnm_actual);
      if (!hasAnyData) throw new Error("Enter data for at least one club before saving.");

      // Include ALL clubs in the upsert (with nulls for blank cells) so that
      // cleared values are written back to the DB and don't reappear on reload.
      const kpiRows = rows.map((r) => ({
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
        lead_source:  r.lead_source || null,
      }));

      const { error: kpiErr } = await supabase
        .from("club_kpis")
        .upsert(kpiRows, { onConflict: "club_id,period_id" });
      if (kpiErr) throw kpiErr;

      // Save transfers (all clubs, default 0 if blank)
      const transferRows = rows.map((r) => ({
        club_id:       r.club_id,
        period_id:     periodId,
        transfers_in:  numOrNull(r.transfers_in)  ?? 0,
        transfers_out: numOrNull(r.transfers_out) ?? 0,
      }));
      const { error: tErr } = await supabase
        .from("transfers")
        .upsert(transferRows, { onConflict: "club_id,period_id" });
      if (tErr) throw tErr;

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
        <CheckCircle size={48} className="text-[#059669] mb-4" />
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">KPIs Saved!</h2>
        <p className="text-[#64748B] text-sm">Returning to dashboard…</p>
      </div>
    );
  }

  const periodLabel = mode === "existing"
    ? periods.find((p) => p.id === selPeriod)?.period_label ?? "—"
    : `${newMonth} ${newYear}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Period selector ──────────────────────────────────────────────────── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5">
        <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-4">Select Period</div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          {periods.length > 0 && (
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "existing"
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] hover:text-[#0F172A]"
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
                : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] hover:text-[#0F172A]"
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
              className="px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED]"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.period_label}</option>
              ))}
            </select>
            {fetching && (
              <span className="text-[#94A3B8] text-sm animate-pulse">Loading data…</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
              className="px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED]"
            >
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <select
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED]"
            >
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        )}

        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#EDE9FE]/30 border border-[#7C3AED]/30 rounded-lg text-[#6D28D9] text-sm font-semibold">
          {periodLabel}
        </div>
      </div>

      {/* ── KPI Entry Table ───────────────────────────────────────────────────── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">
            Club KPIs — {periodLabel}
          </span>
          <span className="text-[11px] text-[#94A3B8]">Tab between cells to move quickly</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FFFFFF]/60 text-[#94A3B8] text-[10px] uppercase tracking-wide border-b border-[#E2E8F0]">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-[#FFFFFF]/80">Club</th>
                {FIELDS.map((f, i) => (
                  <th
                    key={f.key}
                    className={`text-right px-2 py-2.5 font-semibold whitespace-nowrap ${
                      f.group === "Transfers" ? "text-[#2563EB]" : ""
                    } ${i > 0 && FIELDS[i - 1].group !== f.group ? "border-l border-[#E2E8F0]" : ""}`}
                  >
                    {f.label}
                  </th>
                ))}
                <th className="text-left px-2 py-2.5 font-semibold whitespace-nowrap border-l border-[#E2E8F0] text-[#059669]">
                  Lead Source
                </th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club, i) => {
                const row = rows.find((r) => r.club_id === club.id)!;
                return (
                  <tr key={club.id} className={`border-t border-[#E2E8F0]/60 ${i % 2 === 1 ? "bg-[#F8FAFC]/20" : ""}`}>
                    <td className="px-4 py-2 font-semibold text-[#0F172A] whitespace-nowrap sticky left-0 bg-[#FFFFFF]">
                      {club.name}
                    </td>
                    {FIELDS.map((f, i) => (
                      <td
                        key={f.key}
                        className={`px-1.5 py-1.5 ${i > 0 && FIELDS[i - 1].group !== f.group ? "border-l border-[#E2E8F0]" : ""}`}
                      >
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
                    <td className="px-1.5 py-1.5 border-l border-[#E2E8F0]">
                      <select
                        value={row.lead_source}
                        onChange={(e) => update(club.id, "lead_source", e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                        style={{ minWidth: 160 }}
                      >
                        <option value="">—</option>
                        {LEAD_SOURCES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 bg-[#FEE2E2]/40 border border-[#EF4444]/30 rounded-lg px-4 py-3 text-[#EF4444] text-sm">
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
          className="px-6 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#EDE9FE] text-[#64748B] hover:text-[#0F172A] font-semibold rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
