import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PageHeader from "@/components/page-header";
import SectionLabel from "@/components/section-label";
import KpiCard from "@/components/kpi-card";
import ClubKpiHistory from "@/components/club-kpi-history";
import ClubMembershipMini from "@/components/club-membership-mini";
import ClubGrowthTracker from "@/components/club-growth-tracker";
import PeriodSelector from "@/components/period-selector";
import { formatCurrency, formatPercent, pct } from "@/lib/utils";
import {
  Building2, MapPin, Phone, Mail, User,
  Users, Megaphone, TrendingUp, TrendingDown,
  ArrowDownLeft, ArrowUpRight, Calendar, DollarSign,
} from "lucide-react";

const SLUG_TO_NAME: Record<string, string> = {
  "greenhills":     "Greenhills",
  "thornton":       "Thornton",
  "newcastle-west": "Newcastle West",
  "kotara":         "Kotara",
  "edgeworth":      "Edgeworth",
  "lake-haven":     "Lake Haven",
};

const STATUS_STYLES: Record<string, string> = {
  planned:   "bg-[#1E2640] text-[#64748B] border-[#E2E8F0]",
  active:    "bg-[#D1FAE5]/40 text-[#059669] border-[#065F46]",
  completed: "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]",
  paused:    "bg-[#FEF3C7]/30 text-[#D97706] border-[#92400E]",
};
const STATUS_DOT: Record<string, string> = {
  planned: "bg-[#94A3B8]", active: "bg-[#059669]",
  completed: "bg-[#475569]", paused: "bg-[#D97706]",
};
const STAFF_STATUS: Record<string, string> = {
  active:   "bg-[#D1FAE5] text-[#059669]",
  inactive: "bg-[#E2E8F0] text-[#94A3B8]",
  on_leave: "bg-[#FEF3C7] text-[#D97706]",
};

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { clubId } = await params;
  const { period: periodParam } = await searchParams;
  const clubName = SLUG_TO_NAME[clubId];
  if (!clubName) notFound();

  const supabase = await createClient();

  // Step 1 — get club record + periods in parallel
  const [{ data: clubs }, { data: allPeriods }] = await Promise.all([
    supabase.from("clubs").select("*").eq("name", clubName).limit(1),
    supabase.from("kpi_periods")
      .select("id, period_label, period_date")
      .order("period_date", { ascending: false })
      .limit(12),
  ]);

  const club = clubs?.[0];
  if (!club) notFound();

  const latestPeriod = periodParam
    ? (allPeriods?.find((p) => p.period_label === periodParam) ?? allPeriods?.[0] ?? null)
    : (allPeriods?.[0] ?? null);

  // Step 2 — fetch all club-specific data in parallel
  const [
    { data: kpis },
    { data: histKpis },
    { data: membershipCounts },
    { data: staff },
    { data: campaignClubRows },
    { data: transfers },
  ] = await Promise.all([
    // Current period KPI
    latestPeriod
      ? supabase.from("club_kpis").select("*").eq("club_id", club.id).eq("period_id", latestPeriod.id).limit(1)
      : Promise.resolve({ data: [] }),
    // Historical KPIs
    allPeriods && allPeriods.length > 0
      ? supabase.from("club_kpis").select("*").eq("club_id", club.id).in("period_id", allPeriods.map((p) => p.id))
      : Promise.resolve({ data: [] }),
    // Membership counts across all periods
    supabase.from("membership_counts").select("period_id, count").eq("club_id", club.id),
    // Staff at this club
    supabase.from("staff").select("id, name, position, status").eq("club_id", club.id).order("name"),
    // Campaigns for this club via junction
    supabase
      .from("campaign_clubs")
      .select("campaign_id, campaigns(id, name, status, start_date, end_date, budget, activities)")
      .eq("club_id", club.id),
    // Transfers for all periods
    supabase.from("transfers").select("period_id, transfers_in, transfers_out").eq("club_id", club.id),
  ]);

  // Step 3 — fetch training records now that we have staff IDs
  const staffIds = (staff ?? []).map((s: any) => s.id);
  const { data: trainingRecords } = staffIds.length > 0
    ? await supabase.from("training_records").select("id, expiry_date").in("staff_id", staffIds)
    : { data: [] };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in30   = new Date(today); in30.setDate(in30.getDate() + 30);
  const expiredCerts  = (trainingRecords ?? []).filter((r: any) => r.expiry_date && new Date(r.expiry_date) < today).length;
  const expiringSoon  = (trainingRecords ?? []).filter((r: any) => {
    if (!r.expiry_date) return false;
    const d = new Date(r.expiry_date);
    return d >= today && d <= in30;
  }).length;

  const latestKpi = (kpis as any[])?.[0] ?? null;

  // ── Build historical KPI data for chart ──────────────────────────────────
  const history = [...(allPeriods ?? [])].reverse().map((p) => {
    const k = (histKpis as any[])?.find((h) => h.period_id === p.id);
    return {
      label: p.period_label,
      leads_actual: k?.leads_actual ?? null,
      leads_target: k?.leads_target ?? null,
      sales_actual: k?.sales_actual ?? null,
      sales_target: k?.sales_target ?? null,
      spend_actual: k?.spend_actual ?? null,
      nnm_actual: k?.nnm_actual ?? null,
    };
  }).filter((p) => p.leads_actual !== null || p.sales_actual !== null);

  // ── Build membership trend data ──────────────────────────────────────────
  const membershipMap: Record<string, number> = {};
  (membershipCounts ?? []).forEach((m: any) => { membershipMap[m.period_id] = m.count; });
  const membershipTrend = [...(allPeriods ?? [])].reverse().map((p) => ({
    label: p.period_label,
    count: membershipMap[p.id] ?? null,
  }));
  const currentMembership = latestPeriod ? (membershipMap[latestPeriod.id] ?? null) : null;
  // Previous period for trend arrow
  const prevPeriod = allPeriods?.[1];
  const prevMembership = prevPeriod ? (membershipMap[prevPeriod.id] ?? null) : null;
  const membershipDelta = currentMembership != null && prevMembership != null
    ? currentMembership - prevMembership : null;

  // ── FY YTD membership ─────────────────────────────────────────────────────
  function getPeriodFY(dateStr: string) {
    const d = new Date(dateStr); const m = d.getMonth() + 1; const y = d.getFullYear();
    return m >= 7 ? y + 1 : y;
  }
  const nowDate    = new Date();
  const thisFY     = nowDate.getMonth() + 1 >= 7 ? nowDate.getFullYear() + 1 : nowDate.getFullYear();
  const fyOpener   = [...(allPeriods ?? [])]
    .filter((p) => getPeriodFY(p.period_date) === thisFY)
    .sort((a, b) => new Date(a.period_date).getTime() - new Date(b.period_date).getTime())[0];
  const fyOpeningCount = fyOpener ? (membershipMap[fyOpener.id] ?? null) : null;
  const fyYTD = currentMembership != null && fyOpeningCount != null
    ? currentMembership - fyOpeningCount : null;

  // ── Transfers for current period ─────────────────────────────────────────
  const currentTransfer = latestPeriod
    ? (transfers ?? []).find((t: any) => t.period_id === latestPeriod.id)
    : null;
  const transfersIn  = (currentTransfer as any)?.transfers_in  ?? 0;
  const transfersOut = (currentTransfer as any)?.transfers_out ?? 0;
  const transferNet  = transfersIn - transfersOut;

  // ── Staff ─────────────────────────────────────────────────────────────────
  const activeStaff = (staff ?? []).filter((s: any) => s.status === "active");

  // ── Campaigns ─────────────────────────────────────────────────────────────
  const campaigns = (campaignClubRows ?? [])
    .map((row: any) => row.campaigns)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const order = { active: 0, planned: 1, paused: 2, completed: 3 };
      return (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9);
    });

  // ── KPI calcs ─────────────────────────────────────────────────────────────
  const leadsPct = pct(latestKpi?.leads_actual, latestKpi?.leads_target);
  const salesPct = pct(latestKpi?.sales_actual, latestKpi?.sales_target);
  const spendPct = pct(latestKpi?.spend_actual, latestKpi?.spend_budget);

  return (
    <div>
      <PageHeader
        title={club.name}
        subtitle={latestPeriod ? `${latestPeriod.period_label} Performance` : "No KPI data yet"}
        action={
          allPeriods && allPeriods.length > 1 && latestPeriod ? (
            <PeriodSelector
              periods={allPeriods}
              currentLabel={latestPeriod.period_label}
              basePath={`/clubs/${clubId}`}
            />
          ) : undefined
        }
      />

      {/* Club Info */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 mb-6">
        <div className="flex flex-wrap gap-5 text-sm">
          {club.location && (
            <div className="flex items-center gap-2 text-[#64748B]">
              <MapPin size={14} className="text-[#94A3B8]" />
              {club.location}
            </div>
          )}
          {club.manager_name && (
            <div className="flex items-center gap-2 text-[#64748B]">
              <User size={14} className="text-[#94A3B8]" />
              {club.manager_name}
            </div>
          )}
          {club.phone && (
            <div className="flex items-center gap-2 text-[#64748B]">
              <Phone size={14} className="text-[#94A3B8]" />
              {club.phone}
            </div>
          )}
          {club.email && (
            <div className="flex items-center gap-2 text-[#64748B]">
              <Mail size={14} className="text-[#94A3B8]" />
              {club.email}
            </div>
          )}
          {club.opened_date && (
            <div className="flex items-center gap-2 text-[#64748B]">
              <Building2 size={14} className="text-[#94A3B8]" />
              Opened {new Date(club.opened_date).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Stats ──────────────────────────────────────────────────────── */}

      {/* Cert alerts */}
      {expiredCerts > 0 && (
        <div className="bg-[#FEE2E2]/30 border border-[#EF4444]/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-[#EF4444] font-semibold">
          ⚠️ {expiredCerts} certification{expiredCerts !== 1 ? "s" : ""} expired for staff at this club
        </div>
      )}
      {expiringSoon > 0 && (
        <div className="bg-[#FEF3C7]/30 border border-[#D97706]/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-[#D97706] font-semibold">
          ⏰ {expiringSoon} certification{expiringSoon !== 1 ? "s" : ""} expiring within 30 days
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

        {/* Members */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Members</span>
            <div className="w-7 h-7 rounded-lg bg-[#EDE9FE]/40 flex items-center justify-center">
              <Users size={13} className="text-[#6D28D9]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {currentMembership != null ? currentMembership.toLocaleString() : "—"}
          </div>
          {membershipDelta != null && (
            <div className={`flex items-center gap-1 text-xs mt-1 font-semibold ${membershipDelta >= 0 ? "text-[#059669]" : "text-[#EF4444]"}`}>
              {membershipDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {membershipDelta >= 0 ? "+" : ""}{membershipDelta} vs last month
            </div>
          )}
          {currentMembership == null && (
            <p className="text-xs text-[#475569] mt-1">No data this period</p>
          )}
        </div>

        {/* FY YTD */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">FY YTD</span>
            <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] flex items-center justify-center">
              <TrendingUp size={13} className="text-[#94A3B8]" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${fyYTD == null ? "text-[#475569]" : fyYTD >= 0 ? "text-[#059669]" : "text-[#EF4444]"}`}>
            {fyYTD == null ? "—" : fyYTD >= 0 ? `+${fyYTD.toLocaleString()}` : fyYTD.toLocaleString()}
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            {fyOpener ? `Since ${fyOpener.period_label}` : "FY opening not found"}
          </p>
        </div>

        {/* Active Staff */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Active Staff</span>
            <div className="w-7 h-7 rounded-lg bg-[#D1FAE5]/40 flex items-center justify-center">
              <User size={13} className="text-[#059669]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{activeStaff.length}</div>
          <p className="text-xs text-[#94A3B8] mt-1">
            {(staff ?? []).length > activeStaff.length
              ? `${(staff ?? []).length - activeStaff.length} inactive / on leave`
              : "All staff active"}
          </p>
        </div>

        {/* Campaigns */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Campaigns</span>
            <div className="w-7 h-7 rounded-lg bg-[#DBEAFE]/40 flex items-center justify-center">
              <Megaphone size={13} className="text-[#2563EB]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {campaigns.filter((c: any) => c.status === "active").length}
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            {campaigns.length > 0
              ? `${campaigns.length} total · ${campaigns.filter((c: any) => c.status === "planned").length} planned`
              : "No campaigns assigned"}
          </p>
        </div>

        {/* Transfers */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Transfers</span>
            <div className="w-7 h-7 rounded-lg bg-[#FEF3C7]/30 flex items-center justify-center">
              <ArrowDownLeft size={13} className="text-[#D97706]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {transferNet >= 0 ? `+${transferNet}` : transferNet}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-[#94A3B8]">
            <span className="flex items-center gap-0.5 text-[#059669]">
              <ArrowDownLeft size={10} />{transfersIn} in
            </span>
            <span className="flex items-center gap-0.5 text-[#EF4444]">
              <ArrowUpRight size={10} />{transfersOut} out
            </span>
          </div>
        </div>

      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      {latestKpi ? (
        <>
          <SectionLabel>KPIs · {latestPeriod?.period_label}</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <KpiCard
              label="Leads"
              value={latestKpi.leads_actual?.toLocaleString() ?? "—"}
              sub={`Target: ${latestKpi.leads_target?.toLocaleString() ?? "—"}`}
              badge={leadsPct != null ? formatPercent(leadsPct) : undefined}
              badgeVariant={leadsPct == null ? "neutral" : leadsPct >= 90 ? "green" : leadsPct >= 70 ? "amber" : "red"}
              color="purple"
            />
            <KpiCard
              label="Sales"
              value={latestKpi.sales_actual?.toLocaleString() ?? "—"}
              sub={`Target: ${latestKpi.sales_target?.toLocaleString() ?? "—"}`}
              badge={salesPct != null ? formatPercent(salesPct) : undefined}
              badgeVariant={salesPct == null ? "neutral" : salesPct >= 90 ? "green" : salesPct >= 70 ? "amber" : "red"}
              color={salesPct != null && salesPct >= 90 ? "green" : "amber"}
            />
            <KpiCard
              label="Net New Members"
              value={latestKpi.nnm_actual != null
                ? (latestKpi.nnm_actual >= 0 ? `+${latestKpi.nnm_actual}` : String(latestKpi.nnm_actual))
                : "—"}
              sub={latestKpi.nnm_target != null ? `Target: ${latestKpi.nnm_target >= 0 ? "+" : ""}${latestKpi.nnm_target}` : undefined}
              color={latestKpi.nnm_actual != null && latestKpi.nnm_actual >= 0 ? "green" : "red"}
            />
            <KpiCard
              label="Spend"
              value={formatCurrency(latestKpi.spend_actual)}
              sub={`Budget: ${formatCurrency(latestKpi.spend_budget)}`}
              badge={spendPct != null ? formatPercent(spendPct) : undefined}
              badgeVariant={spendPct == null ? "neutral" : spendPct <= 100 ? "green" : spendPct <= 115 ? "amber" : "red"}
              color="blue"
            />
            <KpiCard
              label="CPL"
              value={latestKpi.cpl != null ? formatCurrency(latestKpi.cpl) : "—"}
              sub="Cost per lead"
              color="teal"
            />
          </div>

          {/* Performance vs Target */}
          <SectionLabel>Performance vs Target</SectionLabel>
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 mb-8">
            {[
              { label: "Leads", actual: latestKpi.leads_actual, target: latestKpi.leads_target, pctVal: leadsPct },
              { label: "Sales", actual: latestKpi.sales_actual, target: latestKpi.sales_target, pctVal: salesPct },
              { label: "Marketing Spend vs Budget", actual: latestKpi.spend_actual, target: latestKpi.spend_budget, pctVal: spendPct, isCurrency: true },
            ].map((row) => {
              const fillColor = row.label === "Marketing Spend vs Budget"
                ? (row.pctVal ?? 0) > 100 ? "#EF4444" : "#059669"
                : (row.pctVal ?? 0) >= 90 ? "#059669" : (row.pctVal ?? 0) >= 70 ? "#D97706" : "#EF4444";
              const fillWidth = Math.min(row.pctVal ?? 0, 130);
              return (
                <div key={row.label} className="mb-5 last:mb-0">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-semibold text-[#0F172A]">{row.label}</span>
                    <span className="text-sm text-[#64748B]">
                      {row.isCurrency ? formatCurrency(row.actual) : row.actual?.toLocaleString() ?? "—"}
                      {" / "}
                      {row.isCurrency ? formatCurrency(row.target) : row.target?.toLocaleString() ?? "—"}
                      <span className="ml-2 font-bold" style={{ color: fillColor }}>
                        {formatPercent(row.pctVal)}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${fillWidth}%`, backgroundColor: fillColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 mb-8 text-center">
          <p className="text-sm text-[#94A3B8]">No KPI data for this period.</p>
        </div>
      )}

      {/* ── Yearly Growth Tracker ────────────────────────────────────────────── */}
      <SectionLabel>Yearly Growth Tracker</SectionLabel>
      <ClubGrowthTracker
        clubId={club.id}
        periods={allPeriods ?? []}
        kpis={(histKpis as any[]) ?? []}
        transfers={(transfers as any[]) ?? []}
        counts={(membershipCounts as any[]) ?? []}
      />

      {/* ── Two column: Membership trend + Campaigns ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Membership Trend */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0F172A]">Membership Trend</h3>
            {currentMembership != null && (
              <span className="text-xs text-[#94A3B8]">
                {currentMembership.toLocaleString()} members · {latestPeriod?.period_label}
              </span>
            )}
          </div>
          <ClubMembershipMini data={membershipTrend} />
        </div>

        {/* Campaigns */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0F172A]">Campaigns</h3>
            <span className="text-xs text-[#94A3B8]">{campaigns.length} assigned</span>
          </div>

          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Megaphone size={22} className="text-[#E2E8F0] mb-2" />
              <p className="text-xs text-[#475569]">No campaigns assigned to this club yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c: any) => {
                const activities = c.activities ?? [];
                const totalTasks = activities.reduce((s: number, a: any) => s + (a.tasks?.length ?? 0), 0);
                const doneTasks  = activities.reduce((s: number, a: any) => s + (a.tasks?.filter((t: any) => t.completed).length ?? 0), 0);
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-[#F8FAFC]/60 rounded-lg border border-[#E2E8F0]/60">
                    <span className={`flex-shrink-0 w-2 h-2 rounded-full ${STATUS_DOT[c.status] ?? "bg-[#94A3B8]"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{c.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-[#94A3B8]">
                        {(c.start_date || c.end_date) && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {c.start_date ? new Date(c.start_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}
                            {c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
                          </span>
                        )}
                        {c.budget != null && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={10} />
                            {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(c.budget)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[c.status] ?? ""}`}>
                        {c.status}
                      </span>
                      {totalTasks > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 justify-end">
                          <div className="w-12 h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${(doneTasks / totalTasks) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-[#475569]">{doneTasks}/{totalTasks}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Staff ────────────────────────────────────────────────────────────── */}
      <SectionLabel>Staff</SectionLabel>
      {(staff ?? []).length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-8 mb-8 flex flex-col items-center justify-center text-center">
          <Users size={22} className="text-[#E2E8F0] mb-2" />
          <p className="text-xs text-[#475569]">No staff added for this club yet.</p>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#94A3B8] text-[11px] uppercase tracking-wide border-b border-[#E2E8F0]">
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Position</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(staff as any[]).map((member) => (
                <tr key={member.id} className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{member.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{member.position ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STAFF_STATUS[member.status] ?? ""}`}>
                      {member.status?.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Historical KPI Chart ─────────────────────────────────────────────── */}
      {history.length > 1 && (
        <>
          <SectionLabel>Historical Trend</SectionLabel>
          <ClubKpiHistory data={history} />
        </>
      )}
    </div>
  );
}
