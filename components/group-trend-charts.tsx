"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

// "February 2026" → "Feb '26"
function shortLabel(label: string) {
  const parts = label.split(" ");
  if (parts.length !== 2) return label;
  return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
}

// "2026-02-01" → "2026-02"
function toYearMonth(dateStr: string) {
  return dateStr.slice(0, 7);
}

interface TrendPoint {
  label: string;
  period_date: string;
  leads_actual: number;
  leads_target: number;
  sales_actual: number;
  sales_target: number;
  spend_actual: number;
  nnm_actual: number;
}

type RangeOption = 3 | 6 | 12 | "custom";

const CHART_STYLE = {
  background: "transparent",
  fontSize: 11,
  color: "#64748B",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5">
      <div className="text-sm font-bold text-[#0F172A] mb-4">{title}</div>
      <div className="h-64">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  color: "#0F172A",
  fontSize: 12,
};

export default function GroupTrendCharts({ data }: { data: TrendPoint[] }) {
  const [range, setRange] = useState<RangeOption>(12);

  // Custom range state — default to full available window
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

  return (
    <div className="mb-8">
      {/* Range controls */}
      <div className="flex items-center justify-end gap-3 mb-4 flex-wrap">
        {range === "custom" && (
          <div className="flex items-center gap-2 text-sm">
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
          {([3, 6, 12] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                range === r
                  ? "bg-[#FFFFFF] text-[#7C3AED] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {r}M
            </button>
          ))}
          <button
            onClick={() => {
              setCustomFrom(minDate);
              setCustomTo(maxDate);
              setRange("custom");
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              range === "custom"
                ? "bg-[#FFFFFF] text-[#7C3AED] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Leads trend */}
        <ChartCard title="Group Leads — Actual vs Target">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visible} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#64748B" }}
                formatter={(value) => <span style={{ color: "#64748B" }}>{value}</span>}
              />
              <Line type="monotone" dataKey="leads_actual" name="Actual" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }} />
              <Line type="monotone" dataKey="leads_target" name="Target" stroke="#C4B5FD" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sales trend */}
        <ChartCard title="Group Sales — Actual vs Target">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visible} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value) => <span style={{ color: "#64748B" }}>{value}</span>}
              />
              <Line type="monotone" dataKey="sales_actual" name="Actual" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: "#059669" }} />
              <Line type="monotone" dataKey="sales_target" name="Target" stroke="#6EE7B7" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* NNM bar chart */}
        <ChartCard title="Net New Members (NNM) by Month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visible} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} />
              <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1.5} />
              <Bar dataKey="nnm_actual" name="NNM" fill="#14B8A6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spend bar chart */}
        <ChartCard title="Total Marketing Spend by Month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visible} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} formatter={(v: number) => [`$${v.toLocaleString()}`, "Spend"]} />
              <Bar dataKey="spend_actual" name="Spend ($)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
