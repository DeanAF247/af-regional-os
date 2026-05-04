"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, ChevronDown, ChevronRight, Archive } from "lucide-react";

interface Club   { id: string; name: string }
interface Period { id: string; period_label: string; period_date: string }
interface Score  { club_id: string; period_id: string; chs: number | null; osat: number | null }

interface Props {
  clubs:   Club[];
  periods: Period[];
  scores:  Score[];
}

type ScoreType = "chs" | "osat";
type CellKey   = `${string}__${string}__${ScoreType}`;

function cellKey(clubId: string, periodId: string, type: ScoreType): CellKey {
  return `${clubId}__${periodId}__${type}`;
}

function getFY(periodDate: string): number {
  const d = new Date(periodDate); const m = d.getMonth() + 1; const y = d.getFullYear();
  return m >= 7 ? y + 1 : y;
}
function currentFY(): number {
  const now = new Date(); const m = now.getMonth() + 1; const y = now.getFullYear();
  return m >= 7 ? y + 1 : y;
}
function fyLabel(fy: number) {
  return `FY${fy}  (Jul ${String(fy - 1).slice(2)} – Jun ${String(fy).slice(2)})`;
}

export default function ScoresEditor({ clubs, periods, scores }: Props) {
  const thisFY = currentFY();

  // Group periods by FY ascending
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

  // Values map: key → string value for editing
  const [values, setValues] = useState<Record<CellKey, string>>(() => {
    const m: Record<CellKey, string> = {};
    for (const s of scores) {
      if (s.chs  != null) m[cellKey(s.club_id, s.period_id, "chs")]  = String(s.chs);
      if (s.osat != null) m[cellKey(s.club_id, s.period_id, "osat")] = String(s.osat);
    }
    return m;
  });

  const [saving,  setSaving]  = useState<Record<CellKey, "saving" | "saved" | null>>({});
  const [editing, setEditing] = useState<CellKey | null>(null);
  const timers = useRef<Record<CellKey, ReturnType<typeof setTimeout>>>({});

  async function save(clubId: string, periodId: string, type: ScoreType, rawVal: string) {
    const k   = cellKey(clubId, periodId, type);
    const num = parseFloat(rawVal);
    if (isNaN(num)) return;
    setSaving((s) => ({ ...s, [k]: "saving" }));
    const supabase = createClient();
    await supabase.from("club_scores").upsert(
      { club_id: clubId, period_id: periodId, [type]: num, updated_at: new Date().toISOString() },
      { onConflict: "club_id,period_id" }
    );
    setSaving((s) => ({ ...s, [k]: "saved" }));
    if (timers.current[k]) clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => setSaving((s) => ({ ...s, [k]: null })), 2000);
  }

  function handleBlur(clubId: string, periodId: string, type: ScoreType) {
    setEditing(null);
    const k = cellKey(clubId, periodId, type);
    save(clubId, periodId, type, values[k] ?? "");
  }

  function handleKeyDown(e: React.KeyboardEvent, clubId: string, periodId: string, type: ScoreType) {
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
    if (e.key === "Escape") setEditing(null);
  }

  // Average for a period column (across clubs)
  function colAvg(periodId: string, type: ScoreType): number | null {
    const vals = clubs
      .map((c) => values[cellKey(c.id, periodId, type)])
      .filter((v): v is string => v != null && v !== "")
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  // FY YTD: latest score vs July opening
  function fyYTD(clubId: string, fyPeriods: Period[], type: ScoreType): number | null {
    if (fyPeriods.length === 0) return null;
    const openVal  = values[cellKey(clubId, fyPeriods[0].id, type)];
    const latestVal = values[cellKey(clubId, fyPeriods[fyPeriods.length - 1].id, type)];
    if (!openVal || !latestVal) return null;
    const open   = parseFloat(openVal);
    const latest = parseFloat(latestVal);
    return isNaN(open) || isNaN(latest) ? null : latest - open;
  }

  function toggleFY(fy: number) {
    setCollapsed((prev) => { const n = new Set(prev); n.has(fy) ? n.delete(fy) : n.add(fy); return n; });
  }

  function renderTable(type: ScoreType, fyPeriods: Period[]) {
    const label = type === "chs" ? "CHS" : "OSAT";
    const accentColor = type === "chs" ? "text-[#6D28D9]" : "text-[#2563EB]";

    return (
      <div className="mb-4">
        <div className={`px-4 py-2 text-[11px] uppercase tracking-widest font-bold ${accentColor} bg-[#F8FAFC]/50 border-b border-[#E2E8F0]`}>
          {label} — {type === "chs" ? "Club Health Score" : "Overall Satisfaction"}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC]/40 text-[#64748B] text-[11px] uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-[#FFFFFF] min-w-[140px]">Club</th>
                {fyPeriods.map((p) => {
                  const parts = p.period_label.split(" ");
                  return (
                    <th key={p.id} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap min-w-[80px]">
                      {parts[0]?.slice(0, 3)} {parts[1]?.slice(2)}
                    </th>
                  );
                })}
                <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap min-w-[80px] border-l border-[#E2E8F0]">
                  FY Δ
                </th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => {
                const ytd = fyYTD(club.id, fyPeriods, type);
                return (
                  <tr key={club.id} className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/20 transition-colors">
                    <td className="px-4 py-2 font-semibold text-[#0F172A] sticky left-0 bg-[#FFFFFF]">{club.name}</td>
                    {fyPeriods.map((period) => {
                      const k        = cellKey(club.id, period.id, type);
                      const isEditing = editing === k;
                      const val       = values[k] ?? "";
                      const status    = saving[k];
                      return (
                        <td key={period.id} className="px-2 py-1.5 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              value={val}
                              autoFocus
                              onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                              onBlur={() => handleBlur(club.id, period.id, type)}
                              onKeyDown={(e) => handleKeyDown(e, club.id, period.id, type)}
                              className="w-16 px-2 py-1 bg-[#FFFFFF] border border-[#7C3AED] rounded text-right text-[#0F172A] text-sm focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => setEditing(k)}
                              className="w-16 px-2 py-1 text-right rounded hover:bg-[#F8FAFC] transition-colors group"
                            >
                              {status === "saving" ? (
                                <Loader2 size={12} className="animate-spin ml-auto text-[#7C3AED]" />
                              ) : status === "saved" ? (
                                <span className="flex items-center justify-end gap-1 text-[#059669] text-xs">
                                  <Check size={11} />{val || "—"}
                                </span>
                              ) : (
                                <span className={val ? "text-[#0F172A] font-semibold" : "text-[#475569] group-hover:text-[#94A3B8]"}>
                                  {val ? parseFloat(val).toFixed(1) : "—"}
                                </span>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    {/* FY delta */}
                    <td className="px-4 py-2 text-right border-l border-[#E2E8F0]">
                      {ytd == null ? (
                        <span className="text-[#475569] text-xs">—</span>
                      ) : (
                        <span className={`font-bold text-sm ${ytd > 0 ? "text-[#059669]" : ytd < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                          {ytd > 0 ? `+${ytd.toFixed(1)}` : ytd.toFixed(1)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Average row */}
              <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] font-bold">
                <td className={`px-4 py-2.5 sticky left-0 bg-[#F8FAFC] ${accentColor}`}>Average</td>
                {fyPeriods.map((p) => {
                  const avg = colAvg(p.id, type);
                  return (
                    <td key={p.id} className="px-3 py-2.5 text-right text-[#0F172A] pr-4">
                      {avg != null ? avg.toFixed(2) : "—"}
                    </td>
                  );
                })}
                {/* FY avg delta */}
                <td className="px-4 py-2.5 text-right border-l border-[#E2E8F0]">
                  {(() => {
                    const deltas = clubs
                      .map((c) => fyYTD(c.id, fyPeriods, type))
                      .filter((v): v is number => v != null);
                    if (deltas.length === 0) return <span className="text-[#475569]">—</span>;
                    const avg = deltas.reduce((s, v) => s + v, 0) / deltas.length;
                    return (
                      <span className={`font-bold ${avg > 0 ? "text-[#059669]" : avg < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                        {avg > 0 ? `+${avg.toFixed(1)}` : avg.toFixed(1)}
                      </span>
                    );
                  })()}
                </td>
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

        return (
          <div key={fy} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
            {/* FY toggle header */}
            <button
              onClick={() => toggleFY(fy)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]/50 transition-colors border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2.5">
                {isCollapsed ? <ChevronRight size={14} className="text-[#94A3B8]" /> : <ChevronDown size={14} className="text-[#94A3B8]" />}
                {!isCurrentFY && <Archive size={13} className="text-[#475569]" />}
                <span className={`text-sm font-bold ${isCurrentFY ? "text-[#6D28D9]" : "text-[#94A3B8]"}`}>
                  {fyLabel(fy)}
                </span>
                {isCurrentFY && (
                  <span className="text-[10px] bg-[#EDE9FE] text-[#6D28D9] px-2 py-0.5 rounded-full font-semibold">Current</span>
                )}
                {!isCurrentFY && isCollapsed && (
                  <span className="text-[11px] text-[#475569]">{fyPeriods.length} months archived</span>
                )}
              </div>
              <span className="text-[11px] text-[#475569]">{isCollapsed ? "Show" : "Hide"}</span>
            </button>

            {!isCollapsed && (
              <>
                {renderTable("chs",  fyPeriods)}
                {renderTable("osat", fyPeriods)}
                <p className="px-4 py-2.5 text-[11px] text-[#475569] border-t border-[#E2E8F0]">
                  Click any cell to edit · Enter or Tab to save · FY Δ = latest month vs July opening
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
