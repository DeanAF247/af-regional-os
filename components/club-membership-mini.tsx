"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

interface DataPoint { label: string; count: number | null }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#94A3B8] mb-0.5">{label}</p>
      <p className="font-bold text-[#6D28D9]">{payload[0].value?.toLocaleString()} members</p>
    </div>
  );
};

export default function ClubMembershipMini({ data }: { data: DataPoint[] }) {
  const filled = data.filter((d) => d.count !== null);
  if (filled.length < 2) {
    return (
      <div className="flex items-center justify-center h-28 text-xs text-[#475569] italic">
        Not enough data to show trend
      </div>
    );
  }

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
        <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#7C3AED"
          strokeWidth={2}
          fill="url(#memberGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#7C3AED", strokeWidth: 0 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
