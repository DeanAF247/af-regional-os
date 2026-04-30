"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data:  Record<string, any>[];
  clubs: string[];
}

// Distinct colours for each club line
const CLUB_COLORS = [
  "#7C3AED", // purple  — Greenhills
  "#10B981", // green   — Thornton
  "#3B82F6", // blue    — Newcastle West
  "#F59E0B", // amber   — Kotara
  "#EC4899", // pink    — Edgeworth
  "#14B8A6", // teal    — Lake Haven
];

const GROUP_COLOR = "#94A3B8";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1F35] border border-[#252B45] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#94A3B8] font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[#94A3B8]">{p.name}:</span>
          <span className="text-[#F1F5F9] font-semibold ml-auto pl-3">
            {p.value != null ? p.value.toLocaleString() : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MembershipChart({ data, clubs }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
      {/* Per-club lines */}
      <div className="bg-[#131729] border border-[#252B45] rounded-xl p-5">
        <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wide mb-4">Per Club</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={45}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", color: "#94A3B8", paddingTop: "12px" }}
            />
            {clubs.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={CLUB_COLORS[i % CLUB_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: CLUB_COLORS[i % CLUB_COLORS.length] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Group total line */}
      <div className="bg-[#131729] border border-[#252B45] rounded-xl p-5">
        <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wide mb-4">Group Total</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={50}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="Group Total"
              stroke={GROUP_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4, fill: GROUP_COLOR }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
