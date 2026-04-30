import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import VendorManager from "@/components/vendor-manager";

export default async function VendorsPage() {
  const supabase = await createClient();

  const [{ data: vendors }, { data: clubs }] = await Promise.all([
    supabase
      .from("vendors")
      .select("*, vendor_clubs(club_id, club:clubs(name))")
      .order("name"),
    supabase
      .from("clubs")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
  ]);

  const activeCount = (vendors ?? []).filter((v) => v.status === "active").length;

  return (
    <div>
      <PageHeader
        title="Vendors & Suppliers"
        subtitle={`${activeCount} active vendors across all clubs`}
      />
      <VendorManager vendors={vendors ?? []} clubs={clubs ?? []} />
    </div>
  );
}
