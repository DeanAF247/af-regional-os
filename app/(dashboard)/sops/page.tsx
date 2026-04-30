import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import SopManager from "@/components/sop-manager";

export default async function SopsPage() {
  const supabase = await createClient();

  const { data: sops } = await supabase
    .from("sops")
    .select("*")
    .order("category")
    .order("title");

  return (
    <div>
      <PageHeader
        title="Standard Operating Procedures"
        subtitle="Central repository for all club SOPs and process documentation"
      />
      <SopManager sops={sops ?? []} />
    </div>
  );
}
