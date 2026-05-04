import { cn } from "@/lib/utils";

type Color = "purple" | "green" | "red" | "amber" | "blue" | "teal";

const colorMap: Record<Color, { bar: string; value: string; pill: string; pillBg: string }> = {
  purple: { bar: "bg-[#7C3AED]", value: "text-[#6D28D9]", pill: "text-[#6D28D9]", pillBg: "bg-[#EDE9FE]" },
  green:  { bar: "bg-[#059669]", value: "text-[#059669]", pill: "text-[#059669]", pillBg: "bg-[#D1FAE5]" },
  red:    { bar: "bg-[#EF4444]", value: "text-[#EF4444]", pill: "text-[#EF4444]", pillBg: "bg-[#FEE2E2]" },
  amber:  { bar: "bg-[#D97706]", value: "text-[#D97706]", pill: "text-[#D97706]", pillBg: "bg-[#FEF3C7]" },
  blue:   { bar: "bg-[#3B82F6]", value: "text-[#3B82F6]", pill: "text-[#3B82F6]", pillBg: "bg-[#DBEAFE]" },
  teal:   { bar: "bg-[#14B8A6]", value: "text-[#14B8A6]", pill: "text-[#14B8A6]", pillBg: "bg-[#CCFBF1]" },
};

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  badgeVariant?: "green" | "red" | "amber" | "neutral";
  color?: Color;
  className?: string;
}

const badgeVariantMap = {
  green:   "bg-[#D1FAE5] text-[#059669]",
  red:     "bg-[#FEE2E2] text-[#EF4444]",
  amber:   "bg-[#FEF3C7] text-[#D97706]",
  neutral: "bg-[#E2E8F0] text-[#64748B]",
};

export default function KpiCard({
  label,
  value,
  sub,
  badge,
  badgeVariant = "neutral",
  color = "purple",
  className,
}: KpiCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={cn(
        "relative bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 overflow-hidden",
        className
      )}
    >
      {/* Top color bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-[3px]", c.bar)} />

      <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-2">
        {label}
      </div>

      <div className={cn("text-4xl font-extrabold leading-none tracking-tight mb-1.5", c.value)}>
        {value}
      </div>

      {(sub || badge) && (
        <div className="flex items-center gap-2 flex-wrap">
          {sub && <span className="text-xs text-[#64748B]">{sub}</span>}
          {badge && (
            <span
              className={cn(
                "inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold",
                badgeVariantMap[badgeVariant]
              )}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
