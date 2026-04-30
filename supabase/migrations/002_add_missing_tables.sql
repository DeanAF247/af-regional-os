-- ============================================================
-- AF Regional OS — Migration 002: Add Missing Tables
-- Run this in your Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- ─── Membership Counts ────────────────────────────────────────────────────────
-- Monthly member headcount per club

create table if not exists membership_counts (
  club_id   uuid not null references clubs(id) on delete cascade,
  period_id uuid not null references kpi_periods(id) on delete cascade,
  count     integer not null default 0,
  primary key (club_id, period_id)
);

-- ─── Transfers ────────────────────────────────────────────────────────────────
-- Monthly member transfers in/out per club

create table if not exists transfers (
  club_id       uuid not null references clubs(id) on delete cascade,
  period_id     uuid not null references kpi_periods(id) on delete cascade,
  transfers_in  integer not null default 0,
  transfers_out integer not null default 0,
  primary key (club_id, period_id)
);

-- ─── Fitness Passport Members ─────────────────────────────────────────────────
-- Monthly FP member count per club (separate to DD members)

create table if not exists fp_members (
  club_id   uuid not null references clubs(id) on delete cascade,
  period_id uuid not null references kpi_periods(id) on delete cascade,
  count     integer not null default 0,
  primary key (club_id, period_id)
);

-- ─── Club Scores (CHS & OSAT) ─────────────────────────────────────────────────
-- Club Health Score and Overall Satisfaction, per club per period

create table if not exists club_scores (
  club_id   uuid not null references clubs(id) on delete cascade,
  period_id uuid not null references kpi_periods(id) on delete cascade,
  chs       numeric(5, 2),   -- e.g. 87.50
  osat      numeric(5, 2),   -- e.g. 92.10
  primary key (club_id, period_id)
);

-- ─── Yield Records (Group-level) ─────────────────────────────────────────────
-- Average DD yield and FP yield per member for the group, per period

create table if not exists yield_records (
  period_id uuid not null references kpi_periods(id) on delete cascade primary key,
  dd_yield  numeric(10, 2),  -- avg $ per DD member
  fp_yield  numeric(10, 2)   -- avg $ per FP member
);

-- ─── Club Yield Records (Per-club) ───────────────────────────────────────────
-- Same as above but tracked individually per club

create table if not exists club_yield_records (
  club_id   uuid not null references clubs(id) on delete cascade,
  period_id uuid not null references kpi_periods(id) on delete cascade,
  dd_yield  numeric(10, 2),
  fp_yield  numeric(10, 2),
  primary key (club_id, period_id)
);

-- ─── Add activities column to campaigns ──────────────────────────────────────
-- Stores campaign activity checklists as JSONB (array of activity objects with tasks)

alter table campaigns
  add column if not exists activities jsonb not null default '[]';

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table membership_counts   enable row level security;
alter table transfers            enable row level security;
alter table fp_members           enable row level security;
alter table club_scores          enable row level security;
alter table yield_records        enable row level security;
alter table club_yield_records   enable row level security;

-- Allow all operations for authenticated users
do $$
declare
  t text;
begin
  foreach t in array array[
    'membership_counts', 'transfers', 'fp_members',
    'club_scores', 'yield_records', 'club_yield_records'
  ]
  loop
    execute format(
      'create policy "authenticated_all" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
