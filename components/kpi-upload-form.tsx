"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Plus, PencilLine } from "lucide-react";

interface Club   { id: string; name: string; }
interface Period { id: string; period_label: string; period_date: string; }

interface Row {
  club_id:        string;
  leads_actual:   string;
  leads_target:   string;
  sales_actual:   string;
  sales_target:   string;
  cancels_actual: string;
  cancels_target: string;
  nnm_target:     string;
  spend_actual:   string;
  spend_budget:   string;
  transfers_in:   string;
  transfers_out:  string;
}

interface LeadSourceRow {
  club_id:            string;
  web_online:         string;
  referral:           string;
  mobile_app:         string;
  brand_marketing:    string;
  in_person_walk_in:  string;
  none:               string;
}

interface MembershipRow {
  club_id:             string;
  total_count:         string;
  direct_debit_count:  string;
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
    sales_actual: "", sales_target: "",
    cancels_actual: "", cancels_target: "",
    nnm_target: "",
    spend_actual: "", spend_budget: "",
    transfers_in: "", transfers_out: "",
  }));
}

function blankLeadSources(clubs: Club[]): LeadSourceRow[] {
  return clubs.map((c) => ({
    club_id: c.id, web_online: "", referral: "", mobile_app: "",
    brand_marketing: "", in_person_walk_in: "", none: "",
  }));
}

function blankMembership(clubs: Club[]): MembershipRow[] {
  return clubs.map((c) => ({ club_id: c.id, total_count: "", direct_debit_count: "" }));
}

/** Auto-computed CPL: spend / leads */
function computeCpl(row: Row): string {
  const spend = numOrNull(row.spend_actual);
  const leads = numOrNull(row.leads_actual);
  if (spend === null || leads === null || leads === 0) return "";
  return (spend / leads).toFixed(2);
}

/** Auto-computed NMM: sales - cancels + (transfers_in - transfers_out) */
function computeNmm(row: Row): string {
  const sales   = numOrNull(row.sales_actual);
  const cancels = numOrNull(row.cancels_actual);
  const tIn     = numOrNull(row.transfers_in);
  const tOut    = numOrNull(row.transfers_out);
  if (sales === null && cancels === null) return "";
  return String((sales ?? 0) - (cancels ?? 0) + (tIn ?? 0) - (tOut ?? 0));
}

const INPUT = "w-full px-2 py-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm text-right focus:outline-none focus:border-[#7C3AED] transition-colors placeholder:text-[#CBD5E1]";
const COMPUTED_CELL = "w-full px-2 py-1.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-sm text-right font-semibold text-[#6D28D9]";

type InputCol   = { kind: "input";    key: keyof Row; label: string; group: string };
type ComputedCol = { kind: "computed"; key: "cpl_auto" | "nmm_auto"; label: string; group: string; compute: (row: Row) => string };
type Col = InputCol | ComputedCol;

const COLS: Col[] = [
  { kind: "input",    key: "leads_actual",   label: "Leads",       group: "KPIs" },
  { kind: "input",    key: "leads_target",   label: "Leads Tgt",   group: "KPIs" },
  { kind: "input",    key: "sales_actual",   label: "Sales",       group: "KPIs" },
  { kind: "input",    key: "sales_target",   label: "Sales Tgt",   group: "KPIs" },
  { kind: "input",    key: "cancels_actual", label: "Cancels",     group: "KPIs" },
  { kind: "input",    key: "cancels_target", label: "Cancels Tgt", group: "KPIs" },
  { kind: "computed", key: "nmm_auto",       label: "NMM",         group: "KPIs", compute: computeNmm },
  { kind: "input",    key: "nnm_target",     label: "NMM Tgt",     group: "KPIs" },
  { kind: "input",    key: "spend_actual",   label: "Spend ($)",   group: "KPIs" },
  { kind: "input",    key: "spend_budget",   label: "Budget ($)",  group: "KPIs" },
  { kind: "computed", key: "cpl_auto",       label: "CPL ($)",     group: "KPIs", compute: computeCpl },
  { kind: "input",    key: "transfers_in",   label: "T/In",        group: "Transfers" },
  { kind: "input",    key: "transfers_out",  label: "T/Out",       group: "Transfers" },
];

