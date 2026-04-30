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
  color: "#94A3B8",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#131729] border border-[#252B45] rounded-xl p-5">
      <div className="text-sm font-bold text-[#F1F5F9] mb-4">{title}</div>
      <div className="h-52">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#1A1F35",
  border: "1px solid #252B45",
  borderRadius: "8px",
  color: "#F1F5F9",
  fontSize: 12,
};

export default function GroupTrendCharts({ data }: { data: TrendPoint[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* Leads trend */}
      <ChartCard title="Group Leads — Actual vs Target">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} style={CHART_STYLE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252B45" />
            <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#94A3B8" }}
              formatter={(value) => <span style={{ color: "#94A3B8" }}>{value}</span>}
            />
            <Line type="monotone" dataKey="leads_actual" name="Actual" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }} />
            <Line type="monotone" dataKey="leads_target" name="Target" stroke="#3B1F7A" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Sales trend */}
      <ChartCard title="Group Sales — Actual vs Target">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} style={CHART_STYLE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252B45" />
            <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span style={{ color: "#94A3B8" }}>{value}</span>}
            />
            <Line type="monotone" dataKey="sales_actual" name="Actual" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} />
            <Line type="monotone" dataKey="sales_target" name="Target" stroke="#064E3B" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* NNM bar chart */}
      <ChartCard title="Net New Members (NNM) by Month">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} style={CHART_STYLE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252B45" />
            <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="nnm_actual" name="NNM" fill="#14B8A6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Spend bar chart */}
      <ChartCard title="Total Marketing Spend by Month">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} style={CHART_STYLE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252B45" />
            <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10, }} tickLine={false} axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Spend"]} />
            <Bar dataKey="spend_actual" name="Spend ($)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
