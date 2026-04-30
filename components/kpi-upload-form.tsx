"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import Papa from "papaparse";

interface Club {
  id: string;
  name: string;
}

interface ClubKpiRow {
  club_id: string;
  leads_actual: string;
  leads_target: string;
  sales_actual: string;
  sales_target: string;
  nnm_actual: string;
  nnm_target: string;
  cpl: string;
  spend_actual: string;
  spend_budget: string;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// Normalise club names from the sheet to match our DB
const CLUB_NAME_MAP: Record<string, string> = {
  "lakehaven":      "Lake Haven",
  "lake haven":     "Lake Haven",
  "greenhills":     "Greenhills",
  "thornton":       "Thornton",
  "newcastle west": "Newcastle West",
  "kotara":         "Kotara",
  "edgeworth":      "Edgeworth",
};

function normaliseName(raw: string): string {
  return CLUB_NAME_MAP[raw.toLowerCase().trim()] ?? raw.trim();
}

function parseNum(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[$,%\s]/g, "").replace(/−/g, "-");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function numOrNull(val: string): number | null {
  const n = parseFloat(val.replace(/[,$]/g, ""));
  return isNaN(n) ? null : n;
}

interface ParsedClubData {
  leads_actual: number | null;
  leads_target: number | null;
  sales_actual: number | null;
  sales_target: number | null;
  nnm_actual: number | null;
  nnm_target: number | null;
  cpl: number | null;
  spend_actual: number | null;
  spend_budget: number | null;
}

function parseGroupSummaryCSV(csvText: string): Record<string, ParsedClubData> {
  const { data: rows } = Papa.parse<string[]>(csvText, { skipEmptyLines: false });

  // Find main KPI header row (contains "Leads")
  let mainHeaderIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((c) => c.trim() === "Leads")) {
      mainHeaderIdx = i;
      break;
    }
  }
  if (mainHeaderIdx === -1) {
    throw new Error('Could not find "Leads" header. Make sure you exported the correct sheet tab.');
  }

  const mainHeaders = rows[mainHeaderIdx].map((h) => h.trim());

  const leadsCol       = mainHeaders.indexOf("Leads");
  const leadsTargetCol = mainHeaders.indexOf("Target", leadsCol);
  const salesCol       = mainHeaders.indexOf("Sales");
  const salesTargetCol = salesCol !== -1 ? mainHeaders.indexOf("Target", salesCol + 1) : -1;
  const cplCol         = mainHeaders.findIndex((h) => h.toLowerCase().includes("cpl total"));
  const nnmCol         = mainHeaders.indexOf("NNM");
  const nnmTargetCol   = nnmCol !== -1 ? mainHeaders.indexOf("NNM Target", nnmCol) : -1;

  const KNOWN_CLUBS = new Set(Object.values(CLUB_NAME_MAP));

  // Find spend section row FIRST (contains "Meta") so we know where to stop
  let spendHeaderIdx = -1;
  for (let i = mainHeaderIdx + 1; i < rows.length; i++) {
    if (rows[i].some((c) => c.trim() === "Meta")) {
      spendHeaderIdx = i;
      break;
    }
  }
  // Only read up to the spend section (handles empty rows between clubs in the sheet)
  const mainEndRow = spendHeaderIdx !== -1 ? spendHeaderIdx : rows.length;

  // Parse club rows
  const clubData: Record<string, ParsedClubData> = {};
  for (let i = mainHeaderIdx + 1; i < mainEndRow; i++) {
    const row  = rows[i];
    const raw  = row[0]?.trim();
    if (!raw || raw.toLowerCase() === "total") continue;

    const name = normaliseName(raw);
    if (!KNOWN_CLUBS.has(name)) continue;

    clubData[name] = {
      leads_actual:  leadsCol !== -1       ? parseNum(row[leadsCol])       : null,
      leads_target:  leadsTargetCol !== -1 ? parseNum(row[leadsTargetCol]) : null,
      sales_actual:  salesCol !== -1       ? parseNum(row[salesCol])       : null,
      sales_target:  salesTargetCol !== -1 ? parseNum(row[salesTargetCol]) : null,
      nnm_actual:    nnmCol !== -1         ? parseNum(row[nnmCol])         : null,
      nnm_target:    nnmTargetCol !== -1   ? parseNum(row[nnmTargetCol])   : null,
      cpl:           cplCol !== -1         ? parseNum(row[cplCol])         : null,
      spend_actual:  null,
      spend_budget:  null,
    };
  }

  if (spendHeaderIdx !== -1) {
    const spendHeaders = rows[spendHeaderIdx].map((h) => h.trim());
    const totalCol  = spendHeaders.indexOf("Total");
    const budgetCol = spendHeaders.indexOf("Budget");

    for (let i = spendHeaderIdx + 1; i < rows.length; i++) {
      const row  = rows[i];
      const raw  = row[0]?.trim();
      if (!raw) continue;
      const name = normaliseName(raw);
      if (clubData[name]) {
        if (totalCol !== -1)  clubData[name].spend_actual = parseNum(row[totalCol]);
        if (budgetCol !== -1) clubData[name].spend_budget = parseNum(row[budgetCol]);
      }
    }
  }

  if (Object.keys(clubData).length === 0) {
    throw new Error("No club data found. Check that the CSV is from the correct sheet tab.");
  }

  return clubData;
}

