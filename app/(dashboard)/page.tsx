import { createClient } from "@/lib/supabase/server";
import KpiCard from "@/components/kpi-card";
import ClubCard from "@/components/club-card";
import SectionLabel from "@/components/section-label";
import PageHeader from "@/components/page-header";
import GroupTrendCharts from "@/components/group-trend-charts";
import PeriodSelector from "@/components/period-selector";
import Link from "next/link";
import { formatCurrency, formatPercent, pct } from "@/lib/utils";
import { PencilLine, UploadCloud } from "lucide-react";
import GroupMembershipTable from "@/components/group-membership-table";

// Slug mapping for club names → URL slugs
const CLUB_SLUGS: Record<string, string> = {
  "Greenhills":     "greenhills",
  "Thornton":       "thornton",
  "Newcastle West": "newcastle-west",
  "Kotara":         "kotara",
  "Edgeworth":      "edgeworth",
  "Lake Haven":     "lake-haven",
  "Toukley":        "toukley",
};

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const { period: periodParam } = await searchParams;

  // Get all KPI periods (for selector + trend)
  const { data: allPeriods } = await supabase
    .from("kpi_periods")
    .select("id, period_label, period_date")
    .order("period_date", { ascending: false });

  // Resolve the active period — default to the current calendar month if available
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const activePeriod = periodParam
    ? (allPeriods?.find((p) => p.period_label === periodParam) ?? allPeriods?.[0] ?? null)
    : (allPeriods?.find((p) => p.period_label === currentMonthLabel) ?? allPeriods?.[0] ?? null);

  const latestPeriod = activePeriod;

  // Get all clubs
  const { data: clubs } = await supabase
    .from("clubs")
    .select("*")
    .eq("status", "active")
    .order("name");

  // Get KPIs, transfers and membership for active period
  let clubKpis: Record<string, any> = {};
  let clubTransfers: Record<string, any> = {};
  let clubMembership: Record<string, any> = {};
  if (latestPeriod) {
    const [{ data: kpis }, { data: transfers }, { data: membership }] = await Promise.all([
      supabase.from("club_kpis").select("*, club:clubs(id, name)").eq("period_id", latestPeriod.id),
      supabase.from("transfers").select("*").eq("period_id", latestPeriod.id),
      supabase.from("membership_counts").select("club_id, count, direct_debit_count").eq("period_id", latestPeriod.id),
    ]);

    kpis?.forEach((k) => { clubKpis[k.club_id] = k; });
    transfers?.forEach((t) => { clubTransfers[t.club_id] = t; });
    membership?.forEach((m) => { clubMembership[m.club_id] = m; });
  }

  // Use last 12 periods for trend data — cap at today so future forecast
  // periods (created for the Forecasts module) don't appear in charts
  const todayStr = new Date().toISOString().split("T")[0];
  const trendPeriods = (allPeriods ?? [])
    .filter((p) => p.period_date <= todayStr)
    .slice(0, 12);

  let trendData: any[] = [];
  if (trendPeriods && trendPeriods.length > 0) {
    const periodIds = trendPeriods.map((p) => p.id);
    const { data: trendKpis } = await supabase
      .from("club_kpis")
      .select("period_id, leads_actual, leads_target, sales_actual, sales_target, spend_actual, nnm_actual")
      .in("period_id", periodIds);

    // Aggregate by period (oldest → newest for left-to-right chart order)
    trendData = [...trendPeriods].reverse().map((period) => {
      const periodKpis = trendKpis?.filter((k) => k.period_id === period.id) ?? [];
      return {
        label:        period.period_label,
        period_date:  period.period_date,
        leads_actual: periodKpis.reduce((s, k) => s + (k.leads_actual ?? 0), 0),
        leads_target: periodKpis.reduce((s, k) => s + (k.leads_target ?? 0), 0),
        sales_actual: periodKpis.reduce((s, k) => s + (k.sales_actual ?? 0), 0),
        sales_target: periodKpis.reduce((s, k) => s + (k.sales_target ?? 0), 0),
        spend_actual: periodKpis.reduce((s, k) => s + (k.spend_actual ?? 0), 0),
        nnm_actual:   periodKpis.reduce((s, k) => s + (k.nnm_actual ?? 0), 0),
      };
    });
  }

  // Compute group totals
  const allKpis = Object.values(clubKpis);
  const totalLeads   = allKpis.reduce((s, k) => s + (k.leads_actual ?? 0), 0);
  const targetLeads  = allKpis.reduce((s, k) => s + (k.leads_target ?? 0), 0);
  const totalSales   = allKpis.reduce((s, k) => s + (k.sales_actual ?? 0), 0);
  const targetSales  = allKpis.reduce((s, k) => s + (k.sales_target ?? 0), 0);
  const totalNnm     = allKpis.reduce((s, k) => s + (k.nnm_actual ?? 0), 0);
  const totalSpend   = allKpis.reduce((s, k) => s + (k.spend_actual ?? 0), 0);
  const totalBudget  = allKpis.reduce((s, k) => s + (k.spend_budget ?? 0), 0);
  const leadsPct     = pct(totalLeads, targetLeads);
  const salesPct     = pct(totalSales, targetSales);
  const spendPct     = pct(totalSpend, totalBudget);
  const avgCpl       = totalLeads > 0 ? totalSpend / totalLeads : null;

  const allTransfers     = Object.values(clubTransfers);
  const totalTransfersIn  = allTransfers.reduce((s: number, t: any) => s + (t.transfers_in  ?? 0), 0);
  const totalTransfersOut = allTransfers.reduce((s: number, t: any) => s + (t.transfers_out ?? 0), 0);

  // Build club card data
  const clubCardData = (clubs ?? []).map((club) => {
    const k  = clubKpis[club.id];
    const tr = clubTransfers[club.id];
    const lPct  = pct(k?.leads_actual, k?.leads_target);
    const sPct  = pct(k?.sales_actual, k?.sales_target);
    const spPct = pct(k?.spend_actual, k?.spend_budget);
    return {
      id:            club.id,
      name:          club.name,
      slug:          CLUB_SLUGS[club.name] ?? club.name.toLowerCase().replace(/\s+/g, "-"),
      leads_actual:  k?.leads_actual  ?? null,
      leads_target:  k?.leads_target  ?? null,
      leads_pct:     lPct,
      sales_actual:  k?.sales_actual  ?? null,
      sales_target:  k?.sales_target  ?? null,
      sales_pct:     sPct,
      nnm_actual:    k?.nnm_actual    ?? null,
      nnm_target:    k?.nnm_target    ?? null,
      spend_actual:  k?.spend_actual  ?? null,
      spend_budget:  k?.spend_budget  ?? null,
      spend_pct:     spPct,
      cpl:           k?.cpl           ?? null,
      transfers_in:  tr?.transfers_in  ?? null,
      transfers_out: tr?.transfers_out ?? null,
    };
  });

  const hasData = allKpis.length > 0;

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Group Overview"
        subtitle={`${clubs?.length ?? 0} Active Clubs`}
        action={
          <div className="flex items-center gap-3 flex-wrap">
            {allPeriods && allPeriods.length > 0 && latestPeriod && (
              <PeriodSelector
                periods={allPeriods}
                currentLabel={latestPeriod.period_label}
              />
            )}
            <Link
              href="/kpis/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <PencilLine size={16} />
              Enter KPIs
            </Link>
          </div>
        }
      />

      {!hasData ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-4">
            <UploadCloud size={28} className="text-[#94A3B8]" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-2">No KPI data yet</h2>
          <p className="text-[#94A3B8] text-sm mb-6 max-w-sm">
            Upload your Group Summary Sheet to start tracking performance across all 6 clubs.
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
        <>
          {/* Group KPI Summary Cards */}
          <SectionLabel>Group KPIs · {latestPeriod?.period_label}</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
            <KpiCard
              label="Total Leads"
              value={totalLeads.toLocaleString()}
              sub={`Target: ${targetLeads.toLocaleString()}`}
              badge={leadsPct != null ? formatPercent(leadsPct) : undefined}
              badgeVariant={
                leadsPct == null ? "neutral"
                  : leadsPct >= 90 ? "green"
                  : leadsPct >= 70 ? "amber" : "red"
              }
              color="purple"
            />
            <KpiCard
              label="Total Sales"
              value={totalSales.toLocaleString()}
              sub={`Target: ${targetSales.toLocaleString()}`}
              badge={salesPct != null ? formatPercent(salesPct) : undefined}
              badgeVariant={
                salesPct == null ? "neutral"
                  : salesPct >= 90 ? "green"
                  : salesPct >= 70 ? "amber" : "red"
              }
              color={salesPct != null && salesPct >= 90 ? "green" : salesPct != null && salesPct >= 70 ? "amber" : "red"}
            />
            <KpiCard
              label="Net New Members"
              value={totalNnm >= 0 ? `+${totalNnm}` : String(totalNnm)}
              sub="Group total"
              color={totalNnm >= 0 ? "green" : "red"}
            />
            <KpiCard
              label="Total Spend"
              value={formatCurrency(totalSpend)}
              sub={`Budget: ${formatCurrency(totalBudget)}`}
              badge={spendPct != null ? formatPercent(spendPct) : undefined}
              badgeVariant={
                spendPct == null ? "neutral"
                  : spendPct <= 100 ? "green"
                  : spendPct <= 115 ? "amber" : "red"
              }
              color="blue"
            />
            <KpiCard
              label="Avg CPL"
              value={avgCpl != null ? formatCurrency(avgCpl) : "—"}
              sub="Cost per lead"
              color="teal"
            />
            <KpiCard
              label="Transfers In"
              value={`+${totalTransfersIn.toLocaleString()}`}
              sub="Group total"
              color="green"
            />
            <KpiCard
              label="Transfers Out"
              value={totalTransfersOut > 0 ? `-${totalTransfersOut.toLocaleString()}` : "0"}
              sub="Group total"
              color={totalTransfersOut > 0 ? "red" : "teal"}
            />
          </div>

          {/* Club Cards */}
          <SectionLabel>Club Performance</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {clubCardData.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>

          {/* Trend Charts */}
          {trendData.length > 1 && (
            <>
              <SectionLabel>Monthly Trends</SectionLabel>
              <GroupTrendCharts data={trendData} />
            </>
          )}

          {/* Group Membership Table */}
          {hasData && (
            <>
              <SectionLabel>Membership · {latestPeriod?.period_label}</SectionLabel>
              <GroupMembershipTable
                clubs={(clubs ?? []).map((club) => ({
                  id:                 club.id,
                  name:               club.name,
                  total_count:        clubMembership[club.id]?.count              ?? null,
                  direct_debit_count: clubMembership[club.id]?.direct_debit_count ?? null,
                }))}
              />
            </>
          )}

          {/* Marketing Spend Table */}
          {hasData && (
            <>
              <SectionLabel>Marketing Spend · {latestPeriod?.period_label}</SectionLabel>
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide">
                        <th className="text-left px-4 py-3 font-semibold">Club</th>
                        <th className="text-right px-4 py-3 font-semibold">Spend</th>
                        <th className="text-right px-4 py-3 font-semibold">Budget</th>
                        <th className="text-right px-4 py-3 font-semibold">% Used</th>
                        <th className="text-right px-4 py-3 font-semibold">Surplus / Over</th>
                        <th className="px-4 py-3 font-semibold w-32">Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clubCardData.map((club, i) => {
                        const surplusOver = (club.spend_budget ?? 0) - (club.spend_actual ?? 0);
                        const isOver = surplusOver < 0;
                        const barWidth = club.spend_pct != null ? Math.min(club.spend_pct, 150) : 0;
                        return (
                          <tr key={club.id} className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#0F172A]">
                              <Link href={`/clubs/${club.slug}`} className="hover:text-[#6D28D9] transition-colors">
                                {club.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right text-[#0F172A]">
                              {formatCurrency(club.spend_actual)}
                            </td>
                            <td className="px-4 py-3 text-right text-[#64748B]">
                              {formatCurrency(club.spend_budget)}
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold ${
                              club.spend_pct != null && club.spend_pct > 100 ? "text-[#EF4444]" : "text-[#059669]"
                            }`}>
                              {formatPercent(club.spend_pct)}
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold ${isOver ? "text-[#EF4444]" : "text-[#059669]"}`}>
                              {isOver ? "-" : "+"}{formatCurrency(Math.abs(surplusOver))}
                            </td>
                            <td className="px-4 py-3">
                              <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    club.spend_pct != null && club.spend_pct > 105 ? "bg-[#EF4444]" : "bg-[#7C3AED]"
                                  }`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total row */}
                      <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] font-bold">
                        <td className="px-4 py-3 text-[#6D28D9]">Group Total</td>
                        <td className="px-4 py-3 text-right text-[#0F172A]">{formatCurrency(totalSpend)}</td>
                        <td className="px-4 py-3 text-right text-[#64748B]">{formatCurrency(totalBudget)}</td>
                        <td className={`px-4 py-3 text-right ${spendPct != null && spendPct > 100 ? "text-[#EF4444]" : "text-[#059669]"}`}>
                          {formatPercent(spendPct)}
                        </td>
                        <td className={`px-4 py-3 text-right ${totalBudget - totalSpend < 0 ? "text-[#EF4444]" : "text-[#059669]"}`}>
                          {totalBudget - totalSpend < 0 ? "-" : "+"}{formatCurrency(Math.abs(totalBudget - totalSpend))}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
