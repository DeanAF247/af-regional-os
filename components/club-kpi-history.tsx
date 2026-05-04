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
} from "recharts";

interface HistoryPoint {
  label: string;
  leads_actual: number | null;
  leads_target: number | null;
  sales_actual: number | null;
  sales_target: number | null;
  spend_actual: number | null;
  nnm_actual: number | null;
}

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
      <div className="h-48">{children}</div>
    </div>
  );
}

export default function ClubKpiHistory({ data }: { data: HistoryPoint[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <ChartCard title="Leads — Actual vs Target">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend formatter={(v) => <span style={{ color: "#64748B", fontSize: 11 }}>{v}</span>} />
            <Line type="monotone" dataKey="leads_actual" name="Actual" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="leads_target" name="Target" stroke="#EDE9FE" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Sales — Actual vs Target">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend formatter={(v) => <span style={{ color: "#64748B", fontSize: 11 }}>{v}</span>} />
            <Line type="monotone" dataKey="sales_actual" name="Actual" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="sales_target" name="Target" stroke="#D1FAE5" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
