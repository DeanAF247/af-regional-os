// ─── Club ────────────────────────────────────────────────────────────────────

export interface Club {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  opened_date: string | null;
  status: "active" | "inactive";
  created_at: string;
}

// ─── KPI Period ───────────────────────────────────────────────────────────────

export interface KpiPeriod {
  id: string;
  period_label: string;   // e.g. "February 2026"
  period_date: string;    // ISO date string, first of month
  uploaded_by: string | null;
  created_at: string;
}

// ─── Club KPIs ────────────────────────────────────────────────────────────────

export interface ClubKpi {
  id: string;
  club_id: string;
  period_id: string;
  leads_actual: number | null;
  leads_target: number | null;
  sales_actual: number | null;
  sales_target: number | null;
  nnm_actual: number | null;
  nnm_target: number | null;
  cpl: number | null;
  spend_actual: number | null;
  spend_budget: number | null;
  created_at: string;
  // joined
  club?: Club;
  period?: KpiPeriod;
}

export interface ClubKpiWithClub extends ClubKpi {
  club: Club;
}

// ─── Club Lead Sources ────────────────────────────────────────────────────────

export interface ClubLeadSources {
  club_id:            string;
  period_id:          string;
  web_online:         number | null;
  referral:           number | null;
  mobile_app:         number | null;
  brand_marketing:    number | null;
  in_person_walk_in:  number | null;
  none:               number | null;
}

// ─── Group Summary (computed) ─────────────────────────────────────────────────

export interface GroupKpiSummary {
  total_leads: number;
  leads_target: number;
  leads_pct: number;
  total_sales: number;
  sales_target: number;
  sales_pct: number;
  total_nnm: number;
  total_spend: number;
  total_budget: number;
  spend_pct: number;
  avg_cpl: number;
}

// ─── SOP ─────────────────────────────────────────────────────────────────────

export type SopCategory =
  | "Operations"
  | "Marketing"
  | "HR & Staff"
  | "Finance"
  | "Safety & Compliance"
  | "Member Experience"
  | "Other";

export interface Sop {
  id: string;
  title: string;
  category: SopCategory;
  content: string;
  version: number;
  is_published: boolean;
  created_by: string | null;
  updated_at: string;
  created_at: string;
}

// ─── Marketing Campaign ───────────────────────────────────────────────────────

export type CampaignStatus = "planned" | "active" | "completed" | "paused";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  status: CampaignStatus;
  created_at: string;
  // joined
  campaign_clubs?: { club_id: string; club?: Club }[];
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export type StaffStatus = "active" | "inactive" | "on_leave";

export interface StaffMember {
  id: string;
  club_id: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  start_date: string | null;
  status: StaffStatus;
  created_at: string;
  club?: Club;
}

// ─── Training ─────────────────────────────────────────────────────────────────

export interface TrainingRecord {
  id: string;
  staff_id: string;
  training_name: string;
  completed_date: string | null;
  expiry_date: string | null;
  certification_url: string | null;
  notes: string | null;
  created_at: string;
  staff?: StaffMember;
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export type VendorCategory =
  | "Cleaning"
  | "Equipment"
  | "Marketing"
  | "IT & Tech"
  | "Maintenance"
  | "Supplies"
  | "Legal & Compliance"
  | "Other";

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
  vendor_clubs?: { club_id: string; club?: Club }[];
}

// ─── Incident ─────────────────────────────────────────────────────────────────

export type IncidentType =
  | "Injury"
  | "Equipment Failure"
  | "Member Complaint"
  | "Security"
  | "Maintenance"
  | "Other";

export type IncidentStatus = "open" | "in_progress" | "resolved" | "closed";

export interface Incident {
  id: string;
  club_id: string;
  date: string;
  type: IncidentType;
  description: string;
  reported_by: string | null;
  status: IncidentStatus;
  resolution: string | null;
  created_at: string;
  club?: Club;
}
