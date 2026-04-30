import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import ScoresEditor from "@/components/scores-editor";
import { Activity } from "lucide-react";

const CLUB_ORDER = [
  "Greenhills", "Thornton", "Newcastle West", "Kotara", "Edgeworth", "Lake Haven",
];

export default async function ScoresPage() {
  const supabase = await createClient();

  const [{ data: clubs }, { data: periods }, { data: scores }] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("status", "active").order("name"),
    supabase.from("kpi_periods").select("id, period_label, period_date").order("period_date", { ascending: true }),
    supabase.from("club_scores").select("club_id, period_id, chs, osat"),
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
        title="CHS & OSAT"
        subtitle="Club Health Score and Overall Satisfaction tracking across all clubs"
      />

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1F35] border border-[#252B45] flex items-center justify-center mb-4">
            <Activity size={28} className="text-[#64748B]" />
          </div>
          <h2 className="text-lg font-bold text-[#F1F5F9] mb-2">No periods yet</h2>
          <p className="text-[#64748B] text-sm max-w-sm">
            Upload your first KPI period — CHS & OSAT data shares the same monthly periods.
          </p>
        </div>
      ) : (
        <ScoresEditor
          clubs={sortedClubs}
          periods={periods ?? []}
          scores={scores ?? []}
        />
      )}
    </div>
  );
}
