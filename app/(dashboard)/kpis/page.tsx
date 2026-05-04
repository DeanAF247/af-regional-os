import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import SectionLabel from "@/components/section-label";
import PeriodsTable from "@/components/periods-table";
import Link from "next/link";
import { pct, currentPeriod } from "@/lib/utils";
import { PencilLine, BarChart3 } from "lucide-react";

export default async function KpisPage() {
  const supabase = await createClient();

  // Auto-create the current month's period if it doesn't exist yet
  const cp = currentPeriod();
  await supabase.from("kpi_periods").upsert(cp, { onConflict: "period_label" });

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
        subtitle="Enter and manage monthly KPI data for all clubs"
        action={
          <Link
            href="/kpis/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <PencilLine size={16} />
            Enter KPIs
          </Link>
        }
      />

      <SectionLabel>KPI Periods ({periodSummaries.length})</SectionLabel>

      {periodSummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-4">
            <BarChart3 size={28} className="text-[#94A3B8]" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-2">No KPI data yet</h2>
          <p className="text-[#94A3B8] text-sm mb-6 max-w-sm">
            Enter your first monthly period to start tracking group performance.
          </p>
          <Link
            href="/kpis/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <PencilLine size={16} />
            Enter First Period
          </Link>
        </div>
      ) : (
        <PeriodsTable periods={periodSummaries} />
      )}
    </div>
  );
}
