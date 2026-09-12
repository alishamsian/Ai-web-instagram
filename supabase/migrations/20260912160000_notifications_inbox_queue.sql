-- Operational inbox + scheduled publication index + onboarding metrics

create table if not exists workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null
    check (kind in (
      'order_new',
      'publish_failed',
      'publish_ok',
      'channel_disconnected',
      'schedule_due',
      'onboarding',
      'system'
    )),
  title text not null,
  body text,
  href text,
  tone text not null default 'neutral'
    check (tone in ('danger', 'warning', 'success', 'neutral', 'accent')),
  read_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_notifications_workspace_created_idx
  on workspace_notifications (workspace_id, created_at desc);

create index if not exists workspace_notifications_unread_idx
  on workspace_notifications (workspace_id, created_at desc)
  where read_at is null;

-- Only if publishing tables were already applied (20260912140000_*)
do $$
begin
  if to_regclass('public.publications') is not null then
    create index if not exists publications_due_idx
      on publications (scheduled_at)
      where status = 'scheduled';
  end if;
end $$;

alter table workspaces
  add column if not exists onboarding_metrics jsonb not null default '{}'::jsonb;

alter table workspace_notifications enable row level security;

drop policy if exists "workspace notifications by owner" on workspace_notifications;
create policy "workspace notifications by owner" on workspace_notifications
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

grant select, insert, update, delete on table workspace_notifications to authenticated;
grant all on table workspace_notifications to service_role;
