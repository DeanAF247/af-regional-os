"use client";

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

interface TrendPoint {
  label: string;
  leads_actual: number;
  leads_target: number;
  sales_actual: number;
  sales_target: number;
  spend_actual: number;
  nnm_actual: number;
}

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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* Leads trend */}
      <ChartCard title="Group Leads — Actual vs Target">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} style={CHART_STYLE}>
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
          <LineChart data={data} style={CHART_STYLE}>
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
          <BarChart data={data} style={CHART_STYLE}>
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
          <BarChart data={data} style={CHART_STYLE}>
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
  );
}
