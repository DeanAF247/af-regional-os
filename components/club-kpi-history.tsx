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

interface HistoryPoint {
  label: string;
  period_date: string;
  leads_actual: number | null;
  leads_target: number | null;
  sales_actual: number | null;
  sales_target: number | null;
  spend_actual: number | null;
  nnm_actual: number | null;
}

type RangeOption = 3 | 6 | 12 | "all";

const RANGES: { label: string; value: RangeOption }[] = [
  { label: "3M",  value: 3   },
  { label: "6M",  value: 6   },
  { label: "12M", value: 12  },
  { label: "All", value: "all" },
];

const tooltipStyle = {
  backgroundColor: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  color: "#0F172A",
  fontSize: 12,
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5">
      <div className="text-sm font-bold text-[#0F172A] mb-4">{title}</div>
      <div className="h-56">{children}</div>
    </div>
  );
}

export default function ClubKpiHistory({ data }: { data: HistoryPoint[] }) {
  const [range, setRange] = useState<RangeOption>(12);

  const visible = useMemo(() => {
    if (range === "all") return data;
    return data.slice(-range);
  }, [data, range]);

  return (
    <div className="mb-8">
      {/* Range toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={String(r.value)}
              onClick={() => setRange(r.value)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Leads */}
        <ChartCard title="Leads — Actual vs Target">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visible}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} />
              <Legend formatter={(v) => <span style={{ color: "#64748B", fontSize: 11 }}>{v}</span>} />
              <Line type="monotone" dataKey="leads_actual" name="Actual" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="leads_target" name="Target" stroke="#C4B5FD" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sales */}
        <ChartCard title="Sales — Actual vs Target">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visible}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} />
              <Legend formatter={(v) => <span style={{ color: "#64748B", fontSize: 11 }}>{v}</span>} />
              <Line type="monotone" dataKey="sales_actual" name="Actual" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="sales_target" name="Target" stroke="#6EE7B7" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* NNM */}
        <ChartCard title="Net New Members by Month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visible}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} />
              <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1.5} />
              <Bar dataKey="nnm_actual" name="NNM" fill="#14B8A6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spend */}
        <ChartCard title="Marketing Spend by Month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visible}>
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
