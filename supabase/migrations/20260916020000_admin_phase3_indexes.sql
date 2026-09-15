-- Phase 3 closure — indexes justified by admin list/search/aggregation queries.
-- Additive only. Does not rewrite prior migrations.

-- Profiles search / listing
create index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create index if not exists profiles_name_lower_idx
  on public.profiles (lower(name));

-- Workspaces listing / owner lookup (owner_id already indexed in base schema)
create index if not exists workspaces_created_active_idx
  on public.workspaces (created_at desc)
  where deleted_at is null;

create index if not exists workspaces_plan_active_idx
  on public.workspaces (plan)
  where deleted_at is null;

-- Websites status filters for admin metrics
create index if not exists websites_status_active_idx
  on public.websites (status, created_at desc)
  where deleted_at is null;

-- Import jobs admin queue / health
create index if not exists import_jobs_status_created_idx
  on public.import_jobs (status, created_at desc);

create index if not exists import_jobs_workspace_status_idx
  on public.import_jobs (workspace_id, status);

-- AI usage by user (User 360 / users list)
create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc);

-- Orders by workspace
create index if not exists store_orders_workspace_created_idx
  on public.store_orders (workspace_id, created_at desc);

-- Domains by website (admin website/domain views)
create index if not exists domains_website_idx
  on public.domains (website_id);

comment on index public.workspaces_created_active_idx is
  'Admin workspace list: created_at desc excluding soft-deleted';
comment on index public.import_jobs_status_created_idx is
  'Admin jobs queue and failed-job health scans';
comment on index public.ai_usage_logs_user_created_idx is
  'Admin User 360 / per-user AI usage';
