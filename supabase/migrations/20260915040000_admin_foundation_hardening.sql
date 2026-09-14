-- Phase 1.5 — Admin Foundation hardening indexes
-- Supports dashboard date-range scans without full-table reads.

create index if not exists ai_usage_logs_created_idx
  on public.ai_usage_logs (created_at desc);

create index if not exists product_events_occurred_idx
  on public.product_events (occurred_at desc);

create index if not exists system_events_occurred_idx
  on public.system_events (occurred_at desc);

create index if not exists websites_created_active_idx
  on public.websites (created_at desc)
  where deleted_at is null;

create index if not exists websites_published_active_idx
  on public.websites (published_at desc)
  where deleted_at is null and status = 'published';

create index if not exists websites_workspace_active_idx
  on public.websites (workspace_id, updated_at desc)
  where deleted_at is null;

create index if not exists workspaces_owner_active_idx
  on public.workspaces (owner_id, created_at)
  where deleted_at is null;

create index if not exists store_orders_created_idx
  on public.store_orders (created_at desc);

create index if not exists profiles_created_idx
  on public.profiles (created_at desc);

comment on index public.ai_usage_logs_created_idx is
  'Admin dashboard AI usage range scans';
comment on index public.websites_workspace_active_idx is
  'Product workspace website lists exclude soft-deleted rows';
