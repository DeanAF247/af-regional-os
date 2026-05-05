import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import ForecastEntryForm from "@/components/forecast-entry-form";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Build every month from May 2026 through June 2027 (14 months)
function buildForecastMonths() {
  const months = [];
  let year = 2026;
  let month = 4; // May = index 4 (0-based)
  while (year < 2027 || (year === 2027 && month <= 5)) {
    months.push({
      period_label: `${MONTH_NAMES[month]} ${year}`,
      period_date:  `${year}-${String(month + 1).padStart(2, "0")}-01`,
    });
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return months;
}

export default async function ForecastsPage() {
  const supabase = await createClient();

  // Seed all forecast periods (upsert is safe to call every render)
  const periodsToSeed = buildForecastMonths();
  await supabase
    .from("kpi_periods")
    .upsert(periodsToSeed, { onConflict: "period_label" });

  // Fetch clubs + the forecast period rows in parallel
  const [{ data: clubs }, { data: periods }] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("status", "active").order("name"),
    supabase
      .from("kpi_periods")
      .select("id, period_label, period_date")
      .in("period_label", periodsToSeed.map((p) => p.period_label))
      .order("period_date", { ascending: true }),
  ]);

  const months = (periods ?? []).map((p) => ({
    period_id: p.id,
    label:     p.period_label,
  }));

  return (
    <div>
      <PageHeader
        title="Forecasts"
        subtitle="Monthly forecast targets per club · May 2026 – June 2027"
      />
      <ForecastEntryForm clubs={clubs ?? []} months={months} />
    </div>
  );
}
