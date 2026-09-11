-- Harden Vitrin schema: global slugs + stricter RLS
-- Apply in Supabase SQL Editor after the base schema.

-- 1) Globally unique website slugs (public /s/[slug] and subdomains)
alter table websites drop constraint if exists websites_workspace_id_slug_key;
drop index if exists websites_workspace_id_slug_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'websites_slug_key'
  ) then
    begin
      alter table websites add constraint websites_slug_key unique (slug);
    exception when unique_violation then
      raise notice 'Duplicate slugs exist — resolve manually before adding unique(slug)';
    end;
  end if;
end $$;

create unique index if not exists websites_slug_global_uidx on websites (slug);

-- 2) Tighten policies with WITH CHECK
drop policy if exists "website versions by owner" on website_versions;
create policy "website versions by owner" on website_versions
  for all
  to authenticated
  using (
    website_id in (
      select w.id from websites w
      join workspaces ws on ws.id = w.workspace_id
      where ws.owner_id = (select auth.uid())
    )
  )
  with check (
    website_id in (
      select w.id from websites w
      join workspaces ws on ws.id = w.workspace_id
      where ws.owner_id = (select auth.uid())
    )
  );

drop policy if exists "media by workspace owner" on media_assets;
create policy "media by workspace owner" on media_assets
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

drop policy if exists "domains by website owner" on domains;
create policy "domains by website owner" on domains
  for all
  to authenticated
  using (
    website_id in (
      select w.id from websites w
      join workspaces ws on ws.id = w.workspace_id
      where ws.owner_id = (select auth.uid())
    )
  )
  with check (
    website_id in (
      select w.id from websites w
      join workspaces ws on ws.id = w.workspace_id
      where ws.owner_id = (select auth.uid())
    )
  );

drop policy if exists "subscriptions by workspace owner" on subscriptions;
create policy "subscriptions by workspace owner" on subscriptions
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

-- 3) Least privilege for anon: only published websites (via RLS)
revoke all on all tables in schema public from anon;
grant select on table websites to anon;
grant usage on schema public to anon, authenticated, service_role;

-- authenticated keeps DML; RLS still filters rows
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
