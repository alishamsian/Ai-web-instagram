# Admin Foundation (Phase 1 + 1.5)

Server-side control plane for the future Founder / Super Admin Console.
**No admin UI in Phase 1 / 1.5.** Phase 1.5 hardens query contracts for Phase 2.

## Architecture

```
lib/admin/
  permissions.ts   # RBAC matrix (deny-by-default)
  rbac.ts          # requireAdminPermission()
  audit.ts         # append-only admin_audit_logs
  events.ts        # product_events + system_events
  usage.ts         # usage_events + usage_counters
  entitlements.ts  # Free / Pro / Business capabilities
  ai-telemetry.ts  # ai_usage_logs
  jobs.ts          # job observability helpers
  soft-delete.ts   # websites / workspaces recovery metadata
  alerts.ts        # alert_rules + alerts foundation
  metrics.ts       # daily_metrics aggregation
  dates.ts         # centralized date ranges + comparison periods
  contracts.ts     # typed MetricResult / Dashboard KPIs
  queries.ts       # authorized server-only getAdmin* layer
  index.ts         # public barrel

lib/config/plans.ts  # stable facade → entitlements (backward compatible)
```

Database migrations:

- `supabase/migrations/20260915030000_admin_foundation.sql` — Phase 1 tables
- `supabase/migrations/20260915040000_admin_foundation_hardening.sql` — Phase 1.5 indexes

All privileged tables enable RLS and **revoke** `anon` / `authenticated`.
Access is via **service_role** from Next.js server only.

## Admin query architecture (Phase 1.5)

Admin UI **must never** query privileged tables from the browser.

```
Browser Admin UI
  → Server Action / Route Handler
    → requireAdminPermission(userId, permission)
    → lib/admin/queries.ts getAdmin*()
      → service_role Supabase reads / aggregations
```

Authorized query helpers:

| Function | Permission |
|----------|------------|
| `getAdminDashboardMetrics` | `system.read` |
| `getAdminUsers` | `users.read` |
| `getAdminWorkspaces` | `workspaces.read` |
| `getAdminWebsites` | `websites.read` |
| `getAdminImports` | `imports.read` |
| `getAdminJobs` | `jobs.read` |
| `getAdminRevenue` | `billing.read` |
| `getAdminOrders` | `orders.read` |
| `getAdminAIUsage` | `ai.read` |
| `getAdminSystemHealth` | `system.read` |
| `getAdminAlerts` | `system.read` |
| `getAdminActivity` | `audit.read` |

Authorization flow (every privileged query):

1. Identify authenticated user id (session — never trust body role)
2. Load `admin_profiles` (or test memory)
3. Require `is_active`
4. Check `roleHasPermission(role, permission)` — deny by default
5. Execute server aggregation

Never trust: client role, client permission, `user_metadata`, arbitrary request fields.

## Metric contracts

Typed via `lib/admin/contracts.ts`:

- `MetricResult<T>` — `available` | `unavailable` | `partial`
- `ComparableMetric` — current + previous + `deltaRatio`
- `DashboardKpis`, `RevenueMetrics`, `UserMetrics`, `WebsiteMetrics`,
  `ImportMetrics`, `AIMetrics`, `SystemHealthMetrics`, `ActivityItem`, `AlertSummary`

**No fake numbers.** If a KPI cannot be calculated accurately, return
`{ status: "unavailable", reason }`.

### Dashboard data sources

| KPI | Primary source | Fallback | Notes |
|-----|----------------|----------|-------|
| New users | `daily_metrics.new_users` | `profiles.created_at` count | Prefer daily rollup |
| Active users | — | unavailable | Needs session/activity events |
| Websites created | `daily_metrics.websites_created` | `websites` where `deleted_at is null` | Soft-delete aware |
| Websites published | `daily_metrics.websites_published` | event aggregation | |
| Imports / success / fail | `daily_metrics.*` | `import_jobs` / events | |
| AI requests / cost | `daily_metrics` + `ai_usage_logs` | live log aggregation | |
| Orders | `daily_metrics.orders` | `store_orders.created_at` | Count only |
| MRR | unavailable | — | No Stripe / unused subscriptions |
| Revenue | unavailable | — | `store_orders` has no amount column |
| Page views | `daily_metrics.page_views` | `page_views` | |

`daily_metrics` is sufficient for initial Dashboard rollups.
Event / log tables are used when live detail or when rollups are empty for
entity counts that exist on product tables.

## Date range behavior

