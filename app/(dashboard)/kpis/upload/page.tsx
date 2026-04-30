import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import KpiUploadForm from "@/components/kpi-upload-form";

export default async function KpiUploadPage() {
  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Upload KPI Period"
        subtitle="Enter monthly KPI data for each club, or import from CSV"
      />
      <KpiUploadForm clubs={clubs ?? []} />
    </div>
  );
}
