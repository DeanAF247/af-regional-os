import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import SectionLabel from "@/components/section-label";
import Link from "next/link";
import { formatCurrency, formatPercent, pct } from "@/lib/utils";
import { UploadCloud, Edit2 } from "lucide-react";

export default async function KpisPage() {
  const supabase = await createClient();

  const { data: periods } = await supabase
    .from("kpi_periods")
    .select("id, period_label, period_date, created_at")
    .order("period_date", { ascending: false });

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  // For each period, fetch aggregated KPIs
  let periodSummaries: any[] = [];
  if (periods && clubs) {
    const periodIds = periods.map((p) => p.id);
    const { data: allKpis } = await supabase
      .from("club_kpis")
      .select("period_id, leads_actual, leads_target, sales_actual, sales_target, spend_actual, spend_budget")
      .in("period_id", periodIds);

    periodSummaries = periods.map((period) => {
      const kpis = allKpis?.filter((k) => k.period_id === period.id) ?? [];
      const totalLeads  = kpis.reduce((s, k) => s + (k.leads_actual ?? 0), 0);
      const targetLeads = kpis.reduce((s, k) => s + (k.leads_target ?? 0), 0);
      const totalSales  = kpis.reduce((s, k) => s + (k.sales_actual ?? 0), 0);
      const targetSales = kpis.reduce((s, k) => s + (k.sales_target ?? 0), 0);
      const totalSpend  = kpis.reduce((s, k) => s + (k.spend_actual ?? 0), 0);
      const totalBudget = kpis.reduce((s, k) => s + (k.spend_budget ?? 0), 0);
      return {
        ...period,
        club_count: kpis.length,
        total_leads: totalLeads,
        leads_pct: pct(totalLeads, targetLeads),
        total_sales: totalSales,
        sales_pct: pct(totalSales, targetSales),
        total_spend: totalSpend,
        spend_pct: pct(totalSpend, totalBudget),
      };
    });
  }

  return (
    <div>
      <PageHeader
        title="KPI Management"
        subtitle="Upload and manage monthly KPI data for all clubs"
        action={
          <Link
            href="/kpis/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <UploadCloud size={16} />
            Upload Period
          </Link>
        }
      />

      <SectionLabel>KPI Periods ({periodSummaries.length})</SectionLabel>

      {periodSummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1F35] border border-[#252B45] flex items-center justify-center mb-4">
            <UploadCloud size={28} className="text-[#64748B]" />
          </div>
          <h2 className="text-lg font-bold text-[#F1F5F9] mb-2">No KPI data yet</h2>
          <p className="text-[#64748B] text-sm mb-6 max-w-sm">
            Upload your first monthly period to start tracking group performance.
          </p>
          <Link
            href="/kpis/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <UploadCloud size={16} />
            Upload First Period
          </Link>
        </div>
      ) : (
        <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A1F35] text-[#94A3B8] text-[11px] uppercase tracking-wide border-b border-[#252B45]">
                  <th className="text-left px-4 py-3 font-semibold">Period</th>
                  <th className="text-center px-4 py-3 font-semibold">Clubs</th>
                  <th className="text-right px-4 py-3 font-semibold">Leads</th>
                  <th className="text-right px-4 py-3 font-semibold">Leads %</th>
                  <th className="text-right px-4 py-3 font-semibold">Sales</th>
                  <th className="text-right px-4 py-3 font-semibold">Sales %</th>
                  <th className="text-right px-4 py-3 font-semibold">Spend</th>
                  <th className="text-right px-4 py-3 font-semibold">Spend %</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {periodSummaries.map((period) => (
                  <tr key={period.id} className="border-t border-[#252B45]/60 hover:bg-[#1A1F35]/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#F1F5F9]">
                      {period.period_label}
                    </td>
                    <td className="px-4 py-3 text-center text-[#94A3B8]">{period.club_count}</td>
                    <td className="px-4 py-3 text-right text-[#F1F5F9]">{period.total_leads.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      period.leads_pct == null ? "text-[#64748B]"
                        : period.leads_pct >= 90 ? "text-[#10B981]"
                        : period.leads_pct >= 70 ? "text-[#F59E0B]"
                        : "text-[#EF4444]"
                    }`}>
                      {formatPercent(period.leads_pct)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#F1F5F9]">{period.total_sales.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      period.sales_pct == null ? "text-[#64748B]"
                        : period.sales_pct >= 90 ? "text-[#10B981]"
                        : period.sales_pct >= 70 ? "text-[#F59E0B]"
                        : "text-[#EF4444]"
                    }`}>
                      {formatPercent(period.sales_pct)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#F1F5F9]">{formatCurrency(period.total_spend)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      period.spend_pct == null ? "text-[#64748B]"
                        : period.spend_pct <= 100 ? "text-[#10B981]"
                        : period.spend_pct <= 115 ? "text-[#F59E0B]"
                        : "text-[#EF4444]"
                    }`}>
                      {formatPercent(period.spend_pct)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/kpis/upload?period=${period.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#A78BFA] transition-colors"
                      >
                        <Edit2 size={12} />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
