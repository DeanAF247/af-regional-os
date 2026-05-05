-- Remove the single lead_source column added in migration 003
ALTER TABLE club_kpis
  DROP COLUMN IF EXISTS lead_source;

-- Create a dedicated lead source breakdown table (one row per club per period)
CREATE TABLE IF NOT EXISTS club_lead_sources (
  club_id            uuid NOT NULL REFERENCES clubs(id)       ON DELETE CASCADE,
  period_id          uuid NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
  web_online         integer,
  referral           integer,
  mobile_app         integer,
  brand_marketing    integer,
  in_person_walk_in  integer,
  none               integer,
  PRIMARY KEY (club_id, period_id)
);
