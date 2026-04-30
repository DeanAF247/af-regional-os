"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, ChevronDown, ChevronRight, Archive } from "lucide-react";

interface Club        { id: string; name: string }
interface Period      { id: string; period_label: string; period_date: string }
interface YieldRecord { period_id: string; dd_yield: number | null; fp_yield: number | null }
interface ClubYield   { club_id: string; period_id: string; dd_yield: number | null; fp_yield: number | null }

interface Props {
  clubs:            Club[];
  periods:          Period[];
  yieldRecords:     YieldRecord[];
  clubYieldRecords: ClubYield[];
}

type FieldType = "dd_yield" | "fp_yield";

// Group-level key: "group__periodId__field"
// Club-level key:  "clubId__periodId__field"
type CellKey = string;

function groupKey(periodId: string, field: FieldType): CellKey {
  return `group__${periodId}__${field}`;
}
function clubKey(clubId: string, periodId: string, field: FieldType): CellKey {
  return `${clubId}__${periodId}__${field}`;
}

function getFY(d: string) {
  const dt = new Date(d); const m = dt.getMonth() + 1; const y = dt.getFullYear();
  return m >= 7 ? y + 1 : y;
}
function currentFY() {
  const now = new Date(); const m = now.getMonth() + 1; const y = now.getFullYear();
  return m >= 7 ? y + 1 : y;
}
function fyLabel(fy: number) {
  return `FY${fy}  (Jul ${String(fy - 1).slice(2)} – Jun ${String(fy).slice(2)})`;
}
function fmtCurrency(val: string | undefined): string {
  if (!val || val === "") return "—";
  const n = parseFloat(val);
  return isNaN(n) ? "—" : `$${n.toFixed(2)}`;
}
function shortPeriod(label: string): string {
  const parts = label.split(" ");
  return `${parts[0]?.slice(0, 3)} ${parts[1]?.slice(2) ?? ""}`;
}

