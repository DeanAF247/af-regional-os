import Link from "next/link";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

interface ClubKpiData {
  id: string;
  name: string;
  slug: string;
  leads_actual: number | null;
  leads_target: number | null;
  leads_pct: number | null;
  sales_actual: number | null;
  sales_target: number | null;
  sales_pct: number | null;
  nnm_actual: number | null;
  nnm_target: number | null;
  spend_actual: number | null;
  spend_budget: number | null;
  spend_pct: number | null;
  cpl: number | null;
}

function statusDot(pct: number | null) {
  if (pct == null) return "bg-[#94A3B8]";
  if (pct >= 90) return "bg-[#059669] shadow-[0_0_6px_#059669]";
  if (pct >= 70) return "bg-[#D97706] shadow-[0_0_6px_#D97706]";
  return "bg-[#EF4444] shadow-[0_0_6px_#EF4444]";
}

function progressColor(pct: number | null): string {
  if (pct == null) return "bg-[#94A3B8]";
  if (pct >= 90) return "bg-[#059669]";
  if (pct >= 70) return "bg-[#D97706]";
  return "bg-[#EF4444]";
}

function MetricRow({
  label,
  actual,
  target,
  pct,
  prefix = "",
  suffix = "",
}: {
  label: string;
  actual: number | null;
  target: number | null;
  pct: number | null;
  prefix?: string;
  suffix?: string;
}) {
  const fillWidth = pct != null ? Math.min(pct, 130) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-bold text-[#0F172A]">
          {actual != null ? `${prefix}${actual.toLocaleString()}${suffix}` : "—"}
          {target != null && (
            <span className="text-[11px] text-[#94A3B8] font-normal ml-1">
              / {prefix}{target.toLocaleString()}{suffix}
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", progressColor(pct))}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
      <div className="text-[11px] text-[#94A3B8] mt-0.5 text-right">
        {pct != null ? formatPercent(pct) : "—"} of target
      </div>
    </div>
  );
}

export default function ClubCard({ club }: { club: ClubKpiData }) {
  const overallPct = club.leads_pct != null && club.sales_pct != null
    ? (club.leads_pct + club.sales_pct) / 2
    : club.leads_pct ?? club.sales_pct;

  return (
    <Link href={`/clubs/${club.slug}`} className="block group">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden hover:border-[#7C3AED]/60 transition-all duration-200 hover:shadow-[0_0_20px_#7C3AED18]">
        {/* Header */}
        <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <span className="font-bold text-[15px] text-[#0F172A] group-hover:text-[#6D28D9] transition-colors">
            {club.name}
          </span>
          <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", statusDot(overallPct))} />
        </div>

        {/* Body */}
        <div className="p-4">
          <MetricRow
            label="Leads"
            actual={club.leads_actual}
            target={club.leads_target}
            pct={club.leads_pct}
          />
          <MetricRow
            label="Sales"
            actual={club.sales_actual}
            target={club.sales_target}
            pct={club.sales_pct}
          />

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#E2E8F0]">
            <div>
              <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-0.5">NNM</div>
              <div className={cn(
                "text-lg font-extrabold",
                club.nnm_actual != null && club.nnm_target != null
                  ? club.nnm_actual >= club.nnm_target ? "text-[#059669]" : "text-[#EF4444]"
                  : "text-[#64748B]"
              )}>
                {club.nnm_actual != null ? (club.nnm_actual >= 0 ? `+${club.nnm_actual}` : club.nnm_actual) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-0.5">CPL</div>
              <div className="text-lg font-extrabold text-[#6D28D9]">
                {club.cpl != null ? formatCurrency(club.cpl) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-0.5">Spend</div>
              <div className={cn(
                "text-lg font-extrabold",
                club.spend_pct != null && club.spend_pct > 105 ? "text-[#EF4444]" : "text-[#059669]"
              )}>
                {club.spend_actual != null ? formatCurrency(club.spend_actual) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#94A3B8] uppercase tracking-wide mb-0.5">Budget</div>
              <div className="text-lg font-extrabold text-[#64748B]">
                {club.spend_budget != null ? formatCurrency(club.spend_budget) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