Use `resolveDateRange` / `resolveComparisonPeriod` from `lib/admin/dates.ts`.

Presets: `today`, `7d`, `30d`, `90d`, `6m`, `12m`, `custom`.

- Calculations are **UTC** (`start` inclusive, `end` exclusive).
- `timezone` is carried for display only.
- Comparison period = equal duration immediately before current.

Do not scatter period math across React components.

## Roles

| Role | Intent |
|------|--------|
| OWNER | Full platform control including `database.write` |
| SUPER_ADMIN | Full control except `database.write` |
| OPERATIONS | Ops: jobs, imports, websites, support |
| SUPPORT | Read + restore/retry; no billing refunds |
| ANALYST | Read-only analytics / audit |

## Permissions

See `ADMIN_PERMISSIONS` in `lib/admin/permissions.ts`.
Missing permission = **denied**.

Destructive permissions (must be explicit):

- `users.suspend`
- `billing.refund`
- `jobs.cancel`
- `database.write`
- `websites.restore`
- `feature_flags.write`
- `settings.write`

## Events

Use `recordProductEvent()` / `recordSystemEvent()` — do not scatter raw inserts.

Metadata is sanitized (blocks `password`, `token`, `api_key`, …).

## Usage & entitlements

```ts
import { planLimits, getWorkspaceEntitlements, canUseFeature } from "@/lib/config/plans";
import { recordUsageEvent, getUsageCounter } from "@/lib/admin";

const limits = planLimits(workspace.plan); // existing callers unchanged
const remaining = getRemainingUsage({
  plan: workspace.plan,
  feature: "max_ai_generations",
  used: await getUsageCounter({ workspaceId, feature: "ai_generations" }),
});
```

Plans: `free` | `pro` | `business`.  
`isProPlan()` is true for **pro and business** (paid tiers).
Session / store mapping uses `normalizePlanId` so Business is not collapsed to Free.

## AI telemetry

Emitted from the real import analysis path (`lib/jobs/import-job.ts`):

```ts
await recordAiUsage({
  feature: "import_analyze",
  status: "started" | "completed" | "failed",
  workspaceId,
  userId,
  provider,
  model,
  promptVersion: "import_analyze.v1",
  schemaVersion: "business_intelligence.v1",
  rendererVersion: "website_config.v1",
  latencyMs,
});
```

Do not store secrets or raw prompts unless a future privacy review allows it.
Token/cost fields are recorded when the provider returns them; otherwise left null.

## Jobs

Existing `import_jobs` statuses remain valid.
Helpers map legacy stages → observability vocabulary (`running` / terminal states).
Columns: `job_type`, `max_attempts`, `duration_ms`, `metadata`, plus status/stage/error/retry.

## Soft delete

Only `websites` and `workspaces` receive `deleted_at` / `deleted_by` / `deletion_reason`.

Product queries (`lib/database/queries.ts`, dashboard data, session workspace load,
`readTableStore`) **exclude** soft-deleted rows by default.

Admin recovery: `getAdminWebsites({ includeDeleted: true })` /
`getAdminWorkspaces({ includeDeleted: true })`.

## Alerts & metrics

Foundation only — no UI, no cron evaluator yet.

- `alert_rules` / `alerts`
- `daily_metrics` (+ `extras` jsonb for future keys)

## Audit

Use `writeAdminAuditLog` for privileged mutations:

- actor (user id + role)
- action / resource / resource_id
- before / after / reason / timestamp

Clients cannot mutate audit rows (RLS revoke + append-only app path).

## Security rules

1. Never expose service role keys to the browser.
2. Never query admin tables from client Supabase.
3. Every privileged mutation: `requireAdminPermission` → action → `writeAdminAuditLog`.
4. Ordinary workspace owners are **not** admins.
5. Audit logs are append-only from application code.

## Performance

Phase 1.5 adds indexes for common Admin / product patterns:

- `ai_usage_logs(created_at)`
- `product_events(occurred_at)` / `system_events(occurred_at)`
- active website lists by workspace / created / published
- active workspace by owner
- `store_orders(created_at)` / `profiles(created_at)`

Dashboard KPIs aggregate server-side — do not fetch thousands of rows into React.

## Applying the migrations

```bash
supabase db push
# or run the migration SQL in the dashboard
```

## Next step (Phase 2+)

Phase 2 UI lives at `/{locale}/admin/*` and consumes `lib/admin/queries.ts`.
Do not invent client-side metrics; consume `MetricResult` contracts.
