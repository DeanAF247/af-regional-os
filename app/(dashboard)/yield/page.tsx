import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import YieldEditor from "@/components/yield-editor";
import { DollarSign } from "lucide-react";

const CLUB_ORDER = [
  "Greenhills", "Thornton", "Newcastle West", "Kotara", "Edgeworth", "Lake Haven",
];

export default async function YieldPage() {
  const supabase = await createClient();

  const [
    { data: clubs },
    { data: periods },
    { data: yieldRecords },
    { data: clubYieldRecords },
  ] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("status", "active").order("name"),
    supabase.from("kpi_periods").select("id, period_label, period_date").order("period_date", { ascending: true }),
    supabase.from("yield_records").select("period_id, dd_yield, fp_yield"),
    supabase.from("club_yield_records").select("club_id, period_id, dd_yield, fp_yield"),
  ]);

  const sortedClubs = [...(clubs ?? [])].sort((a, b) => {
    const ai = CLUB_ORDER.indexOf(a.name);
    const bi = CLUB_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const hasData = (periods ?? []).length > 0;

  return (
    <div>
      <PageHeader
        title="Yield Tracking"
        subtitle="Average DD yield per member and average revenue per Fitness Passport member, by month"
      />

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1F35] border border-[#252B45] flex items-center justify-center mb-4">
            <DollarSign size={28} className="text-[#64748B]" />
          </div>
          <h2 className="text-lg font-bold text-[#F1F5F9] mb-2">No periods yet</h2>
          <p className="text-[#64748B] text-sm max-w-sm">
            Upload your first KPI period — yield data shares the same monthly periods.
          </p>
        </div>
      ) : (
        <YieldEditor
          clubs={sortedClubs}
          periods={periods ?? []}
          yieldRecords={yieldRecords ?? []}
          clubYieldRecords={clubYieldRecords ?? []}
        />
      )}
    </div>
  );
}
