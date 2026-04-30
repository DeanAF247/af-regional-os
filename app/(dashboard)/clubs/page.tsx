import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import SectionLabel from "@/components/section-label";
import ClubCard from "@/components/club-card";
import Link from "next/link";
import { Plus } from "lucide-react";
import { pct } from "@/lib/utils";

const CLUB_SLUGS: Record<string, string> = {
  "Greenhills":     "greenhills",
  "Thornton":       "thornton",
  "Newcastle West": "newcastle-west",
  "Kotara":         "kotara",
  "Edgeworth":      "edgeworth",
  "Lake Haven":     "lake-haven",
};

export default async function ClubsPage() {
  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("*")
    .order("name");

  const { data: periods } = await supabase
    .from("kpi_periods")
    .select("*")
    .order("period_date", { ascending: false })
    .limit(1);

  const latestPeriod = periods?.[0] ?? null;

  let clubKpis: Record<string, any> = {};
  if (latestPeriod) {
    const { data: kpis } = await supabase
      .from("club_kpis")
      .select("*")
      .eq("period_id", latestPeriod.id);
    kpis?.forEach((k) => { clubKpis[k.club_id] = k; });
  }

  const clubCardData = (clubs ?? []).map((club) => {
    const k = clubKpis[club.id];
    return {
      id:           club.id,
      name:         club.name,
      slug:         CLUB_SLUGS[club.name] ?? club.name.toLowerCase().replace(/\s+/g, "-"),
      leads_actual: k?.leads_actual ?? null,
      leads_target: k?.leads_target ?? null,
      leads_pct:    pct(k?.leads_actual, k?.leads_target),
      sales_actual: k?.sales_actual ?? null,
      sales_target: k?.sales_target ?? null,
      sales_pct:    pct(k?.sales_actual, k?.sales_target),
      nnm_actual:   k?.nnm_actual ?? null,
      nnm_target:   k?.nnm_target ?? null,
      spend_actual: k?.spend_actual ?? null,
      spend_budget: k?.spend_budget ?? null,
      spend_pct:    pct(k?.spend_actual, k?.spend_budget),
      cpl:          k?.cpl ?? null,
    };
  });

  const active = clubCardData.filter((c) => clubs?.find((cl) => cl.id === c.id)?.status === "active");
  const inactive = clubCardData.filter((c) => clubs?.find((cl) => cl.id === c.id)?.status === "inactive");

  return (
    <div>
      <PageHeader
        title="Clubs"
        subtitle={`${active.length} active club${active.length !== 1 ? "s" : ""}${latestPeriod ? ` · ${latestPeriod.period_label}` : ""}`}
        action={
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1F35] border border-[#252B45] hover:border-[#7C3AED] text-[#94A3B8] hover:text-[#A78BFA] text-sm font-semibold rounded-lg transition-all">
            <Plus size={16} />
            Add Club
          </button>
        }
      />

      <SectionLabel>Active Clubs</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {active.map((club) => (
          <ClubCard key={club.id} club={club} />
        ))}
      </div>

      {inactive.length > 0 && (
        <>
          <SectionLabel>Inactive</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {inactive.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
