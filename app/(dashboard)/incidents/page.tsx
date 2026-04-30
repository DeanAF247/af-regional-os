import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import IncidentManager from "@/components/incident-manager";

export default async function IncidentsPage() {
  const supabase = await createClient();

  const [{ data: incidents }, { data: clubs }] = await Promise.all([
    supabase
      .from("incidents")
      .select("*, club:clubs(name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("clubs")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
  ]);

  const openCount = (incidents ?? []).filter(
    (i) => i.status === "open" || i.status === "in_progress"
  ).length;

  return (
    <div>
      <PageHeader
        title="Incident Reports"
        subtitle={`${openCount} open incident${openCount !== 1 ? "s" : ""} requiring attention`}
      />
      <IncidentManager incidents={incidents ?? []} clubs={clubs ?? []} />
    </div>
  );
}
