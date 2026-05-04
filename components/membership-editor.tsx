"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, ChevronDown, ChevronRight, Archive } from "lucide-react";

interface Club    { id: string; name: string }
interface Period  { id: string; period_label: string; period_date: string }
interface Count   { club_id: string; period_id: string; count: number }

interface Props {
  clubs:   Club[];
  periods: Period[];
  counts:  Count[];
}

type CellKey = `${string}__${string}`;

function cellKey(clubId: string, periodId: string): CellKey {
  return `${clubId}__${periodId}`;
}

// Australian FY: July = start. Jul 2025 → FY2026, Mar 2026 → FY2026
function getFY(periodDate: string): number {
  const d = new Date(periodDate);
  const month = d.getMonth() + 1;
  const year  = d.getFullYear();
  return month >= 7 ? year + 1 : year;
}

function currentFY(): number {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  return month >= 7 ? year + 1 : year;
}

function fyLabel(fy: number) {
  // FY2026 = Jul 2025 – Jun 2026
  return `FY${fy}  (Jul ${String(fy - 1).slice(2)} – Jun ${String(fy).slice(2)})`;
}

export default function MembershipEditor({ clubs, periods, counts }: Props) {
  const thisFY = currentFY();

  // Group periods by FY (ascending within each FY)
  const fyGroups: Map<number, Period[]> = new Map();
  for (const p of periods) {
    const fy = getFY(p.period_date);
    if (!fyGroups.has(fy)) fyGroups.set(fy, []);
    fyGroups.get(fy)!.push(p);
  }
  // Sort FYs descending so current is first
  const sortedFYs = [...fyGroups.keys()].sort((a, b) => b - a);

  // Collapsed state: previous FYs start collapsed
  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (const fy of fyGroups.keys()) {
      if (fy < thisFY) s.add(fy);
    }
    return s;
  });

  const [values, setValues] = useState<Record<CellKey, string>>(() => {
    const m: Record<CellKey, string> = {};
    for (const c of counts) {
      m[cellKey(c.club_id, c.period_id)] = String(c.count);
    }
    return m;
  });

  const [saving,  setSaving]  = useState<Record<CellKey, "saving" | "saved" | null>>({});
  const [editing, setEditing] = useState<CellKey | null>(null);
  const timerRef = useRef<Record<CellKey, ReturnType<typeof setTimeout>>>({});

  async function save(clubId: string, periodId: string, rawVal: string) {
    const k   = cellKey(clubId, periodId);
    const num = parseInt(rawVal.replace(/\D/g, ""), 10);
    if (isNaN(num)) return;
    setSaving((s) => ({ ...s, [k]: "saving" }));
    const supabase = createClient();
    await supabase.from("membership_counts").upsert(
      { club_id: clubId, period_id: periodId, count: num, updated_at: new Date().toISOString() },
      { onConflict: "club_id,period_id" }
    );
    setSaving((s) => ({ ...s, [k]: "saved" }));
    if (timerRef.current[k]) clearTimeout(timerRef.current[k]);
    timerRef.current[k] = setTimeout(() => {
      setSaving((s) => ({ ...s, [k]: null }));
    }, 2000);
  }

  function handleBlur(clubId: string, periodId: string) {
    setEditing(null);
    const k = cellKey(clubId, periodId);
    save(clubId, periodId, values[k] ?? "");
  }

  function handleKeyDown(e: React.KeyboardEvent, clubId: string, periodId: string) {
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
    if (e.key === "Escape") setEditing(null);
  }

  function colTotal(periodId: string): number | null {
    const vals = clubs
      .map((c) => values[cellKey(c.id, periodId)])
      .filter((v): v is string => v != null && v !== "")
      .map((v) => parseInt(v, 10))
      .filter((v) => !isNaN(v));
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) : null;
  }

  // FY YTD for a club in a given FY group
  // = latest period count − first period (July) count in that FY
  function fyYTD(clubId: string, fyPeriods: Period[]): { diff: number; opening: number; latest: number } | null {
    if (fyPeriods.length === 0) return null;
    const openingPeriod = fyPeriods[0]; // first = July (sorted asc)
    const latestPeriod  = fyPeriods[fyPeriods.length - 1];
    const openingVal = values[cellKey(clubId, openingPeriod.id)];
    const latestVal  = values[cellKey(clubId, latestPeriod.id)];
    if (!openingVal || !latestVal) return null;
    const opening = parseInt(openingVal, 10);
    const latest  = parseInt(latestVal, 10);
    if (isNaN(opening) || isNaN(latest)) return null;
    return { diff: latest - opening, opening, latest };
  }

  // Group total FY YTD
  function fyYTDTotal(fyPeriods: Period[]): number | null {
    const results = clubs.map((c) => fyYTD(c.id, fyPeriods)).filter((r): r is NonNullable<typeof r> => r != null);
    if (results.length === 0) return null;
    return results.reduce((s, r) => s + r.diff, 0);
  }

  function toggleFY(fy: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(fy)) next.delete(fy);
      else next.add(fy);
      return next;
    });
  }

  return (
    <div className="mb-8 space-y-3">
      {sortedFYs.map((fy) => {
        const fyPeriods = fyGroups.get(fy)!;
        const isCurrentFY = fy === thisFY;
        const isCollapsed = collapsed.has(fy);

        return (
          <div key={fy} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
            {/* FY header / toggle */}
            <button
              onClick={() => toggleFY(fy)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]/50 transition-colors border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2.5">
                {isCollapsed
                  ? <ChevronRight size={14} className="text-[#94A3B8]" />
                  : <ChevronDown size={14} className="text-[#94A3B8]" />
                }
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

            {/* Table */}
            {!isCollapsed && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide">
                        <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#F8FAFC] min-w-[140px]">Club</th>
                        {fyPeriods.map((p) => (
                          <th key={p.id} className="text-right px-3 py-3 font-semibold whitespace-nowrap min-w-[90px]">
                            {p.period_label.split(" ")[0].slice(0, 3)} {p.period_label.split(" ")[1]?.slice(2)}
                          </th>
                        ))}
                        {/* FY YTD column */}
                        <th className="text-right px-4 py-3 font-semibold whitespace-nowrap min-w-[90px] border-l border-[#E2E8F0] bg-[#F8FAFC]">
                          FY YTD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clubs.map((club) => {
                        const ytd = fyYTD(club.id, fyPeriods);
                        return (
                          <tr key={club.id} className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/30 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-[#0F172A] sticky left-0 bg-[#FFFFFF]">
                              {club.name}
                            </td>
                            {fyPeriods.map((period) => {
                              const k = cellKey(club.id, period.id);
                              const isEditing = editing === k;
                              const val = values[k] ?? "";
                              const status = saving[k];
                              return (
                                <td key={period.id} className="px-2 py-1.5 text-right">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min={0}
                                      value={val}
                                      autoFocus
                                      onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                                      onBlur={() => handleBlur(club.id, period.id)}
                                      onKeyDown={(e) => handleKeyDown(e, club.id, period.id)}
                                      className="w-20 px-2 py-1 bg-[#FFFFFF] border border-[#7C3AED] rounded text-right text-[#0F172A] text-sm focus:outline-none"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => setEditing(k)}
                                      className="w-20 px-2 py-1 text-right rounded hover:bg-[#F8FAFC] transition-colors group"
                                    >
                                      {status === "saving" ? (
                                        <Loader2 size={12} className="animate-spin ml-auto text-[#7C3AED]" />
                                      ) : status === "saved" ? (
                                        <span className="flex items-center justify-end gap-1 text-[#059669] text-xs">
                                          <Check size={11} />
                                          {val || "—"}
                                        </span>
                                      ) : (
                                        <span className={val ? "text-[#0F172A] font-semibold" : "text-[#475569] group-hover:text-[#94A3B8]"}>
                                          {val ? parseInt(val).toLocaleString() : "—"}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                            {/* FY YTD cell */}
                            <td className="px-4 py-2.5 text-right border-l border-[#E2E8F0]">
                              {ytd == null ? (
                                <span className="text-[#475569] text-xs">—</span>
                              ) : (
                                <span className={`font-bold text-sm ${ytd.diff > 0 ? "text-[#059669]" : ytd.diff < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                                  {ytd.diff > 0 ? `+${ytd.diff.toLocaleString()}` : ytd.diff.toLocaleString()}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Group Total row */}
                      <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] font-bold">
                        <td className="px-4 py-3 text-[#6D28D9] sticky left-0 bg-[#F8FAFC]">Group Total</td>
                        {fyPeriods.map((p) => {
                          const total = colTotal(p.id);
                          return (
                            <td key={p.id} className="px-2 py-3 text-right text-[#0F172A] pr-4">
                              {total != null ? total.toLocaleString() : "—"}
                            </td>
                          );
                        })}
                        {/* Group FY YTD */}
                        <td className="px-4 py-3 text-right border-l border-[#E2E8F0]">
                          {(() => {
                            const total = fyYTDTotal(fyPeriods);
                            if (total == null) return <span className="text-[#475569]">—</span>;
                            return (
                              <span className={`font-bold ${total > 0 ? "text-[#059669]" : total < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                                {total > 0 ? `+${total.toLocaleString()}` : total.toLocaleString()}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="px-4 py-2.5 text-[11px] text-[#475569] border-t border-[#E2E8F0]">
                  Click any cell to edit · Enter or Tab to save · FY YTD = latest month vs July opening
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
