-- Phase 7 — Monetization / billing (additive, backward compatible).
-- Extends existing public.subscriptions; adds billing_customers, billing_events,
-- billing_transactions, entitlement_overrides, user_sessions.
-- Sensitive tables: RLS on; anon denied; authenticated SELECT own workspace only;
-- mutations via service_role (Next.js server).

-- ── billing_customers ────────────────────────────────────────────────
create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null default 'stripe'
    check (provider in ('stripe')),
  provider_customer_id text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_customer_id),
  unique (workspace_id, provider)
);

create index if not exists billing_customers_workspace_idx
  on public.billing_customers (workspace_id);

-- ── extend subscriptions (existing skeleton) ─────────────────────────
alter table public.subscriptions
  add column if not exists provider text not null default 'stripe',
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_price_id text,
  add column if not exists billing_interval text
    check (billing_interval is null or billing_interval in ('month', 'year', 'week', 'day')),
  add column if not exists quantity integer not null default 1,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz,
  add column if not exists trial_start timestamptz,
  add column if not exists trial_end timestamptz,
  add column if not exists unit_amount_cents integer,
  add column if not exists currency text,
  add column if not exists updated_at timestamptz not null default now();

-- Normalize status / plan defaults already exist on subscriptions.
comment on column public.subscriptions.unit_amount_cents is
  'Recurring unit amount in smallest currency unit from Stripe price; null if unknown';

create unique index if not exists subscriptions_provider_subscription_uidx
  on public.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists subscriptions_workspace_idx
  on public.subscriptions (workspace_id);

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

create index if not exists subscriptions_period_end_idx
  on public.subscriptions (current_period_end desc)
  where current_period_end is not null;

-- At most one "live" subscription per workspace (active/trialing/past_due/unpaid/paused)
create unique index if not exists subscriptions_one_live_per_workspace_uidx
  on public.subscriptions (workspace_id)
  where status in ('active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete');

-- ── billing_events (webhook idempotency) ─────────────────────────────
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text not null,
  event_type text not null,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'ignored', 'failed')),
  workspace_id uuid references public.workspaces(id) on delete set null,
  correlation_id text,
  payload_safe jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_message_safe text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_events_type_created_idx
  on public.billing_events (event_type, created_at desc);

create index if not exists billing_events_status_idx
  on public.billing_events (status)
  where status in ('received', 'processing', 'failed');

create index if not exists billing_events_workspace_idx
  on public.billing_events (workspace_id, created_at desc)
  where workspace_id is not null;

-- ── billing_transactions (invoices / charges / refunds) ──────────────
create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  provider text not null default 'stripe',
  provider_transaction_id text not null,
  provider_invoice_id text,
  provider_charge_id text,
  provider_subscription_id text,
  transaction_type text not null
    check (transaction_type in (
      'invoice_payment', 'charge', 'refund', 'credit', 'adjustment'
    )),
  status text not null
    check (status in (
      'pending', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded'
    )),
  amount_cents integer not null,
  currency text not null,
  refunded_amount_cents integer not null default 0,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata_safe jsonb not null default '{}'::jsonb,
  unique (provider, provider_transaction_id)
);

create index if not exists billing_transactions_workspace_occurred_idx
  on public.billing_transactions (workspace_id, occurred_at desc)
  where workspace_id is not null;

create index if not exists billing_transactions_type_occurred_idx
  on public.billing_transactions (transaction_type, occurred_at desc);

create index if not exists billing_transactions_currency_idx
  on public.billing_transactions (currency, occurred_at desc);

-- ── entitlement_overrides (audited, expiring) ────────────────────────
create table if not exists public.entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan text not null check (plan in ('free', 'pro', 'business')),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  previous_plan text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entitlement_overrides_workspace_active_idx
  on public.entitlement_overrides (workspace_id, created_at desc)
  where revoked_at is null;

-- ── user_sessions (privacy-conscious session telemetry) ──────────────
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  session_key text not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists user_sessions_key_uidx
  on public.user_sessions (session_key);

create index if not exists user_sessions_user_started_idx
  on public.user_sessions (user_id, started_at desc);

create index if not exists user_sessions_last_seen_idx
  on public.user_sessions (last_seen_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.billing_customers enable row level security;
alter table public.billing_events enable row level security;
alter table public.billing_transactions enable row level security;
alter table public.entitlement_overrides enable row level security;
alter table public.user_sessions enable row level security;
alter table public.subscriptions enable row level security;

-- Deny anon entirely on sensitive billing tables
revoke all on public.billing_customers from anon, authenticated;
revoke all on public.billing_events from anon, authenticated;
revoke all on public.billing_transactions from anon, authenticated;
revoke all on public.entitlement_overrides from anon, authenticated;
revoke all on public.user_sessions from anon, authenticated;

grant select, insert, update, delete on public.billing_customers to service_role;
grant select, insert, update, delete on public.billing_events to service_role;
grant select, insert, update, delete on public.billing_transactions to service_role;
grant select, insert, update, delete on public.entitlement_overrides to service_role;
grant select, insert, update, delete on public.user_sessions to service_role;
grant select, insert, update, delete on public.subscriptions to service_role;

-- Authenticated may SELECT own workspace billing (no writes)
grant select on public.billing_customers to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.billing_transactions to authenticated;
-- billing_events / overrides / sessions: service_role only (no grant to authenticated)

drop policy if exists "billing_customers select own" on public.billing_customers;
create policy "billing_customers select own"
  on public.billing_customers
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

drop policy if exists "subscriptions by workspace owner" on public.subscriptions;
create policy "subscriptions by workspace owner"
  on public.subscriptions
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

drop policy if exists "billing_transactions select own" on public.billing_transactions;
create policy "billing_transactions select own"
  on public.billing_transactions
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

-- No policies for billing_events / entitlement_overrides / user_sessions for
-- authenticated/anon → default deny under RLS.

comment on table public.billing_customers is
  'Phase 7: Stripe customer mapping per workspace';
comment on table public.billing_events is
  'Phase 7: idempotent Stripe webhook ledger (sanitized payloads only)';
comment on table public.billing_transactions is
  'Phase 7: invoice/charge/refund amounts from provider — never invent';
comment on table public.entitlement_overrides is
  'Phase 7: audited temporary plan overrides';
comment on table public.user_sessions is
  'Phase 7: privacy-conscious session starts for DAU/WAU/MAU';
