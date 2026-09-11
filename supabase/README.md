# Apply the SQL schema to your Supabase project before using the app with Supabase.

## Quick setup

```bash
npm run supabase:setup
```

This copies `supabase/schema.sql` to your clipboard and opens:
1. **SQL Editor** → paste → Run
2. **API Keys** → copy **secret** / **service_role** into `.env.local`

```bash
SUPABASE_SERVICE_ROLE_KEY=...   # or SUPABASE_SECRET_KEY=sb_secret_...
```

Then restart:

```bash
npm run supabase:setup
npm run dev
```

Health check: `GET /api/health/supabase` → `"ready": true`

## Schema updates

After the base schema, also run:

`supabase/migrations/20260910143000_global_slug_and_rls.sql`

This makes website slugs globally unique and tightens RLS (`WITH CHECK` + least privilege for `anon`).

## Env vars (Connect → Next.js)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_or_secret_key
```

## What gets stored

When the service/secret key is set:

- If `schema.sql` is applied → Postgres tables
- If tables are missing → Supabase Storage bucket `vitrin-data` (`app/store.json`) until you run the schema

Auth users always go to `auth.users` via the secret key.

## Optional: Cursor MCP

`.cursor/mcp.json` is configured for this project. Enable **Supabase** in
Cursor Settings → Tools & MCP and complete OAuth so the agent can apply SQL
for you next time.
