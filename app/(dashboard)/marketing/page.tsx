import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import CampaignManager from "@/components/campaign-manager";

export default async function MarketingPage() {
  const supabase = await createClient();

  const [{ data: campaigns }, { data: clubs }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, description, start_date, end_date, budget, status, activities, campaign_clubs(club_id)")
      .order("created_at", { ascending: false }),
    supabase
      .from("clubs")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Marketing Campaigns"
        subtitle="Manage and track campaigns across all clubs"
      />
      <CampaignManager campaigns={campaigns ?? []} clubs={clubs ?? []} />
    </div>
  );
}
