"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, ChevronDown, ChevronRight, Archive } from "lucide-react";

interface Club     { id: string; name: string }
interface Period   { id: string; period_label: string; period_date: string }
interface FpRecord { club_id: string; period_id: string; count: number }
interface Count    { club_id: string; period_id: string; count: number }

interface Props {
  clubs:     Club[];
  periods:   Period[];
  fpRecords: FpRecord[];
  ddCounts:  Count[];
}

type CellKey = `${string}__${string}`; // clubId__periodId

function cellKey(clubId: string, periodId: string): CellKey {
  return `${clubId}__${periodId}`;
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

export default function FpSummary({ clubs, periods, fpRecords, ddCounts }: Props) {
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

  const [values, setValues] = useState<Record<CellKey, string>>(() => {
    const m: Record<CellKey, string> = {};
    for (const r of fpRecords) { m[cellKey(r.club_id, r.period_id)] = String(r.count); }
    return m;
  });

  useEffect(() => {
    const m: Record<CellKey, string> = {};
    for (const r of fpRecords) { m[cellKey(r.club_id, r.period_id)] = String(r.count); }
    setValues(m);
  }, [fpRecords]);

  const [saving,  setSaving]  = useState<Record<CellKey, "saving" | "saved" | null>>({});
  const [editing, setEditing] = useState<CellKey | null>(null);
  const timers = useRef<Record<CellKey, ReturnType<typeof setTimeout>>>({});

  async function save(clubId: string, periodId: string, rawVal: string) {
    const k   = cellKey(clubId, periodId);
    const num = parseInt(rawVal.replace(/\D/g, ""), 10);
    if (isNaN(num)) return;
    setSaving((s) => ({ ...s, [k]: "saving" }));
    await createClient().from("fp_members").upsert(
      { club_id: clubId, period_id: periodId, count: num, updated_at: new Date().toISOString() },
      { onConflict: "club_id,period_id" }
    );
    setSaving((s) => ({ ...s, [k]: "saved" }));
    if (timers.current[k]) clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => setSaving((s) => ({ ...s, [k]: null })), 2000);
  }

  function handleBlur(clubId: string, periodId: string) {
    setEditing(null);
    const k = cellKey(clubId, periodId);
    save(clubId, periodId, values[k] ?? "");
  }

  // DD total for a period across all clubs
  function ddColTotal(periodId: string): number | null {
    const vals = ddCounts.filter((c) => c.period_id === periodId).map((c) => c.count);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) : null;
  }

  // FP total for a period across all clubs
  function fpColTotal(periodId: string): number | null {
    const vals = clubs
      .map((c) => values[cellKey(c.id, periodId)])
      .filter((v): v is string => v != null && v !== "")
      .map((v) => parseInt(v, 10))
      .filter((v) => !isNaN(v));
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) : null;
  }

  function toggleFY(fy: number) {
    setCollapsed((prev) => { const n = new Set(prev); n.has(fy) ? n.delete(fy) : n.add(fy); return n; });
  }

  return (
    <div className="mb-8 space-y-3">
      {sortedFYs.map((fy) => {
        const fyPeriods   = fyGroups.get(fy)!;
        const isCurrentFY = fy === thisFY;
        const isCollapsed = collapsed.has(fy);

        return (
          <div key={fy} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
            {/* FY header */}
            <button
              onClick={() => toggleFY(fy)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]/50 transition-colors border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2.5">
                {isCollapsed ? <ChevronRight size={14} className="text-[#94A3B8]" /> : <ChevronDown size={14} className="text-[#94A3B8]" />}
                {!isCurrentFY && <Archive size={13} className="text-[#475569]" />}
                <span className={`text-sm font-bold ${isCurrentFY ? "text-[#6D28D9]" : "text-[#94A3B8]"}`}>{fyLabel(fy)}</span>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide">
                        <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#F8FAFC] min-w-[160px]">Club</th>
                        {fyPeriods.map((p) => {
                          const parts = p.period_label.split(" ");
                          return (
                            <th key={p.id} className="text-right px-3 py-3 font-semibold whitespace-nowrap min-w-[90px]">
                              {parts[0]?.slice(0, 3)} {parts[1]?.slice(2)}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>

                      {/* ── Fitness Passport per-club rows ── */}
                      <tr>
                        <td colSpan={fyPeriods.length + 1} className="px-4 pt-3 pb-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-[#2563EB]">Fitness Passport Members</span>
                        </td>
                      </tr>
                      {clubs.map((club) => (
                        <tr key={club.id} className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/20 transition-colors">
                          <td className="px-4 py-2 font-semibold text-[#0F172A] sticky left-0 bg-[#FFFFFF] pl-6">{club.name}</td>
                          {fyPeriods.map((period) => {
                            const k        = cellKey(club.id, period.id);
                            const isEdit   = editing === k;
                            const val      = values[k] ?? "";
                            const status   = saving[k];
                            return (
                              <td key={period.id} className="px-2 py-1.5 text-right">
                                {isEdit ? (
                                  <input
                                    type="number" min={0} value={val} autoFocus
                                    onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                                    onBlur={() => handleBlur(club.id, period.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
                                      if (e.key === "Escape") setEditing(null);
                                    }}
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
                                      <span className="flex items-center justify-end gap-1 text-[#059669] text-xs"><Check size={11} />{val || "—"}</span>
                                    ) : (
                                      <span className={val ? "text-[#2563EB] font-semibold" : "text-[#475569] group-hover:text-[#94A3B8]"}>
                                        {val ? parseInt(val).toLocaleString() : "—"}
                                      </span>
                                    )}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* FP Group Total */}
                      <tr className="border-t border-[#E2E8F0] bg-[#F8FAFC]/50">
                        <td className="px-4 py-2.5 font-bold text-[#2563EB] sticky left-0 bg-[#F8FAFC]/50 pl-6">FP Total</td>
                        {fyPeriods.map((p) => {
                          const total = fpColTotal(p.id);
                          return (
                            <td key={p.id} className="px-3 py-2.5 text-right font-bold text-[#2563EB] pr-4">
                              {total != null ? total.toLocaleString() : "—"}
                            </td>
                          );
                        })}
                      </tr>

                      {/* DD + FP + Grand Total summary */}
                      <tr className="border-t-2 border-[#E2E8F0]">
                        <td colSpan={fyPeriods.length + 1} className="px-4 pt-3 pb-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-[#64748B]">Group Summary</span>
                        </td>
                      </tr>
                      <tr className="border-t border-[#E2E8F0]/40">
                        <td className="px-4 py-2.5 text-[#64748B] font-semibold sticky left-0 bg-[#FFFFFF]">
                          DD Members <span className="text-[10px] font-normal text-[#475569] ml-1">from club counts</span>
                        </td>
                        {fyPeriods.map((p) => {
                          const dd = ddColTotal(p.id);
                          return <td key={p.id} className="px-3 py-2.5 text-right text-[#64748B] pr-4">{dd != null ? dd.toLocaleString() : "—"}</td>;
                        })}
                      </tr>
                      <tr className="border-t border-[#E2E8F0]/40">
                        <td className="px-4 py-2.5 text-[#2563EB] font-semibold sticky left-0 bg-[#FFFFFF]">Fitness Passport</td>
                        {fyPeriods.map((p) => {
                          const fp = fpColTotal(p.id);
                          return <td key={p.id} className="px-3 py-2.5 text-right text-[#2563EB] font-semibold pr-4">{fp != null ? fp.toLocaleString() : "—"}</td>;
                        })}
                      </tr>
                      <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] font-bold">
                        <td className="px-4 py-3 text-[#6D28D9] sticky left-0 bg-[#F8FAFC]">Total Members</td>
                        {fyPeriods.map((p) => {
                          const dd    = ddColTotal(p.id);
                          const fp    = fpColTotal(p.id);
                          const total = dd != null || fp != null ? (dd ?? 0) + (fp ?? 0) : null;
                          return <td key={p.id} className="px-3 py-3 text-right text-[#0F172A] pr-4">{total != null ? total.toLocaleString() : "—"}</td>;
                        })}
                      </tr>

                    </tbody>
                  </table>
                </div>
                <p className="px-4 py-2.5 text-[11px] text-[#475569] border-t border-[#E2E8F0]">
                  Click any Fitness Passport cell to edit · DD Members auto-summed from club counts · Total = DD + FP
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
