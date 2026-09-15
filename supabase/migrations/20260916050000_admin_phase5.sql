-- Phase 5 — Operations + Security Control Plane
-- Additive only. Idempotent (IF NOT EXISTS / DO blocks).
-- Privileged tables: revoke anon/authenticated; service_role only.

-- ── system_events enrichment ─────────────────────────────────────────
alter table public.system_events
  add column if not exists correlation_id text;

alter table public.system_events
  add column if not exists fingerprint text;

alter table public.system_events
  add column if not exists resource_type text;

alter table public.system_events
  add column if not exists resource_id text;

alter table public.system_events
  add column if not exists workspace_id uuid;

alter table public.system_events
  add column if not exists user_id uuid;

create index if not exists system_events_correlation_idx
  on public.system_events (correlation_id)
  where correlation_id is not null;

create index if not exists system_events_fingerprint_time_idx
  on public.system_events (fingerprint, occurred_at desc)
  where fingerprint is not null;

create index if not exists system_events_source_code_time_idx
  on public.system_events (source, error_code, occurred_at desc);

-- ── Error fingerprint aggregates (deterministic grouping) ────────────
create table if not exists public.admin_error_groups (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  source text not null,
  error_code text,
  normalized_message text,
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'critical')),
  occurrence_count integer not null default 1
    check (occurrence_count >= 1),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_correlation_id text,
  last_resource_type text,
  last_resource_id text,
  last_workspace_id uuid,
  sample_message text,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved')),
  linked_incident_id uuid references public.admin_incidents(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists admin_error_groups_status_last_idx
  on public.admin_error_groups (status, last_seen_at desc);
create index if not exists admin_error_groups_severity_last_idx
  on public.admin_error_groups (severity, last_seen_at desc);
create index if not exists admin_error_groups_source_idx
  on public.admin_error_groups (source, last_seen_at desc);

alter table public.admin_error_groups enable row level security;
revoke all on public.admin_error_groups from anon, authenticated;
grant select, insert, update, delete on public.admin_error_groups to service_role;

-- ── Incident lifecycle enrichment ────────────────────────────────────
-- Allow acknowledged (Phase 5) while keeping Phase 3 values.
do $$
declare
  con text;
begin
  select c.conname into con
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.admin_incidents'::regclass
    and c.contype = 'c'
    and a.attname = 'status'
  limit 1;
  if con is not null then
    execute format('alter table public.admin_incidents drop constraint %I', con);
  end if;
exception when undefined_table then
  null;
end $$;

alter table public.admin_incidents
  add constraint admin_incidents_status_check
  check (status in ('open', 'acknowledged', 'investigating', 'monitoring', 'resolved'));

alter table public.admin_incidents
  add column if not exists correlation_id text;

alter table public.admin_incidents
  add column if not exists acknowledged_at timestamptz;

alter table public.admin_incidents
  add column if not exists acknowledged_by uuid references public.profiles(id) on delete set null;

alter table public.admin_incidents
  add column if not exists resolution_note text;

alter table public.admin_incidents
  add column if not exists root_fingerprint text;

alter table public.admin_incidents
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

create index if not exists admin_incidents_correlation_idx
  on public.admin_incidents (correlation_id)
  where correlation_id is not null;

create index if not exists admin_incidents_fingerprint_idx
  on public.admin_incidents (root_fingerprint)
  where root_fingerprint is not null;

-- ── Cron execution history ───────────────────────────────────────────
create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  path text not null,
  status text not null
    check (status in ('started', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  error_code text,
  error_message text,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists cron_runs_job_started_idx
  on public.cron_runs (job_name, started_at desc);
create index if not exists cron_runs_status_started_idx
  on public.cron_runs (status, started_at desc);

alter table public.cron_runs enable row level security;
revoke all on public.cron_runs from anon, authenticated;
grant select, insert, update on public.cron_runs to service_role;

-- ── Security events (append-oriented) ────────────────────────────────
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  target_user_id uuid references public.profiles(id) on delete set null,
  resource_type text,
  resource_id text,
  correlation_id text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists security_events_time_idx
  on public.security_events (occurred_at desc);
create index if not exists security_events_name_time_idx
  on public.security_events (event_name, occurred_at desc);
create index if not exists security_events_actor_time_idx
  on public.security_events (actor_user_id, occurred_at desc)
  where actor_user_id is not null;

alter table public.security_events enable row level security;
revoke all on public.security_events from anon, authenticated;
grant select, insert on public.security_events to service_role;

comment on table public.admin_error_groups is
  'Deterministic grouped operational errors for Founder Error Center.';
comment on table public.cron_runs is
  'Cron execution history — configured schedule ≠ success without rows here.';
comment on table public.security_events is
  'Security-oriented events for Founder Security Center; sanitize metadata.';
