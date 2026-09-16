-- Vitrin schema for Supabase
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- Uses service role from the Next.js server (bypasses RLS for jobs).

create extension if not exists "pgcrypto";

-- App profile mirrored from auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plan text not null default 'free',
  -- Owner prefs: emailEnabled, telegramEnabled, telegramChatId, whatsappNotify
  notification_settings jsonb not null default '{}'::jsonb,
  onboarding_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspaces_owner_idx on workspaces(owner_id);

create table if not exists instagram_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_url text not null,
  username text not null,
  scrape_status text not null,
  collector text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, username)
);

create table if not exists websites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  import_id uuid references instagram_imports(id) on delete set null,
  slug text not null,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  version int not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create unique index if not exists websites_slug_global_uidx on websites(slug);

create table if not exists website_versions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  version int not null,
  config jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text not null,
  username text,
  status text not null,
  stage text not null,
  collector text not null default 'mock',
  scrape_status text,
  import_id uuid references instagram_imports(id) on delete set null,
  website_id uuid references websites(id) on delete set null,
  error_code text,
  error_message text,
  retry_count int not null default 0,
  posts_imported int not null default 0,
  posts_limit int,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_jobs_workspace_idx on import_jobs(workspace_id);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  original_url text not null,
  storage_key text not null unique,
  public_url text not null,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  host text not null unique,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  plan text not null,
  status text not null,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table instagram_imports enable row level security;
alter table websites enable row level security;
alter table website_versions enable row level security;
alter table import_jobs enable row level security;
alter table media_assets enable row level security;
alter table domains enable row level security;
alter table subscriptions enable row level security;

drop policy if exists "profiles are self" on profiles;
create policy "profiles are self" on profiles
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "workspaces are owned" on workspaces;
create policy "workspaces are owned" on workspaces
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "imports by workspace owner" on instagram_imports;
create policy "imports by workspace owner" on instagram_imports
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

drop policy if exists "websites by workspace owner" on websites;
create policy "websites by workspace owner" on websites
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

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

drop policy if exists "jobs by workspace owner" on import_jobs;
create policy "jobs by workspace owner" on import_jobs
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
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

-- Public published websites can be read by anon for /s/[slug]
drop policy if exists "published websites are public" on websites;
create policy "published websites are public" on websites
  for select
  to anon, authenticated
  using (status = 'published');

-- Least privilege: anon only SELECT on websites (RLS filters to published)
revoke all on all tables in schema public from anon;
grant usage on schema public to anon, authenticated, service_role;
grant select on table websites to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

-- Analytics / orders / waitlist (also in migrations/20260911220000_*)
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  path text not null default '/',
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists page_views_website_created_idx on page_views (website_id, created_at desc);

create table if not exists store_orders (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  channel text not null default 'manual',
  customer_note text,
  customer_contact text,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  locale text not null default 'fa',
  source text not null default 'pricing',
  created_at timestamptz not null default now()
);

alter table page_views enable row level security;
alter table store_orders enable row level security;
alter table waitlist enable row level security;
grant select on table page_views to authenticated;
grant select on table store_orders to authenticated;
grant all on table page_views, store_orders, waitlist to service_role;

-- Publishing channels / content / publications (see migrations/20260912140000_*)
create table if not exists publishing_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null check (type in ('website', 'telegram', 'instagram', 'whatsapp')),
  name text not null,
  identifier text,
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'error', 'coming_soon')),
  avatar text,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source text not null check (source in ('instagram', 'manual', 'generated')),
  type text not null check (type in ('post', 'reel', 'product', 'article', 'announcement')),
  title text,
  caption text,
  external_id text,
  ai_analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_media_assets (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content_items(id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  url text not null,
  thumbnail_url text,
  alt text,
  created_at timestamptz not null default now()
);

create table if not exists publications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_id uuid not null references content_items(id) on delete cascade,
  channel_id uuid not null references publishing_channels(id) on delete cascade,
  channel_type text not null,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  adapted_title text,
  adapted_caption text,
  scheduled_at timestamptz,
  published_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  href text,
  tone text not null default 'neutral',
  read_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Admin foundation tables: see supabase/migrations/20260915030000_admin_foundation.sql
