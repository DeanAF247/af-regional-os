"use client";

import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

interface DataPoint { label: string; count: number | null; direct_debit: number | null }

const tooltipStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  fontSize: 12,
};

// "February 2026" → "Feb '26"
function shortLabel(label: string) {
  const parts = label.split(" ");
  if (parts.length !== 2) return label;
  return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
}

export default function ClubMembershipMini({ data }: { data: DataPoint[] }) {
  const filled = data.filter((d) => d.count !== null);
  const hasDD  = filled.some((d) => d.direct_debit !== null);

  if (filled.length < 2) {
    return (
      <div className="flex items-center justify-center h-28 text-xs text-[#475569] italic">
        Not enough data to show trend
      </div>
    );
  }

  if (!hasDD) {
    // Simple area chart when no DD data
    return (
      <ResponsiveContainer width="100%" height={112}>
        <AreaChart data={filled} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#F8FAFC" />
          <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
          <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} />
          <Area type="monotone" dataKey="count" name="Total" stroke="#7C3AED" strokeWidth={2}
            fill="url(#memberGrad)" dot={false} activeDot={{ r: 4, fill: "#7C3AED", strokeWidth: 0 }} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Line chart showing Total vs Direct Debit
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={filled} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#F8FAFC" />
        <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
        <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={shortLabel} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => <span style={{ color: "#64748B" }}>{v}</span>}
        />
        <Line type="monotone" dataKey="count" name="Total" stroke="#7C3AED" strokeWidth={2}
          dot={false} activeDot={{ r: 4 }} connectNulls />
        <Line type="monotone" dataKey="direct_debit" name="Direct Debit" stroke="#059669" strokeWidth={2}
          strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
