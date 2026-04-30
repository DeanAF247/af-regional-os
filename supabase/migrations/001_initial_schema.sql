-- ============================================================
-- AF Regional OS — Initial Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Clubs ────────────────────────────────────────────────────────────────────

create table if not exists clubs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  location     text,
  address      text,
  phone        text,
  email        text,
  manager_name text,
  opened_date  date,
  status       text not null default 'active' check (status in ('active', 'inactive')),
  created_at   timestamptz not null default now()
);

-- Seed the 6 clubs
insert into clubs (name, location, status) values
  ('Greenhills',     'Greenhills',     'active'),
  ('Thornton',       'Thornton',       'active'),
  ('Newcastle West', 'Newcastle West', 'active'),
  ('Kotara',         'Kotara',         'active'),
  ('Edgeworth',      'Edgeworth',      'active'),
  ('Lake Haven',     'Lake Haven',     'active')
on conflict do nothing;

-- ─── KPI Periods ──────────────────────────────────────────────────────────────

create table if not exists kpi_periods (
  id            uuid primary key default gen_random_uuid(),
  period_label  text not null unique,   -- "February 2026"
  period_date   date not null,          -- 2026-02-01
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ─── Club KPIs ────────────────────────────────────────────────────────────────

create table if not exists club_kpis (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references clubs(id) on delete cascade,
  period_id      uuid not null references kpi_periods(id) on delete cascade,
  leads_actual   integer,
  leads_target   integer,
  sales_actual   integer,
  sales_target   integer,
  nnm_actual     integer,
  nnm_target     integer,
  cpl            numeric(10, 2),
  spend_actual   numeric(10, 2),
  spend_budget   numeric(10, 2),
  created_at     timestamptz not null default now(),
  unique (club_id, period_id)
);

-- ─── SOPs ─────────────────────────────────────────────────────────────────────

create table if not exists sops (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text not null default 'Other',
  content      text not null default '',
  version      integer not null default 1,
  is_published boolean not null default false,
  created_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ─── Marketing Campaigns ──────────────────────────────────────────────────────

create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  start_date  date,
  end_date    date,
  budget      numeric(10, 2),
  status      text not null default 'planned'
                check (status in ('planned', 'active', 'completed', 'paused')),
  created_at  timestamptz not null default now()
);

create table if not exists campaign_clubs (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  club_id     uuid not null references clubs(id) on delete cascade,
  primary key (campaign_id, club_id)
);

-- ─── Staff ────────────────────────────────────────────────────────────────────

create table if not exists staff (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  position    text,
  email       text,
  phone       text,
  start_date  date,
  status      text not null default 'active'
                check (status in ('active', 'inactive', 'on_leave')),
  created_at  timestamptz not null default now()
);

-- ─── Onboarding Checklists ────────────────────────────────────────────────────

create table if not exists onboarding_templates (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  steps      jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists staff_onboarding (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id) on delete cascade,
  template_id uuid references onboarding_templates(id) on delete set null,
  progress    jsonb not null default '{}',
  completed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── Training ─────────────────────────────────────────────────────────────────

create table if not exists training_records (
  id                 uuid primary key default gen_random_uuid(),
  staff_id           uuid not null references staff(id) on delete cascade,
  training_name      text not null,
  completed_date     date,
  expiry_date        date,
  certification_url  text,
  notes              text,
  created_at         timestamptz not null default now()
);

-- ─── Vendors ──────────────────────────────────────────────────────────────────

create table if not exists vendors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text not null default 'Other',
  contact_name text,
  email        text,
  phone        text,
  website      text,
  notes        text,
  status       text not null default 'active'
                 check (status in ('active', 'inactive')),
  created_at   timestamptz not null default now()
);

create table if not exists vendor_clubs (
  vendor_id uuid not null references vendors(id) on delete cascade,
  club_id   uuid not null references clubs(id) on delete cascade,
  primary key (vendor_id, club_id)
);

-- ─── Incidents ────────────────────────────────────────────────────────────────

create table if not exists incidents (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  date         date not null,
  type         text not null default 'Other',
  description  text not null,
  reported_by  text,
  status       text not null default 'open'
                 check (status in ('open', 'in_progress', 'resolved', 'closed')),
  resolution   text,
  created_at   timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Simple policy: only authenticated users can read/write all data
-- Expand later for role-based access

alter table clubs enable row level security;
alter table kpi_periods enable row level security;
alter table club_kpis enable row level security;
alter table sops enable row level security;
alter table campaigns enable row level security;
alter table campaign_clubs enable row level security;
alter table staff enable row level security;
alter table onboarding_templates enable row level security;
alter table staff_onboarding enable row level security;
alter table training_records enable row level security;
alter table vendors enable row level security;
alter table vendor_clubs enable row level security;
alter table incidents enable row level security;

-- Allow all operations for authenticated users
do $$
declare
  t text;
begin
  foreach t in array array[
    'clubs','kpi_periods','club_kpis','sops','campaigns','campaign_clubs',
    'staff','onboarding_templates','staff_onboarding','training_records',
    'vendors','vendor_clubs','incidents'
  ]
  loop
    execute format(
      'create policy "authenticated_all" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
