import { cn } from "@/lib/utils";

type Color = "purple" | "green" | "red" | "amber" | "blue" | "teal";

const colorMap: Record<Color, { bar: string; value: string; pill: string; pillBg: string }> = {
  purple: { bar: "bg-[#7C3AED]", value: "text-[#A78BFA]", pill: "text-[#A78BFA]", pillBg: "bg-[#3B1F7A]" },
  green:  { bar: "bg-[#10B981]", value: "text-[#10B981]", pill: "text-[#10B981]", pillBg: "bg-[#064E3B]" },
  red:    { bar: "bg-[#EF4444]", value: "text-[#EF4444]", pill: "text-[#EF4444]", pillBg: "bg-[#7F1D1D]" },
  amber:  { bar: "bg-[#F59E0B]", value: "text-[#F59E0B]", pill: "text-[#F59E0B]", pillBg: "bg-[#78350F]" },
  blue:   { bar: "bg-[#3B82F6]", value: "text-[#3B82F6]", pill: "text-[#3B82F6]", pillBg: "bg-[#1E3A5F]" },
  teal:   { bar: "bg-[#14B8A6]", value: "text-[#14B8A6]", pill: "text-[#14B8A6]", pillBg: "bg-[#134E4A]" },
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
  green:   "bg-[#064E3B] text-[#10B981]",
  red:     "bg-[#7F1D1D] text-[#EF4444]",
  amber:   "bg-[#78350F] text-[#F59E0B]",
  neutral: "bg-[#252B45] text-[#94A3B8]",
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
        "relative bg-[#131729] border border-[#252B45] rounded-xl p-5 overflow-hidden",
        className
      )}
    >
      {/* Top color bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-[3px]", c.bar)} />

      <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-widest mb-2">
        {label}
      </div>

      <div className={cn("text-4xl font-extrabold leading-none tracking-tight mb-1.5", c.value)}>
        {value}
      </div>

      {(sub || badge) && (
        <div className="flex items-center gap-2 flex-wrap">
          {sub && <span className="text-xs text-[#94A3B8]">{sub}</span>}
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
