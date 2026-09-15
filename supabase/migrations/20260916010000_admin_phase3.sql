-- Phase 3 — Business + Product Intelligence support tables
-- Privileged: revoke anon/authenticated; service_role only.

-- Support notes (admin CRM-lite)
create table if not exists public.admin_support_notes (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists admin_support_notes_user_idx
  on public.admin_support_notes (target_user_id, created_at desc);
create index if not exists admin_support_notes_workspace_idx
  on public.admin_support_notes (workspace_id, created_at desc);

alter table public.admin_support_notes enable row level security;
revoke all on public.admin_support_notes from anon, authenticated;
grant select, insert, update, delete on public.admin_support_notes to service_role;

-- Lightweight incident management
create table if not exists public.admin_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'investigating', 'monitoring', 'resolved')),
  affected_system text,
  summary text,
  owner_user_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  timeline jsonb not null default '[]'::jsonb,
  linked_alert_ids jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_incidents_status_idx
  on public.admin_incidents (status, started_at desc);
create index if not exists admin_incidents_severity_idx
  on public.admin_incidents (severity, started_at desc);

alter table public.admin_incidents enable row level security;
revoke all on public.admin_incidents from anon, authenticated;
grant select, insert, update, delete on public.admin_incidents to service_role;

-- Prompt registry (metadata only — no raw prompt bodies by default)
create table if not exists public.ai_prompt_registry (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  version text not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (feature, version)
);

alter table public.ai_prompt_registry enable row level security;
revoke all on public.ai_prompt_registry from anon, authenticated;
grant select, insert, update, delete on public.ai_prompt_registry to service_role;

insert into public.ai_prompt_registry (feature, version, status, notes)
values
  ('import_analyze', 'import_analyze.v1', 'active', 'Instagram import analysis prompt'),
  ('business_intelligence', 'business_intelligence.v1', 'active', 'BI schema version label'),
  ('website_config', 'website_config.v1', 'active', 'Renderer/schema label')
on conflict (feature, version) do nothing;

comment on table public.admin_support_notes is
  'Admin CRM notes — service_role only; never expose to workspace clients.';
comment on table public.admin_incidents is
  'Lightweight internal incident tracker for Founder Console.';
comment on table public.ai_prompt_registry is
  'Prompt/version catalog metadata without storing raw prompt text.';
