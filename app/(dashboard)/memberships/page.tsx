import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import SectionLabel from "@/components/section-label";
import MembershipEditor from "@/components/membership-editor";
import MembershipChart from "@/components/membership-chart";
import TransferEditor from "@/components/transfer-editor";
import ReconTable from "@/components/recon-table";
import FpSummary from "@/components/fp-summary";
import { Users } from "lucide-react";
import { currentPeriod } from "@/lib/utils";

const CLUB_ORDER = [
  "Greenhills",
  "Thornton",
  "Newcastle West",
  "Kotara",
  "Edgeworth",
  "Lake Haven",
];

export default async function MembershipsPage() {
  const supabase = await createClient();

  // Auto-create the current month's period if it doesn't exist yet
  const cp = currentPeriod();
  await supabase.from("kpi_periods").upsert(cp, { onConflict: "period_label" });

  const [
    { data: clubs },
    { data: periods },
    { data: counts },
    { data: transfers },
    { data: kpis },
    { data: fpRecords },
  ] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("status", "active").order("name"),
    supabase.from("kpi_periods").select("id, period_label, period_date").order("period_date", { ascending: true }),
    supabase.from("membership_counts").select("club_id, period_id, count"),
    supabase.from("transfers").select("club_id, period_id, transfers_in, transfers_out"),
    supabase.from("club_kpis").select("club_id, period_id, nnm_actual, sales_actual"),
    supabase.from("fp_members").select("club_id, period_id, count"),
  ]);

  const sortedClubs = [...(clubs ?? [])].sort((a, b) => {
    const ai = CLUB_ORDER.indexOf(a.name);
    const bi = CLUB_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Build chart data
  const chartData = (periods ?? []).map((p) => {
    const entry: Record<string, any> = {
      label: p.period_label.split(" ")[0].slice(0, 3) + " " + (p.period_label.split(" ")[1]?.slice(2) ?? ""),
    };
    for (const club of sortedClubs) {
      const c = counts?.find((x) => x.club_id === club.id && x.period_id === p.id);
      entry[club.name] = c?.count ?? null;
    }
    const vals = sortedClubs.map((club) => entry[club.name]).filter((v) => v != null);
    entry["Group Total"] = vals.length > 0 ? vals.reduce((s: number, v: number) => s + v, 0) : null;
    return entry;
  });

  // Build reconciliation data: for each club+period, show prev → NNM + transfers → actual
  // Only show periods where we have at least 2 data points (need a "previous")
  const reconRows: {
    club:         { id: string; name: string };
    period:       { id: string; period_label: string };
    prev:         number | null;
    sales:        number | null;
    cancellations: number | null;
    nnm:          number | null;
    tIn:          number | null;
    tOut:         number | null;
    expected:     number | null;
    actual:       number | null;
    variance:     number | null;
  }[] = [];

  if ((periods ?? []).length >= 2) {
    const sortedPeriods = [...(periods ?? [])];
    for (let pi = 1; pi < sortedPeriods.length; pi++) {
      const period     = sortedPeriods[pi];
      const prevPeriod = sortedPeriods[pi - 1];

      for (const club of sortedClubs) {
        const prevCount = counts?.find((c) => c.club_id === club.id && c.period_id === prevPeriod.id)?.count ?? null;
        const currCount = counts?.find((c) => c.club_id === club.id && c.period_id === period.id)?.count ?? null;
        const kpiRow    = kpis?.find((k) => k.club_id === club.id && k.period_id === period.id);
        const nnm       = kpiRow?.nnm_actual ?? null;
        const sales     = kpiRow?.sales_actual ?? null;
        // Cancellations derived: Sales − NNM (since NNM = Sales − Cancellations)
        const cancellations = sales != null && nnm != null ? sales - nnm : null;
        const tIn   = transfers?.find((t) => t.club_id === club.id && t.period_id === period.id)?.transfers_in ?? null;
        const tOut  = transfers?.find((t) => t.club_id === club.id && t.period_id === period.id)?.transfers_out ?? null;

        if (prevCount == null && currCount == null) continue;

        const expected = prevCount != null
          ? prevCount + (nnm ?? 0) + (tIn ?? 0) - (tOut ?? 0)
          : null;
        const variance = expected != null && currCount != null ? currCount - expected : null;

        reconRows.push({ club, period, prev: prevCount, sales, cancellations, nnm, tIn, tOut, expected, actual: currCount, variance });
      }
    }
  }

  const hasAnyPeriods = (periods ?? []).length > 0;

  return (
    <div>
      <PageHeader
        title="Membership"
        subtitle="Track active members, transfers in/out, and net movement per club"
      />

      {!hasAnyPeriods ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-4">
            <Users size={28} className="text-[#94A3B8]" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-2">No periods yet</h2>
          <p className="text-[#94A3B8] text-sm max-w-sm">
            Upload your first KPI period first — membership data shares the same monthly periods.
          </p>
        </div>
      ) : (
        <>
          {/* Chart */}
          {chartData.some((d) => sortedClubs.some((c) => d[c.name] != null)) && (
            <>
              <SectionLabel>Membership Growth</SectionLabel>
              <MembershipChart data={chartData} clubs={sortedClubs.map((c) => c.name)} />
            </>
          )}

          {/* Member counts */}
          <SectionLabel>Monthly Member Counts</SectionLabel>
          <MembershipEditor
            clubs={sortedClubs}
            periods={periods ?? []}
            counts={counts ?? []}
          />

          {/* DD / FP / Total summary */}
          <SectionLabel>Total DD & Fitness Passport Members</SectionLabel>
          <FpSummary
            clubs={sortedClubs}
            periods={periods ?? []}
            fpRecords={fpRecords ?? []}
            ddCounts={counts ?? []}
          />

          {/* Transfers */}
          <SectionLabel>Transfers In / Out</SectionLabel>
          <TransferEditor
            clubs={sortedClubs}
            periods={periods ?? []}
            transfers={transfers ?? []}
          />

          {/* Reconciliation table */}
          {reconRows.length > 0 && (
            <>
              <SectionLabel>Movement Reconciliation</SectionLabel>
              <ReconTable rows={reconRows} />
            </>
          )}
        </>
      )}
    </div>
  );
}
