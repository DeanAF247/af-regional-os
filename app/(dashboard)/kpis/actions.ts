"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deletePeriod(periodId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("kpi_periods")
    .delete()
    .eq("id", periodId);
  if (error) throw new Error(error.message);
  revalidatePath("/kpis");
  revalidatePath("/");
  revalidatePath("/memberships");
  revalidatePath("/kpis/year");
}

export async function deleteAllPeriods() {
  const supabase = await createClient();
  // Cascade deletes will wipe club_kpis, membership_counts, transfers,
  // fp_members, club_scores, yield_records, club_yield_records
  const { error } = await supabase
    .from("kpi_periods")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows
  if (error) throw new Error(error.message);
  revalidatePath("/kpis");
  revalidatePath("/");
  revalidatePath("/memberships");
  revalidatePath("/kpis/year");
}
