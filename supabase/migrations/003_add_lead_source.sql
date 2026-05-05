-- Add lead_source column to club_kpis
ALTER TABLE club_kpis
  ADD COLUMN IF NOT EXISTS lead_source text CHECK (
    lead_source IN (
      'Web / Online',
      'Referral',
      'Mobile App',
      'Brand / Marketing',
      'In-Person / Walk-in',
      'None'
    )
  );
