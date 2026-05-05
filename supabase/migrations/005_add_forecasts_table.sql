-- Forecast targets per club per period.
-- Designed to be extended with additional forecast columns over time.
CREATE TABLE IF NOT EXISTS club_forecasts (
  club_id              uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  period_id            uuid NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
  net_member_movement  integer,
  PRIMARY KEY (club_id, period_id)
);
