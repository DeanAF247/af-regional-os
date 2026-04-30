import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import StaffManager from "@/components/staff-manager";

export default async function StaffPage() {
  const supabase = await createClient();

  const [{ data: staff }, { data: clubs }] = await Promise.all([
    supabase.from("staff").select("*, club:clubs(name)").order("name"),
    supabase.from("clubs").select("id, name").eq("status", "active").order("name"),
  ]);

  const activeCount = (staff ?? []).filter((m) => m.status === "active").length;

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${activeCount} active staff members across all clubs`}
      />
      <StaffManager staff={staff ?? []} clubs={clubs ?? []} />
    </div>
  );
}
