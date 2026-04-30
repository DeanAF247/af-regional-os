import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import TrainingManager from "@/components/training-manager";

export default async function TrainingPage() {
  const supabase = await createClient();

  const [{ data: records }, { data: staff }] = await Promise.all([
    supabase
      .from("training_records")
      .select("*, staff:staff(id, name, club:clubs(name))")
      .order("expiry_date", { ascending: true }),
    supabase
      .from("staff")
      .select("id, name, club:clubs(name)")
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Training & Certifications"
        subtitle="Track staff training completion and certification expiry dates"
      />
      <TrainingManager records={records as any ?? []} staff={staff as any ?? []} />
    </div>
  );
}