export default function KpiUploadForm({ clubs }: { clubs: Club[] }) {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [month,     setMonth]     = useState(MONTHS[new Date().getMonth()]);
  const [year,      setYear]      = useState(String(CURRENT_YEAR));
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");
  const [fileName,  setFileName]  = useState("");
  const [csvParsed, setCsvParsed] = useState(false);

  const [rows, setRows] = useState<ClubKpiRow[]>(
    clubs.map((c) => ({
      club_id: c.id, leads_actual: "", leads_target: "",
      sales_actual: "", sales_target: "", nnm_actual: "", nnm_target: "",
      cpl: "", spend_actual: "", spend_budget: "",
    }))
  );

  function updateRow(clubId: string, field: keyof ClubKpiRow, value: string) {
    setRows((prev) => prev.map((r) => (r.club_id === clubId ? { ...r, [field]: value } : r)));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setCsvParsed(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text   = ev.target?.result as string;
        const parsed = parseGroupSummaryCSV(text);

        setRows((prev) =>
          prev.map((row) => {
            const club = clubs.find((c) => c.id === row.club_id);
            if (!club) return row;
            const data = parsed[club.name];
            if (!data) return row;
            return {
              ...row,
              leads_actual:  data.leads_actual  != null ? String(data.leads_actual)  : "",
              leads_target:  data.leads_target  != null ? String(data.leads_target)  : "",
              sales_actual:  data.sales_actual  != null ? String(data.sales_actual)  : "",
              sales_target:  data.sales_target  != null ? String(data.sales_target)  : "",
              nnm_actual:    data.nnm_actual    != null ? String(data.nnm_actual)    : "",
              nnm_target:    data.nnm_target    != null ? String(data.nnm_target)    : "",
              cpl:           data.cpl           != null ? String(data.cpl)           : "",
              spend_actual:  data.spend_actual  != null ? String(data.spend_actual)  : "",
              spend_budget:  data.spend_budget  != null ? String(data.spend_budget)  : "",
            };
          })
        );
        setCsvParsed(true);
      } catch (err: any) {
        setError(err.message ?? "Failed to parse CSV. Please check the file.");
      }
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase    = createClient();
    const periodLabel = `${month} ${year}`;
    const monthNum    = MONTHS.indexOf(month) + 1;
    const periodDate  = `${year}-${String(monthNum).padStart(2, "0")}-01`;

    try {
      const { data: period, error: periodErr } = await supabase
        .from("kpi_periods")
        .upsert({ period_label: periodLabel, period_date: periodDate }, { onConflict: "period_label" })
        .select()
        .single();
      if (periodErr) throw periodErr;

      const kpiRows = rows
        .filter((r) => r.leads_actual || r.sales_actual || r.spend_actual || r.nnm_actual)
        .map((r) => ({
          club_id:      r.club_id,
          period_id:    period.id,
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

      if (kpiRows.length === 0) throw new Error("Please enter data for at least one club.");

      const { error: kpiErr } = await supabase
        .from("club_kpis")
        .upsert(kpiRows, { onConflict: "club_id,period_id" });
      if (kpiErr) throw kpiErr;

      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err: any) {
      setError(err.message ?? "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const INPUT_CLASS =
    "w-full px-2.5 py-1.5 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm text-right placeholder-[#3B1F7A] focus:outline-none focus:border-[#7C3AED] transition-colors";

  const FIELDS: { key: keyof ClubKpiRow; label: string }[] = [
    { key: "leads_actual",  label: "Leads"     },
    { key: "leads_target",  label: "Leads Tgt" },
    { key: "sales_actual",  label: "Sales"     },
    { key: "sales_target",  label: "Sales Tgt" },
    { key: "nnm_actual",    label: "NNM"       },
    { key: "nnm_target",    label: "NNM Tgt"   },
    { key: "cpl",           label: "CPL ($)"   },
    { key: "spend_actual",  label: "Spend ($)" },
    { key: "spend_budget",  label: "Budget ($)"},
  ];

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={48} className="text-[#10B981] mb-4" />
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-2">KPIs Saved!</h2>
        <p className="text-[#94A3B8] text-sm">Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Period selector */}
      <div className="bg-[#131729] border border-[#252B45] rounded-xl p-5 mb-6">
        <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Period</div>
        <div className="flex gap-3 flex-wrap items-center">
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED]">
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 bg-[#0B0E1A] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED]">
            {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <div className="px-3 py-2 bg-[#3B1F7A]/40 border border-[#7C3AED]/30 rounded-lg text-[#A78BFA] text-sm font-semibold">
            {month} {year}
          </div>
        </div>
      </div>

      {/* CSV Upload zone */}
      <div className={`border rounded-xl p-5 mb-6 transition-all ${
        csvParsed
          ? "bg-[#064E3B]/20 border-[#10B981]/40"
          : "bg-[#131729] border-dashed border-[#252B45]"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            csvParsed ? "bg-[#064E3B]" : "bg-[#1A1F35]"
          }`}>
            {csvParsed
              ? <CheckCircle size={20} className="text-[#10B981]" />
              : <FileText size={20} className="text-[#64748B]" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#F1F5F9] mb-0.5">
              {csvParsed ? "CSV imported successfully!" : "Import from Google Sheet CSV"}
            </div>
            <div className="text-xs text-[#64748B]">
              {csvParsed
                ? `${fileName} — data pre-filled below. Review then save.`
                : 'In Google Sheets: File → Download → Comma Separated Values (.csv)'
              }
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {csvParsed && (
              <button type="button"
                onClick={() => { setCsvParsed(false); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}
                className="p-1.5 text-[#64748B] hover:text-[#EF4444] transition-colors">
                <X size={16} />
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-lg transition-colors">
              <UploadCloud size={14} />
              {csvParsed ? "Re-upload" : "Upload CSV"}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </div>

      {/* KPI Table */}
      <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden mb-6">
        <div className="bg-[#1A1F35] px-4 py-3 border-b border-[#252B45] flex items-center justify-between">
          <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">
            Club KPIs — {month} {year}
          </div>
          {csvParsed && (
            <span className="text-xs text-[#10B981] font-semibold">✓ Pre-filled from CSV</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0B0E1A]/60 text-[#64748B] text-[10px] uppercase tracking-wide border-b border-[#252B45]">
                <th className="text-left px-4 py-2.5 font-semibold">Club</th>
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
                    <td className="px-4 py-2 font-semibold text-[#F1F5F9] whitespace-nowrap">{club.name}</td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="px-1.5 py-1.5">
                        <input type="number" step="any"
                          value={row[f.key]}
                          onChange={(e) => updateRow(club.id, f.key, e.target.value)}
                          className={INPUT_CLASS}
                          style={{ minWidth: 70 }}
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

      {error && (
        <div className="flex items-start gap-3 bg-[#7F1D1D]/40 border border-[#EF4444]/30 rounded-lg px-4 py-3 mb-4 text-[#EF4444] text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors">
          {loading ? "Saving…" : "Save KPIs"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2.5 bg-[#1A1F35] border border-[#252B45] hover:border-[#3B1F7A] text-[#94A3B8] hover:text-[#F1F5F9] font-semibold rounded-lg text-sm transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
