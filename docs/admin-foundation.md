# Admin Foundation (Phase 1)

Server-side control plane for the future Founder / Super Admin Console.
**No admin UI in Phase 1.**

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
  index.ts         # public barrel

lib/config/plans.ts  # stable facade → entitlements (backward compatible)
```

Database migration:

`supabase/migrations/20260915030000_admin_foundation.sql`

All new tables enable RLS and **revoke** `anon` / `authenticated`.
Access is via **service_role** from Next.js server only.

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

## AI telemetry

```ts
await recordAiUsage({ feature: "import_analyze", status: "started", workspaceId });
await recordAiUsage({ feature: "import_analyze", status: "completed", inputTokens, outputTokens, workspaceId });
```

Do not store secrets or raw prompts unless a future privacy review allows it.

## Jobs

Existing `import_jobs` statuses remain valid.
Helpers map legacy stages → observability vocabulary (`running` / terminal states).
New columns: `job_type`, `max_attempts`, `duration_ms`, `metadata`.

## Soft delete

Only `websites` and `workspaces` receive `deleted_at` / `deleted_by` / `deletion_reason`.
Other entities stay hard-delete unless a later phase justifies recovery.

## Alerts & metrics

Foundation only — no UI, no cron evaluator yet.

- `alert_rules` / `alerts`
- `daily_metrics` (+ `extras` jsonb for future keys)

## Security rules

1. Never expose service role keys to the browser.
2. Never query admin tables from client Supabase.
3. Every privileged mutation: `requireAdminPermission` → action → `writeAdminAuditLog`.
4. Ordinary workspace owners are **not** admins.
5. Audit logs are append-only from application code.

## Applying the migration

```bash
# Supabase CLI or SQL editor
supabase db push
# or run the migration SQL in the dashboard
```

## Next step (Phase 2)

Build the **Admin Console UI** on top of these services — read-only dashboards first, then gated mutations with audit logging.