export default function YieldEditor({ clubs, periods, yieldRecords, clubYieldRecords }: Props) {
  const thisFY = currentFY();

  const fyGroups = new Map<number, Period[]>();
  for (const p of periods) {
    const fy = getFY(p.period_date);
    if (!fyGroups.has(fy)) fyGroups.set(fy, []);
    fyGroups.get(fy)!.push(p);
  }
  const sortedFYs = [...fyGroups.keys()].sort((a, b) => b - a);

  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (const fy of fyGroups.keys()) { if (fy < thisFY) s.add(fy); }
    return s;
  });

  // Initialise values from both group and club records
  function buildValues(): Record<CellKey, string> {
    const m: Record<CellKey, string> = {};
    for (const r of yieldRecords) {
      if (r.dd_yield != null) m[groupKey(r.period_id, "dd_yield")] = String(r.dd_yield);
      if (r.fp_yield != null) m[groupKey(r.period_id, "fp_yield")] = String(r.fp_yield);
    }
    for (const r of clubYieldRecords) {
      if (r.dd_yield != null) m[clubKey(r.club_id, r.period_id, "dd_yield")] = String(r.dd_yield);
      if (r.fp_yield != null) m[clubKey(r.club_id, r.period_id, "fp_yield")] = String(r.fp_yield);
    }
    return m;
  }

  const [values, setValues] = useState<Record<CellKey, string>>(buildValues);

  useEffect(() => { setValues(buildValues()); }, [yieldRecords, clubYieldRecords]);

  const [saving,  setSaving]  = useState<Record<CellKey, "saving" | "saved" | null>>({});
  const [editing, setEditing] = useState<CellKey | null>(null);
  const timers = useRef<Record<CellKey, ReturnType<typeof setTimeout>>>({});

  async function saveGroup(periodId: string, field: FieldType, rawVal: string) {
    const k   = groupKey(periodId, field);
    const num = parseFloat(rawVal);
    if (isNaN(num)) return;
    setSaving((s) => ({ ...s, [k]: "saving" }));
    await createClient().from("yield_records").upsert(
      { period_id: periodId, [field]: num, updated_at: new Date().toISOString() },
      { onConflict: "period_id" }
    );
    setSaving((s) => ({ ...s, [k]: "saved" }));
    if (timers.current[k]) clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => setSaving((s) => ({ ...s, [k]: null })), 2000);
  }

  async function saveClub(clubId: string, periodId: string, field: FieldType, rawVal: string) {
    const k   = clubKey(clubId, periodId, field);
    const num = parseFloat(rawVal);
    if (isNaN(num)) return;
    setSaving((s) => ({ ...s, [k]: "saving" }));
    await createClient().from("club_yield_records").upsert(
      { club_id: clubId, period_id: periodId, [field]: num, updated_at: new Date().toISOString() },
      { onConflict: "club_id,period_id" }
    );
    setSaving((s) => ({ ...s, [k]: "saved" }));
    if (timers.current[k]) clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => setSaving((s) => ({ ...s, [k]: null })), 2000);
  }

  function toggleFY(fy: number) {
    setCollapsed((prev) => { const n = new Set(prev); n.has(fy) ? n.delete(fy) : n.add(fy); return n; });
  }

  function fyAvg(fyPeriods: Period[], key: (p: Period) => CellKey): number | null {
    const vals = fyPeriods
      .map((p) => values[key(p)])
      .filter((v): v is string => v != null && v !== "")
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  function colAvg(periodId: string, field: FieldType): number | null {
    const vals = clubs
      .map((c) => values[clubKey(c.id, periodId, field)])
      .filter((v): v is string => v != null && v !== "")
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  // Generic cell renderer
  function renderCell(
    k: CellKey,
    onBlurSave: () => void,
    accentClass: string,
    widthClass = "w-28"
  ) {
    const isEdit = editing === k;
    const val    = values[k] ?? "";
    const status = saving[k];

    if (isEdit) {
      return (
        <input
          type="number" step="0.01" min={0} value={val} autoFocus
          onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
          onBlur={() => { setEditing(null); onBlurSave(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
            if (e.key === "Escape") setEditing(null);
          }}
          className={`${widthClass} px-2 py-1 bg-[#0B0E1A] border border-[#7C3AED] rounded text-right text-[#F1F5F9] text-sm focus:outline-none`}
        />
      );
    }
    return (
      <button
        onClick={() => setEditing(k)}
        className={`${widthClass} px-2 py-1 text-right rounded hover:bg-[#1A1F35] transition-colors group`}
      >
        {status === "saving" ? (
          <Loader2 size={12} className="animate-spin ml-auto text-[#7C3AED]" />
        ) : status === "saved" ? (
          <span className="flex items-center justify-end gap-1 text-[#10B981] text-xs">
            <Check size={11} />{fmtCurrency(val)}
          </span>
        ) : (
          <span className={val ? `${accentClass} font-semibold` : "text-[#475569] group-hover:text-[#64748B]"}>
            {fmtCurrency(val)}
          </span>
        )}
      </button>
    );
  }

  // Per-club table for a given field
  function renderClubTable(field: FieldType, fyPeriods: Period[]) {
    const isDD     = field === "dd_yield";
    const label    = isDD ? "DD Yield — by Club" : "Avg FP Member Per Month — by Club";
    const accent   = isDD ? "text-[#A78BFA]" : "text-[#60A5FA]";
    const accentBg = isDD ? "bg-[#3B1F7A]/20" : "bg-[#1E3A5F]/20";

    return (
      <div className="border-t border-[#252B45]">
        <div className={`px-4 py-2 text-[11px] uppercase tracking-widest font-bold ${accent} bg-[#1A1F35]/50 border-b border-[#252B45]`}>
          {label}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1A1F35]/40 text-[#94A3B8] text-[11px] uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-[#131729] min-w-[160px]">Club</th>
                {fyPeriods.map((p) => (
                  <th key={p.id} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap min-w-[110px]">
                    {shortPeriod(p.period_label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => (
                <tr key={club.id} className="border-t border-[#252B45]/60 hover:bg-[#1A1F35]/20 transition-colors">
                  <td className="px-4 py-2 font-semibold text-[#F1F5F9] sticky left-0 bg-[#131729] pl-6">{club.name}</td>
                  {fyPeriods.map((period) => {
                    const k = clubKey(club.id, period.id, field);
                    return (
                      <td key={period.id} className="px-2 py-1.5 text-right">
                        {renderCell(k, () => saveClub(club.id, period.id, field, values[k] ?? ""), accent, "w-24")}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Group average row */}
              <tr className="border-t-2 border-[#252B45] bg-[#1A1F35] font-bold">
                <td className={`px-4 py-2.5 ${accent} sticky left-0 bg-[#1A1F35] pl-6`}>Group Avg</td>
                {fyPeriods.map((p) => {
                  const avg = colAvg(p.id, field);
                  return (
                    <td key={p.id} className={`px-3 py-2.5 text-right ${accent} pr-4`}>
                      {avg != null ? `$${avg.toFixed(2)}` : "—"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-3">
      {sortedFYs.map((fy) => {
        const fyPeriods   = fyGroups.get(fy)!;
        const isCurrentFY = fy === thisFY;
        const isCollapsed = collapsed.has(fy);

        const ddGroupAvg = fyAvg(fyPeriods, (p) => groupKey(p.id, "dd_yield"));
        const fpGroupAvg = fyAvg(fyPeriods, (p) => groupKey(p.id, "fp_yield"));

        return (
          <div key={fy} className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">

            {/* FY header */}
            <button
              onClick={() => toggleFY(fy)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1A1F35]/50 transition-colors border-b border-[#252B45]"
            >
              <div className="flex items-center gap-2.5">
                {isCollapsed ? <ChevronRight size={14} className="text-[#64748B]" /> : <ChevronDown size={14} className="text-[#64748B]" />}
                {!isCurrentFY && <Archive size={13} className="text-[#475569]" />}
                <span className={`text-sm font-bold ${isCurrentFY ? "text-[#A78BFA]" : "text-[#64748B]"}`}>{fyLabel(fy)}</span>
                {isCurrentFY && (
                  <span className="text-[10px] bg-[#3B1F7A] text-[#A78BFA] px-2 py-0.5 rounded-full font-semibold">Current</span>
                )}
                {!isCurrentFY && isCollapsed && (
                  <span className="text-[11px] text-[#475569]">{fyPeriods.length} months archived</span>
                )}
              </div>
              <span className="text-[11px] text-[#475569]">{isCollapsed ? "Show" : "Hide"}</span>
            </button>

            {!isCollapsed && (
              <>
                {/* ── Group Summary ── */}
                <div className="px-4 py-2 text-[11px] uppercase tracking-widest font-bold text-[#94A3B8] bg-[#1A1F35]/50 border-b border-[#252B45]">
                  Group Summary
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1A1F35]/40 text-[#94A3B8] text-[11px] uppercase tracking-wide">
                        <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#131729] min-w-[160px]">Month</th>
                        <th className="text-right px-4 py-3 font-semibold whitespace-nowrap min-w-[160px]">
                          <span className="text-[#A78BFA]">DD Yield Average</span>
                        </th>
                        <th className="text-right px-4 py-3 font-semibold whitespace-nowrap min-w-[200px]">
                          <span className="text-[#60A5FA]">Avg FP Member Per Month</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fyPeriods.map((period) => {
                        const ddK = groupKey(period.id, "dd_yield");
                        const fpK = groupKey(period.id, "fp_yield");
                        return (
                          <tr key={period.id} className="border-t border-[#252B45]/60 hover:bg-[#1A1F35]/20 transition-colors">
                            <td className="px-4 py-2 font-semibold text-[#F1F5F9] sticky left-0 bg-[#131729]">
                              {period.period_label}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {renderCell(ddK, () => saveGroup(period.id, "dd_yield", values[ddK] ?? ""), "text-[#A78BFA]")}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {renderCell(fpK, () => saveGroup(period.id, "fp_yield", values[fpK] ?? ""), "text-[#60A5FA]")}
                            </td>
                          </tr>
                        );
                      })}
                      {/* FY Average */}
                      <tr className="border-t-2 border-[#252B45] bg-[#1A1F35] font-bold">
                        <td className="px-4 py-2.5 text-[#94A3B8] sticky left-0 bg-[#1A1F35]">FY Average</td>
                        <td className="px-4 py-2.5 text-right text-[#A78BFA]">
                          {ddGroupAvg != null ? `$${ddGroupAvg.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#60A5FA]">
                          {fpGroupAvg != null ? `$${fpGroupAvg.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ── Per-Club Breakdowns ── */}
                {renderClubTable("dd_yield", fyPeriods)}
                {renderClubTable("fp_yield", fyPeriods)}

                <p className="px-4 py-2.5 text-[11px] text-[#475569] border-t border-[#252B45]">
                  Click any cell to edit · Enter or Tab to save · Group Avg auto-calculated from entered clubs
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
