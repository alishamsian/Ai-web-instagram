-- Phase 6 — Intelligence indexes (additive, backward compatible).
-- Supports bounded analytics over product_events + activation table scans.
-- No new public grants; service_role only via existing table grants.

-- Product events: analytics by name within a time window
create index if not exists product_events_name_occurred_idx
  on public.product_events (event_name, occurred_at desc);

-- Product events: user progression / retention activity lookups
create index if not exists product_events_user_occurred_idx
  on public.product_events (user_id, occurred_at desc)
  where user_id is not null;

-- Product events: workspace progression
create index if not exists product_events_workspace_occurred_idx
  on public.product_events (workspace_id, occurred_at desc)
  where workspace_id is not null;

-- Websites: published_at range for activation / funnel
create index if not exists websites_published_at_active_idx
  on public.websites (published_at desc)
  where deleted_at is null and published_at is not null;

-- Websites: workspace + status for feature adoption / health
create index if not exists websites_workspace_status_active_idx
  on public.websites (workspace_id, status)
  where deleted_at is null;

-- Instagram imports: workspace activation signal
create index if not exists instagram_imports_workspace_created_idx
  on public.instagram_imports (workspace_id, created_at desc);

-- Profiles: signup cohort windows
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

comment on index public.product_events_name_occurred_idx is
  'Phase 6 analytics: event_name + time window scans';
comment on index public.websites_published_at_active_idx is
  'Phase 6 activation/funnel: published websites by published_at';
comment on index public.profiles_created_at_idx is
  'Phase 6 cohorts: signup date windows';
