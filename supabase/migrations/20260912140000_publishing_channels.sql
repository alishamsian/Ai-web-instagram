-- Publishing channels, content items, media, publications (workspace-scoped)

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

create index if not exists publishing_channels_workspace_idx
  on publishing_channels (workspace_id, created_at desc);

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

create index if not exists content_items_workspace_idx
  on content_items (workspace_id, created_at desc);

create table if not exists content_media_assets (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content_items(id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  url text not null,
  thumbnail_url text,
  alt text,
  created_at timestamptz not null default now()
);

create index if not exists content_media_assets_content_idx
  on content_media_assets (content_id);

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

create index if not exists publications_content_idx
  on publications (content_id, created_at desc);
create index if not exists publications_workspace_idx
  on publications (workspace_id, created_at desc);

alter table publishing_channels enable row level security;
alter table content_items enable row level security;
alter table content_media_assets enable row level security;
alter table publications enable row level security;

drop policy if exists "publishing channels by owner" on publishing_channels;
create policy "publishing channels by owner" on publishing_channels
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

drop policy if exists "content items by owner" on content_items;
create policy "content items by owner" on content_items
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

drop policy if exists "content media by owner" on content_media_assets;
create policy "content media by owner" on content_media_assets
  for all
  to authenticated
  using (
    content_id in (
      select c.id from content_items c
      join workspaces w on w.id = c.workspace_id
      where w.owner_id = (select auth.uid())
    )
  )
  with check (
    content_id in (
      select c.id from content_items c
      join workspaces w on w.id = c.workspace_id
      where w.owner_id = (select auth.uid())
    )
  );

drop policy if exists "publications by owner" on publications;
create policy "publications by owner" on publications
  for all
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  )
  with check (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

grant select, insert, update, delete on table publishing_channels to authenticated;
grant select, insert, update, delete on table content_items to authenticated;
grant select, insert, update, delete on table content_media_assets to authenticated;
grant select, insert, update, delete on table publications to authenticated;
grant all on table publishing_channels to service_role;
grant all on table content_items to service_role;
grant all on table content_media_assets to service_role;
grant all on table publications to service_role;
