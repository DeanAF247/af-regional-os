import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import KpiUploadForm from "@/components/kpi-upload-form";
import { currentPeriod } from "@/lib/utils";

export default async function KpiEntryPage() {
  const supabase = await createClient();

  // Auto-create the last 6 months of periods so past months are always available
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const periodsToSeed = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return {
      period_label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      period_date:  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`,
    };
  });
  await supabase.from("kpi_periods").upsert(periodsToSeed, { onConflict: "period_label" });

  const [{ data: clubs }, { data: periods }] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("status", "active").order("name"),
    supabase.from("kpi_periods").select("id, period_label, period_date").order("period_date", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title="Enter KPIs"
        subtitle="Add or edit monthly KPI data for all clubs"
      />
      <KpiUploadForm clubs={clubs ?? []} periods={periods ?? []} />
    </div>
  );
}
