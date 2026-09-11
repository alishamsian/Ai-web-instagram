-- Analytics, store orders, waitlist, and domain lookup helpers
-- Apply after base schema.

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  path text not null default '/',
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_website_created_idx
  on page_views (website_id, created_at desc);

create table if not exists store_orders (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  channel text not null default 'manual',
  customer_note text,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists store_orders_website_idx on store_orders (website_id, created_at desc);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null default 'fa',
  source text not null default 'pricing',
  created_at timestamptz not null default now(),
  unique (email)
);

alter table page_views enable row level security;
alter table store_orders enable row level security;
alter table waitlist enable row level security;

-- Owners can read analytics/orders for their sites
drop policy if exists "page views by owner" on page_views;
create policy "page views by owner" on page_views
  for select
  to authenticated
  using (
    website_id in (
      select w.id from websites w
      join workspaces ws on ws.id = w.workspace_id
      where ws.owner_id = (select auth.uid())
    )
  );

drop policy if exists "store orders by owner" on store_orders;
create policy "store orders by owner" on store_orders
  for select
  to authenticated
  using (
    workspace_id in (select id from workspaces where owner_id = (select auth.uid()))
  );

-- Service role inserts page_views / orders / waitlist from Next.js APIs
grant select on table page_views to authenticated;
grant select on table store_orders to authenticated;
grant all on table page_views to service_role;
grant all on table store_orders to service_role;
grant all on table waitlist to service_role;
