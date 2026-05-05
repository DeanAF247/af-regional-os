"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, AlertCircle } from "lucide-react";

interface Club  { id: string; name: string; }
interface Month { period_id: string; label: string; }

// Forecast columns — add new ones here as needed in future
const FORECAST_FIELDS: { key: string; label: string }[] = [
  { key: "net_member_movement", label: "Net Member Movement" },
];

// cell value keyed by `${clubId}__${periodId}__${field}`
type CellMap = Record<string, string>;

function cellKey(clubId: string, periodId: string, field: string) {
  return `${clubId}__${periodId}__${field}`;
}

function numOrNull(v: string): number | null {
  const n = parseInt(v.replace(/[,$\s]/g, ""), 10);
  return isNaN(n) ? null : n;
}

const INPUT = "w-full px-2 py-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm text-right focus:outline-none focus:border-[#7C3AED] transition-colors placeholder:text-[#CBD5E1]";

export default function ForecastEntryForm({
  clubs,
  months,
}: {
  clubs:  Club[];
  months: Month[];
}) {
  const [cells,   setCells]   = useState<CellMap>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  // Load existing forecasts on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const periodIds = months.map((m) => m.period_id);
      if (periodIds.length === 0) { setLoading(false); return; }

      const { data, error: err } = await supabase
        .from("club_forecasts")
        .select("*")
        .in("period_id", periodIds);

      if (err) { setError(err.message); setLoading(false); return; }

      const map: CellMap = {};
      (data ?? []).forEach((row: any) => {
        FORECAST_FIELDS.forEach((f) => {
          if (row[f.key] != null) {
            map[cellKey(row.club_id, row.period_id, f.key)] = String(row[f.key]);
          }
        });
      });
      setCells(map);
      setLoading(false);
    }
    load();
  }, [months]);

  function updateCell(clubId: string, periodId: string, field: string, value: string) {
    setCells((prev) => ({ ...prev, [cellKey(clubId, periodId, field)]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    const supabase = createClient();

    try {
      // Build one row per club+period that has at least one value
      const rows: any[] = [];
      clubs.forEach((club) => {
        months.forEach((month) => {
          const fieldValues: any = {
            club_id:   club.id,
            period_id: month.period_id,
          };
          let hasValue = false;
          FORECAST_FIELDS.forEach((f) => {
            const raw = cells[cellKey(club.id, month.period_id, f.key)] ?? "";
            fieldValues[f.key] = numOrNull(raw);
            if (raw !== "") hasValue = true;
          });
          if (hasValue) rows.push(fieldValues);
        });
      });

      if (rows.length === 0) {
        throw new Error("Enter at least one forecast value before saving.");
      }

      const { error: err } = await supabase
        .from("club_forecasts")
        .upsert(rows, { onConflict: "club_id,period_id" });
      if (err) throw err;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#94A3B8] text-sm animate-pulse">
        Loading forecasts…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {FORECAST_FIELDS.map((field) => (
        <div key={field.key} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">
              {field.label}
            </span>
            <span className="text-[11px] text-[#94A3B8]">Tab between cells to move quickly</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FFFFFF]/60 text-[#94A3B8] text-[10px] uppercase tracking-wide border-b border-[#E2E8F0]">
                  <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-[#FFFFFF]/80 whitespace-nowrap">
                    Club
                  </th>
                  {months.map((m) => (
                    <th key={m.period_id} className="text-right px-2 py-2.5 font-semibold whitespace-nowrap">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clubs.map((club, i) => (
                  <tr
                    key={club.id}
                    className={`border-t border-[#E2E8F0]/60 ${i % 2 === 1 ? "bg-[#F8FAFC]/20" : ""}`}
                  >
                    <td className="px-4 py-2 font-semibold text-[#0F172A] whitespace-nowrap sticky left-0 bg-[#FFFFFF]">
                      {club.name}
                    </td>
                    {months.map((m) => (
                      <td key={m.period_id} className="px-1.5 py-1.5">
                        <input
                          type="number"
                          step="1"
                          placeholder="—"
                          value={cells[cellKey(club.id, m.period_id, field.key)] ?? ""}
                          onChange={(e) => updateCell(club.id, m.period_id, field.key, e.target.value)}
                          className={INPUT}
                          style={{ minWidth: 72 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-[#FEE2E2]/40 border border-[#EF4444]/30 rounded-lg px-4 py-3 text-[#EF4444] text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-3 bg-[#D1FAE5]/40 border border-[#059669]/30 rounded-lg px-4 py-3 text-[#059669] text-sm font-semibold">
          <CheckCircle size={16} />
          Forecasts saved!
        </div>
      )}

      {/* Save */}
      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {saving ? "Saving…" : "Save Forecasts"}
        </button>
      </div>
    </div>
  );
}
