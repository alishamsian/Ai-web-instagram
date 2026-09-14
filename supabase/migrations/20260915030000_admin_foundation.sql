-- Admin Foundation (Phase 1)
-- Privileged platform tables: deny-by-default for anon/authenticated.
-- Application access is via service_role only (Next.js server).

-- ── Admin staff profiles ─────────────────────────────────────────────
create table if not exists public.admin_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in (
    'OWNER', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'ANALYST'
  )),
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_profiles_role_idx
  on public.admin_profiles (role)
  where is_active = true;

-- ── Append-only audit log ────────────────────────────────────────────
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  resource_type text not null,
  resource_id text,
  workspace_id uuid references public.workspaces(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  ip_address text,
  user_agent text,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs (actor_user_id, created_at desc);
create index if not exists admin_audit_logs_action_idx
  on public.admin_audit_logs (action, created_at desc);
create index if not exists admin_audit_logs_resource_idx
  on public.admin_audit_logs (resource_type, resource_id);

-- Prevent UPDATE/DELETE from authenticated clients (service_role bypasses RLS).
alter table public.admin_audit_logs enable row level security;
alter table public.admin_profiles enable row level security;

revoke all on public.admin_audit_logs from anon, authenticated;
revoke all on public.admin_profiles from anon, authenticated;
grant select, insert, update, delete on public.admin_profiles to service_role;
grant select, insert on public.admin_audit_logs to service_role;
-- No UPDATE/DELETE grant for audit logs even to common roles; service_role still bypasses.

-- ── Product / usage / system events ──────────────────────────────────
create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references public.profiles(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists product_events_name_time_idx
  on public.product_events (event_name, occurred_at desc);
create index if not exists product_events_workspace_time_idx
  on public.product_events (workspace_id, occurred_at desc);
create index if not exists product_events_user_time_idx
  on public.product_events (user_id, occurred_at desc);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  quantity numeric not null default 1,
  user_id uuid references public.profiles(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  plan text,
  period_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists usage_events_workspace_feature_idx
  on public.usage_events (workspace_id, feature, occurred_at desc);
create index if not exists usage_events_period_idx
  on public.usage_events (period_key, feature);

-- Fast period counters (upserted by application)
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  feature text not null,
  period_key text not null,
  quantity numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (workspace_id, feature, period_key)
);

create index if not exists usage_counters_workspace_period_idx
  on public.usage_counters (workspace_id, period_key);

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  source text,
  error_code text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists system_events_severity_time_idx
  on public.system_events (severity, occurred_at desc);
create index if not exists system_events_name_time_idx
  on public.system_events (event_name, occurred_at desc);

alter table public.product_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.usage_counters enable row level security;
alter table public.system_events enable row level security;

revoke all on public.product_events from anon, authenticated;
revoke all on public.usage_events from anon, authenticated;
revoke all on public.usage_counters from anon, authenticated;
revoke all on public.system_events from anon, authenticated;

grant select, insert on public.product_events to service_role;
grant select, insert on public.usage_events to service_role;
grant select, insert, update on public.usage_counters to service_role;
grant select, insert on public.system_events to service_role;

-- ── AI telemetry ─────────────────────────────────────────────────────
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  feature text not null,
  provider text,
  model text,
  prompt_version text,
  renderer_version text,
  schema_version text,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  latency_ms integer,
  estimated_cost numeric,
  status text not null check (status in ('started', 'completed', 'failed')),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_workspace_time_idx
  on public.ai_usage_logs (workspace_id, created_at desc);
create index if not exists ai_usage_logs_status_time_idx
  on public.ai_usage_logs (status, created_at desc);
create index if not exists ai_usage_logs_feature_time_idx
  on public.ai_usage_logs (feature, created_at desc);

alter table public.ai_usage_logs enable row level security;
revoke all on public.ai_usage_logs from anon, authenticated;
grant select, insert, update on public.ai_usage_logs to service_role;

-- ── Historical metrics ───────────────────────────────────────────────
create table if not exists public.daily_metrics (
  date date primary key,
  new_users integer not null default 0,
  active_users integer not null default 0,
  new_workspaces integer not null default 0,
  websites_created integer not null default 0,
  websites_published integer not null default 0,
  imports integer not null default 0,
  successful_imports integer not null default 0,
  failed_imports integer not null default 0,
  ai_requests integer not null default 0,
  ai_cost numeric not null default 0,
  orders integer not null default 0,
  revenue numeric not null default 0,
  subscriptions_started integer not null default 0,
  subscriptions_canceled integer not null default 0,
  page_views integer not null default 0,
  extras jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.daily_metrics enable row level security;
revoke all on public.daily_metrics from anon, authenticated;
grant select, insert, update on public.daily_metrics to service_role;

-- ── Alerts foundation ────────────────────────────────────────────────
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  metric text not null,
  operator text not null check (operator in ('gt', 'gte', 'lt', 'lte', 'eq')),
  threshold numeric not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  enabled boolean not null default true,
  channels jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.alert_rules(id) on delete set null,
  metric text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  value numeric,
  threshold numeric,
  message text,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists alerts_status_time_idx
  on public.alerts (status, created_at desc);
create index if not exists alerts_severity_time_idx
  on public.alerts (severity, created_at desc);

alter table public.alert_rules enable row level security;
alter table public.alerts enable row level security;
revoke all on public.alert_rules from anon, authenticated;
revoke all on public.alerts from anon, authenticated;
grant select, insert, update, delete on public.alert_rules to service_role;
grant select, insert, update on public.alerts to service_role;

-- ── Job observability extensions ─────────────────────────────────────
alter table public.import_jobs
  add column if not exists job_type text not null default 'instagram_import',
  add column if not exists max_attempts integer not null default 3,
  add column if not exists duration_ms integer,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists import_jobs_status_updated_idx
  on public.import_jobs (status, updated_at desc);
create index if not exists import_jobs_type_status_idx
  on public.import_jobs (job_type, status);

-- ── Soft-delete primitives (high-value entities only) ────────────────
alter table public.websites
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null,
  add column if not exists deletion_reason text;

alter table public.workspaces
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null,
  add column if not exists deletion_reason text;

create index if not exists websites_deleted_at_idx
  on public.websites (deleted_at)
  where deleted_at is not null;
create index if not exists workspaces_deleted_at_idx
  on public.workspaces (deleted_at)
  where deleted_at is not null;

comment on table public.admin_profiles is
  'Platform staff roles. Never grant to workspace owners by default.';
comment on table public.admin_audit_logs is
  'Append-only admin audit trail. Application code must only INSERT.';
comment on table public.product_events is
  'Normalized product analytics events (server-side recording only).';
comment on table public.usage_events is
  'Metered usage events attributable to workspace/feature/period.';
comment on table public.ai_usage_logs is
  'AI generation telemetry — no secrets, minimize PII in metadata.';
