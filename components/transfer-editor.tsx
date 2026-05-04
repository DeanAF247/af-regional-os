"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface Club     { id: string; name: string }
interface Period   { id: string; period_label: string; period_date: string }
interface Transfer { club_id: string; period_id: string; transfers_in: number; transfers_out: number }

interface Props {
  clubs:     Club[];
  periods:   Period[];
  transfers: Transfer[];
}

type Field = "in" | "out";
type CellKey = `${string}__${string}__${"in" | "out"}`;

function key(clubId: string, periodId: string, field: Field): CellKey {
  return `${clubId}__${periodId}__${field}`;
}

export default function TransferEditor({ clubs, periods, transfers }: Props) {
  const [values, setValues] = useState<Record<CellKey, string>>(() => {
    const m: Record<CellKey, string> = {};
    for (const t of transfers) {
      m[key(t.club_id, t.period_id, "in")]  = String(t.transfers_in);
      m[key(t.club_id, t.period_id, "out")] = String(t.transfers_out);
    }
    return m;
  });

  const [saving, setSaving] = useState<Record<CellKey, "saving" | "saved" | null>>({});
  const [editing, setEditing] = useState<CellKey | null>(null);
  const timerRef = useRef<Record<CellKey, ReturnType<typeof setTimeout>>>({});

  async function save(clubId: string, periodId: string, field: Field, rawVal: string) {
    const k = key(clubId, periodId, field);
    const num = Math.max(0, parseInt(rawVal.replace(/\D/g, ""), 10) || 0);

    // Get current values for the other field
    const inVal  = field === "in"  ? num : (parseInt(values[key(clubId, periodId, "in")]  || "0", 10) || 0);
    const outVal = field === "out" ? num : (parseInt(values[key(clubId, periodId, "out")] || "0", 10) || 0);

    setSaving((s) => ({ ...s, [k]: "saving" }));
    const supabase = createClient();
    await supabase.from("transfers").upsert(
      {
        club_id:       clubId,
        period_id:     periodId,
        transfers_in:  inVal,
        transfers_out: outVal,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: "club_id,period_id" }
    );
    setSaving((s) => ({ ...s, [k]: "saved" }));

    if (timerRef.current[k]) clearTimeout(timerRef.current[k]);
    timerRef.current[k] = setTimeout(() => {
      setSaving((s) => ({ ...s, [k]: null }));
    }, 2000);
  }

  function handleBlur(clubId: string, periodId: string, field: Field) {
    setEditing(null);
    save(clubId, periodId, field, values[key(clubId, periodId, field)] ?? "0");
  }

  function handleKeyDown(e: React.KeyboardEvent, clubId: string, periodId: string, field: Field) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
    }
    if (e.key === "Escape") setEditing(null);
  }

  function getNum(clubId: string, periodId: string, field: Field): number {
    return parseInt(values[key(clubId, periodId, field)] || "0", 10) || 0;
  }

  function renderCell(clubId: string, periodId: string, field: Field) {
    const k = key(clubId, periodId, field);
    const isEditing = editing === k;
    const val = values[k] ?? "";
    const status = saving[k];
    const isIn = field === "in";
    const color = isIn ? "text-[#059669]" : "text-[#EF4444]";

    return (
      <div className="flex items-center justify-end gap-1">
        {isIn
          ? <ArrowDownLeft size={10} className="text-[#059669] flex-shrink-0" />
          : <ArrowUpRight  size={10} className="text-[#EF4444] flex-shrink-0" />
        }
        {isEditing ? (
          <input
            type="number"
            min={0}
            value={val}
            autoFocus
            onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
            onBlur={() => handleBlur(clubId, periodId, field)}
            onKeyDown={(e) => handleKeyDown(e, clubId, periodId, field)}
            className="w-14 px-1.5 py-0.5 bg-[#FFFFFF] border border-[#7C3AED] rounded text-right text-[#0F172A] text-xs focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(k)}
            className="w-14 text-right px-1 py-0.5 rounded hover:bg-[#E2E8F0] transition-colors"
          >
            {status === "saving" ? (
              <Loader2 size={10} className="animate-spin ml-auto" />
            ) : status === "saved" ? (
              <span className="flex items-center justify-end gap-0.5 text-[#059669] text-[10px]">
                <Check size={9} />{val || "0"}
              </span>
            ) : (
              <span className={`text-xs font-semibold ${val && val !== "0" ? color : "text-[#475569]"}`}>
                {val && val !== "0" ? val : "—"}
              </span>
            )}
          </button>
        )}
      </div>
    );
  }

  // Column group totals
  function colTotals(periodId: string) {
    let totalIn = 0, totalOut = 0;
    for (const club of clubs) {
      totalIn  += getNum(club.id, periodId, "in");
      totalOut += getNum(club.id, periodId, "out");
    }
    return { totalIn, totalOut, net: totalIn - totalOut };
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden mb-8">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#F8FAFC] min-w-[150px]">Club</th>
              {periods.map((p) => (
                <th key={p.id} className="text-right px-3 py-3 font-semibold whitespace-nowrap min-w-[100px]">
                  {p.period_label.split(" ")[0].slice(0, 3)} {p.period_label.split(" ")[1]?.slice(2)}
                </th>
              ))}
              <th className="text-right px-4 py-3 font-semibold min-w-[70px]">YTD Net</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map((club) => {
              let ytdIn = 0, ytdOut = 0;
              for (const p of periods) {
                ytdIn  += getNum(club.id, p.id, "in");
                ytdOut += getNum(club.id, p.id, "out");
              }
              const ytdNet = ytdIn - ytdOut;

              return (
                <tr key={club.id} className="border-t border-[#E2E8F0]/60">
                  {/* Club name — spans 2 sub-rows via rowSpan isn't easy in React, so use a single row with stacked cells */}
                  <td className="px-4 py-2 font-semibold text-[#0F172A] sticky left-0 bg-[#FFFFFF] align-middle">
                    {club.name}
                  </td>
                  {periods.map((p) => {
                    const inVal  = getNum(club.id, p.id, "in");
                    const outVal = getNum(club.id, p.id, "out");
                    const net    = inVal - outVal;
                    return (
                      <td key={p.id} className="px-2 py-1.5 text-right align-middle">
                        <div className="flex flex-col gap-0.5 items-end">
                          {renderCell(club.id, p.id, "in")}
                          {renderCell(club.id, p.id, "out")}
                          {(inVal > 0 || outVal > 0) && (
                            <span className={`text-[10px] font-bold border-t border-[#E2E8F0] pt-0.5 w-full text-right ${net > 0 ? "text-[#059669]" : net < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                              {net > 0 ? `+${net}` : net}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right align-middle">
                    <span className={`text-sm font-bold ${ytdNet > 0 ? "text-[#059669]" : ytdNet < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                      {ytdIn > 0 || ytdOut > 0 ? (ytdNet > 0 ? `+${ytdNet}` : ytdNet) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* Group total row */}
            <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] font-bold">
              <td className="px-4 py-3 text-[#6D28D9] sticky left-0 bg-[#F8FAFC]">Group Total</td>
              {periods.map((p) => {
                const { totalIn, totalOut, net } = colTotals(p.id);
                return (
                  <td key={p.id} className="px-3 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[#059669] text-xs">↓ {totalIn > 0 ? totalIn : "—"}</span>
                      <span className="text-[#EF4444] text-xs">↑ {totalOut > 0 ? totalOut : "—"}</span>
                      {(totalIn > 0 || totalOut > 0) && (
                        <span className={`text-xs font-bold border-t border-[#E2E8F0]/60 pt-0.5 ${net > 0 ? "text-[#059669]" : net < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                          Net {net > 0 ? `+${net}` : net}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right">
                {(() => {
                  let tIn = 0, tOut = 0;
                  for (const p of periods) {
                    const t = colTotals(p.id);
                    tIn  += t.totalIn;
                    tOut += t.totalOut;
                  }
                  const net = tIn - tOut;
                  return (
                    <span className={`text-sm font-bold ${net > 0 ? "text-[#059669]" : net < 0 ? "text-[#EF4444]" : "text-[#94A3B8]"}`}>
                      {tIn > 0 || tOut > 0 ? (net > 0 ? `+${net}` : net) : "—"}
                    </span>
                  );
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2.5 text-[11px] text-[#475569] border-t border-[#E2E8F0]">
        ↓ In = members transferring into this club &nbsp;·&nbsp; ↑ Out = members leaving to another club &nbsp;·&nbsp; Click to edit · Enter to save
      </p>
    </div>
  );
}
