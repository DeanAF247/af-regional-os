-- ============================================================
-- AF Regional OS — Migration 006: Add Cancels to Club KPIs
-- Run this in your Supabase SQL Editor
-- ============================================================

alter table club_kpis
  add column if not exists cancels_actual integer,
  add column if not exists cancels_target integer;
