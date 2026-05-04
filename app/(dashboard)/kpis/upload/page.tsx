import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import KpiUploadForm from "@/components/kpi-upload-form";

export default async function KpiEntryPage() {
  const supabase = await createClient();

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
