-- Phase 4 — AI + Infrastructure Intelligence
-- Additive only. Safe to re-run (IF NOT EXISTS).

-- Correlation id for AI request tracing (optional on legacy rows)
alter table public.ai_usage_logs
  add column if not exists correlation_id text;

create index if not exists ai_usage_logs_correlation_idx
  on public.ai_usage_logs (correlation_id)
  where correlation_id is not null;

create index if not exists ai_usage_logs_provider_time_idx
  on public.ai_usage_logs (provider, created_at desc);

create index if not exists ai_usage_logs_model_time_idx
  on public.ai_usage_logs (model, created_at desc);

-- Optional correlation on import jobs (does not break existing flows)
alter table public.import_jobs
  add column if not exists correlation_id text;

create index if not exists import_jobs_correlation_idx
  on public.import_jobs (correlation_id)
  where correlation_id is not null;

-- Investigating status for alert lifecycle (Phase 4)
do $$
declare
  con text;
begin
  select c.conname into con
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.alerts'::regclass
    and c.contype = 'c'
    and a.attname = 'status'
  limit 1;
  if con is not null then
    execute format('alter table public.alerts drop constraint %I', con);
  end if;
exception when undefined_table then
  null;
end $$;

alter table public.alerts
  add constraint alerts_status_check
  check (status in ('open', 'acknowledged', 'investigating', 'resolved'));

comment on column public.ai_usage_logs.correlation_id is
  'Optional request/correlation id for founder observability — never store secrets';
comment on column public.import_jobs.correlation_id is
  'Optional correlation id linking jobs to AI / system events';
