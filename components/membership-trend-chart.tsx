"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface MembershipPoint {
  label:        string;
  period_date:  string;
  total:        number | null;
  direct_debit: number | null;
}

type RangeOption = 3 | 6 | 9 | 12 | "custom";

const RANGES: { label: string; value: RangeOption }[] = [
  { label: "3M",  value: 3  },
  { label: "6M",  value: 6  },
  { label: "9M",  value: 9  },
  { label: "12M", value: 12 },
  { label: "Custom", value: "custom" },
];

function shortLabel(label: string) {
  const parts = label.split(" ");
  if (parts.length !== 2) return label;
  return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
}

function toYearMonth(dateStr: string) {
  return dateStr.slice(0, 7);
}

const tooltipStyle = {
  backgroundColor: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  color: "#0F172A",
  fontSize: 12,
};

export default function MembershipTrendChart({ data }: { data: MembershipPoint[] }) {
  const [range, setRange] = useState<RangeOption>(12);

  const minDate = data[0]?.period_date?.slice(0, 7) ?? "";
  const maxDate = data[data.length - 1]?.period_date?.slice(0, 7) ?? "";
  const [customFrom, setCustomFrom] = useState(minDate);
  const [customTo,   setCustomTo]   = useState(maxDate);

  const visible = useMemo(() => {
    if (range === "custom") {
      return data.filter((d) => {
        const ym = toYearMonth(d.period_date);
        return (!customFrom || ym >= customFrom) && (!customTo || ym <= customTo);
      });
    }
    return data.slice(-range);
  }, [data, range, customFrom, customTo]);

  const hasDD = data.some((d) => d.direct_debit !== null);
  const filled = visible.filter((d) => d.total !== null);

  if (filled.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[#94A3B8] italic">
        No membership data in this range
      </div>
    );
  }

  return (
    <div>
      {/* Range controls */}
      <div className="flex items-center justify-end gap-3 mb-4 flex-wrap">
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={customFrom}
              min={minDate}
              max={customTo || maxDate}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-[#7C3AED] bg-white"
            />
            <span className="text-[#94A3B8] text-xs">to</span>
            <input
              type="month"
              value={customTo}
              min={customFrom || minDate}
              max={maxDate}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1 border border-[#E2E8F0] rounded-lg text-[#0F172A] text-xs focus:outline-none focus:border-[#7C3AED] bg-white"
            />
          </div>
        )}
        <div className="inline-flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={String(r.value)}
              onClick={() => {
                if (r.value === "custom") { setCustomFrom(minDate); setCustomTo(maxDate); }
                setRange(r.value);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                range === r.value
                  ? "bg-[#FFFFFF] text-[#7C3AED] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={filled} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={shortLabel}
          />
          <YAxis
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={shortLabel}
          />
          {hasDD && (
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(v) => <span style={{ color: "#64748B" }}>{v}</span>}
            />
          )}
          <Line
            type="monotone"
            dataKey="total"
            name="Total Members"
            stroke="#7C3AED"
            strokeWidth={2}
            dot={{ r: 3, fill: "#7C3AED" }}
            connectNulls
          />
          {hasDD && (
            <Line
              type="monotone"
              dataKey="direct_debit"
              name="Direct Debit"
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: "#059669" }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