const LEAD_SOURCE_FIELDS: { key: keyof LeadSourceRow; label: string }[] = [
  { key: "web_online",        label: "Web / Online"        },
  { key: "referral",          label: "Referral"            },
  { key: "mobile_app",        label: "Mobile App"          },
  { key: "brand_marketing",   label: "Brand / Marketing"   },
  { key: "in_person_walk_in", label: "In-Person / Walk-in" },
  { key: "none",              label: "None"                },
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

  // Default to the current calendar month's period, not just periods[0]
  // (periods[0] may be a future forecast period)
  const currentMonthLabel = `${MONTHS[new Date().getMonth()]} ${CY}`;
  const currentMonthPeriod = periods.find((p) => p.period_label === currentMonthLabel);
  const defaultPeriodId = preselected ?? currentMonthPeriod?.id ?? periods[0]?.id ?? "";

  const [mode,           setMode]           = useState<"existing" | "new">(preselected ? "existing" : periods.length > 0 ? "existing" : "new");
  const [selPeriod,      setSelPeriod]      = useState<string>(defaultPeriodId);
  const [newMonth,       setNewMonth]       = useState(MONTHS[new Date().getMonth()]);
  const [newYear,        setNewYear]        = useState(String(CY));
  const [rows,           setRows]           = useState<Row[]>(blank(clubs));
  const [leadSourceRows, setLeadSourceRows] = useState<LeadSourceRow[]>(blankLeadSources(clubs));
  const [membershipRows, setMembershipRows] = useState<MembershipRow[]>(blankMembership(clubs));
  const [loading,        setLoading]        = useState(false);
  const [fetching,       setFetching]       = useState(false);
  const [success,        setSuccess]        = useState(false);
  const [error,          setError]          = useState("");

  const loadPeriod = useCallback(async (periodId: string) => {
    if (!periodId) return;
    setFetching(true);
    setError("");
    const supabase = createClient();

    const [
      { data: kpiData,        error: kpiErr },
      { data: transferData,   error: tErr   },
      { data: leadSourceData, error: lsErr  },
      { data: membershipData, error: mErr   },
    ] = await Promise.all([
      supabase.from("club_kpis").select("*").eq("period_id", periodId),
      supabase.from("transfers").select("*").eq("period_id", periodId),
      supabase.from("club_lead_sources").select("*").eq("period_id", periodId),
      supabase.from("membership_counts").select("club_id, count, direct_debit_count").eq("period_id", periodId),
    ]);

    if (kpiErr || tErr || lsErr || mErr) {
      setError((kpiErr ?? tErr ?? lsErr ?? mErr)!.message);
      setFetching(false);
      return;
    }

    setRows(blank(clubs).map((r) => {
      const kpi = kpiData?.find((k) => k.club_id === r.club_id);
      const tr  = transferData?.find((t) => t.club_id === r.club_id);
      return {
        club_id:        r.club_id,
        leads_actual:   kpi?.leads_actual   != null ? String(kpi.leads_actual)   : "",
        leads_target:   kpi?.leads_target   != null ? String(kpi.leads_target)   : "",
        sales_actual:   kpi?.sales_actual   != null ? String(kpi.sales_actual)   : "",
        sales_target:   kpi?.sales_target   != null ? String(kpi.sales_target)   : "",
        cancels_actual: kpi?.cancels_actual != null ? String(kpi.cancels_actual) : "",
        cancels_target: kpi?.cancels_target != null ? String(kpi.cancels_target) : "",
        nnm_target:     kpi?.nnm_target     != null ? String(kpi.nnm_target)     : "",
        spend_actual:   kpi?.spend_actual   != null ? String(kpi.spend_actual)   : "",
        spend_budget:   kpi?.spend_budget   != null ? String(kpi.spend_budget)   : "",
        transfers_in:   tr?.transfers_in    != null ? String(tr.transfers_in)    : "",
        transfers_out:  tr?.transfers_out   != null ? String(tr.transfers_out)   : "",
      };
    }));

    setLeadSourceRows(blankLeadSources(clubs).map((r) => {
      const ls = leadSourceData?.find((l) => l.club_id === r.club_id);
      return {
        club_id:            r.club_id,
        web_online:         ls?.web_online         != null ? String(ls.web_online)         : "",
        referral:           ls?.referral           != null ? String(ls.referral)           : "",
        mobile_app:         ls?.mobile_app         != null ? String(ls.mobile_app)         : "",
        brand_marketing:    ls?.brand_marketing    != null ? String(ls.brand_marketing)    : "",
        in_person_walk_in:  ls?.in_person_walk_in  != null ? String(ls.in_person_walk_in)  : "",
        none:               ls?.none               != null ? String(ls.none)               : "",
      };
    }));

    setMembershipRows(blankMembership(clubs).map((r) => {
      const m = membershipData?.find((mc) => mc.club_id === r.club_id);
      return {
        club_id:            r.club_id,
        total_count:        m?.count               != null ? String(m.count)               : "",
        direct_debit_count: m?.direct_debit_count  != null ? String(m.direct_debit_count)  : "",
      };
    }));

    setFetching(false);
  }, [clubs]);

  useEffect(() => {
    if (mode === "existing" && selPeriod) loadPeriod(selPeriod);
    if (mode === "new") {
      setRows(blank(clubs));
      setLeadSourceRows(blankLeadSources(clubs));
      setMembershipRows(blankMembership(clubs));
    }
  }, [mode, selPeriod, loadPeriod, clubs]);

  function update(clubId: string, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r) => r.club_id === clubId ? { ...r, [field]: value } : r));
  }

  function updateLeadSource(clubId: string, field: keyof LeadSourceRow, value: string) {
    setLeadSourceRows((prev) => prev.map((r) => r.club_id === clubId ? { ...r, [field]: value } : r));
  }

  function updateMembership(clubId: string, field: keyof MembershipRow, value: string) {
    setMembershipRows((prev) => prev.map((r) => r.club_id === clubId ? { ...r, [field]: value } : r));
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
        const label    = `${newMonth} ${newYear}`;
        const monthNum = MONTHS.indexOf(newMonth) + 1;
        const date     = `${newYear}-${String(monthNum).padStart(2, "0")}-01`;
        const { data: period, error: pErr } = await supabase
          .from("kpi_periods")
          .upsert({ period_label: label, period_date: date }, { onConflict: "period_label" })
          .select()
          .single();
        if (pErr) throw pErr;
        periodId = period.id;
      }

      const hasAnyData = rows.some((r) => r.leads_actual || r.sales_actual || r.spend_actual || r.cancels_actual);
      if (!hasAnyData) throw new Error("Enter data for at least one club before saving.");

      const kpiRows = rows.map((r) => {
        const salesN   = numOrNull(r.sales_actual);
        const cancelsN = numOrNull(r.cancels_actual);
        const tiN      = numOrNull(r.transfers_in);
        const toN      = numOrNull(r.transfers_out);
        const spendN   = numOrNull(r.spend_actual);
        const leadsN   = numOrNull(r.leads_actual);

        const nnmActual = (salesN !== null || cancelsN !== null)
          ? (salesN ?? 0) - (cancelsN ?? 0) + (tiN ?? 0) - (toN ?? 0)
          : null;

        const cplActual = (spendN !== null && leadsN !== null && leadsN > 0)
          ? spendN / leadsN
          : null;

        return {
          club_id:        r.club_id,
          period_id:      periodId,
          leads_actual:   leadsN,
          leads_target:   numOrNull(r.leads_target),
          sales_actual:   salesN,
          sales_target:   numOrNull(r.sales_target),
          cancels_actual: cancelsN,
          cancels_target: numOrNull(r.cancels_target),
          nnm_actual:     nnmActual,
          nnm_target:     numOrNull(r.nnm_target),
          cpl:            cplActual,
          spend_actual:   spendN,
          spend_budget:   numOrNull(r.spend_budget),
        };
      });

      const { error: kpiErr } = await supabase
        .from("club_kpis")
        .upsert(kpiRows, { onConflict: "club_id,period_id" });
      if (kpiErr) throw kpiErr;

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

      const lsRows = leadSourceRows
        .filter((r) => LEAD_SOURCE_FIELDS.some((f) => r[f.key] !== ""))
        .map((r) => ({
          club_id:            r.club_id,
          period_id:          periodId,
          web_online:         numOrNull(r.web_online),
          referral:           numOrNull(r.referral),
          mobile_app:         numOrNull(r.mobile_app),
          brand_marketing:    numOrNull(r.brand_marketing),
          in_person_walk_in:  numOrNull(r.in_person_walk_in),
          none:               numOrNull(r.none),
        }));

      if (lsRows.length > 0) {
        const { error: lsErr } = await supabase
          .from("club_lead_sources")
          .upsert(lsRows, { onConflict: "club_id,period_id" });
        if (lsErr) throw lsErr;
      }

      const mRows = membershipRows
        .filter((r) => r.total_count !== "" || r.direct_debit_count !== "")
        .map((r) => ({
          club_id:            r.club_id,
          period_id:          periodId,
          count:              numOrNull(r.total_count),
          direct_debit_count: numOrNull(r.direct_debit_count),
        }));
      if (mRows.length > 0) {
        const { error: mErr } = await supabase
          .from("membership_counts")
          .upsert(mRows, { onConflict: "club_id,period_id" });
        if (mErr) throw mErr;
      }

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
          <span className="text-[11px] text-[#94A3B8]">
            Tab between cells · <span className="text-[#7C3AED]">Purple = auto-calculated</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FFFFFF]/60 text-[#94A3B8] text-[10px] uppercase tracking-wide border-b border-[#E2E8F0]">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-[#FFFFFF]/80">Club</th>
                {COLS.map((col, i) => (
                  <th
                    key={col.key}
                    className={[
                      "text-right px-2 py-2.5 font-semibold whitespace-nowrap",
                      col.group === "Transfers" ? "text-[#2563EB]" : "",
                      col.kind === "computed"   ? "text-[#7C3AED]" : "",
                      i > 0 && COLS[i - 1].group !== col.group ? "border-l border-[#E2E8F0]" : "",
                    ].join(" ")}
                  >
                    {col.label}
                    {col.kind === "computed" && (
                      <span className="ml-1 normal-case text-[9px] text-[#A78BFA]">auto</span>
                    )}
                  </th>
                ))}
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
                    {COLS.map((col, ci) => (
                      <td
                        key={col.key}
                        className={`px-1.5 py-1.5 ${ci > 0 && COLS[ci - 1].group !== col.group ? "border-l border-[#E2E8F0]" : ""}`}
                      >
                        {col.kind === "computed" ? (
                          <div className={COMPUTED_CELL} style={{ minWidth: 72 }}>
                            {col.compute(row) || "—"}
                          </div>
                        ) : (
                          <input
                            type="number"
                            step="any"
                            placeholder="—"
                            value={row[col.key]}
                            onChange={(e) => update(club.id, col.key, e.target.value)}
                            className={INPUT}
                            style={{ minWidth: 72 }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Lead Source Breakdown Table ───────────────────────────────────────── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">
            Lead Source Breakdown — {periodLabel}
          </span>
          <span className="text-[11px] text-[#94A3B8]">Leads per source per club</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FFFFFF]/60 text-[#059669] text-[10px] uppercase tracking-wide border-b border-[#E2E8F0]">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-[#FFFFFF]/80 text-[#94A3B8]">Club</th>
                {LEAD_SOURCE_FIELDS.map((f) => (
                  <th key={f.key} className="text-right px-2 py-2.5 font-semibold whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clubs.map((club, i) => {
                const row = leadSourceRows.find((r) => r.club_id === club.id)!;
                return (
                  <tr key={club.id} className={`border-t border-[#E2E8F0]/60 ${i % 2 === 1 ? "bg-[#F8FAFC]/20" : ""}`}>
                    <td className="px-4 py-2 font-semibold text-[#0F172A] whitespace-nowrap sticky left-0 bg-[#FFFFFF]">
                      {club.name}
                    </td>
                    {LEAD_SOURCE_FIELDS.map((f) => (
                      <td key={f.key} className="px-1.5 py-1.5">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="—"
                          value={row[f.key]}
                          onChange={(e) => updateLeadSource(club.id, f.key, e.target.value)}
                          className={INPUT}
                          style={{ minWidth: 80 }}
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

      {/* ── Membership Table ─────────────────────────────────────────────────── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">
            Membership — {periodLabel}
          </span>
          <span className="text-[11px] text-[#94A3B8]">End-of-month snapshot per club</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FFFFFF]/60 text-[#94A3B8] text-[10px] uppercase tracking-wide border-b border-[#E2E8F0]">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-[#FFFFFF]/80">Club</th>
                <th className="text-right px-2 py-2.5 font-semibold whitespace-nowrap">Total Members</th>
                <th className="text-right px-2 py-2.5 font-semibold whitespace-nowrap text-[#7C3AED]">Direct Debit</th>
                <th className="text-right px-2 py-2.5 font-semibold whitespace-nowrap text-[#7C3AED]">DD %</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club, i) => {
                const row = membershipRows.find((r) => r.club_id === club.id)!;
                const total = numOrNull(row.total_count);
                const dd    = numOrNull(row.direct_debit_count);
                const ddPct = total && dd != null && total > 0 ? Math.round((dd / total) * 100) : null;
                return (
                  <tr key={club.id} className={`border-t border-[#E2E8F0]/60 ${i % 2 === 1 ? "bg-[#F8FAFC]/20" : ""}`}>
                    <td className="px-4 py-2 font-semibold text-[#0F172A] whitespace-nowrap sticky left-0 bg-[#FFFFFF]">
                      {club.name}
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="number" step="1" min="0" placeholder="—"
                        value={row.total_count}
                        onChange={(e) => updateMembership(club.id, "total_count", e.target.value)}
                        className={INPUT} style={{ minWidth: 100 }}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="number" step="1" min="0" placeholder="—"
                        value={row.direct_debit_count}
                        onChange={(e) => updateMembership(club.id, "direct_debit_count", e.target.value)}
                        className={INPUT} style={{ minWidth: 100 }}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <div className={COMPUTED_CELL} style={{ minWidth: 72 }}>
                        {ddPct != null ? `${ddPct}%` : "—"}
                      </div>
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
