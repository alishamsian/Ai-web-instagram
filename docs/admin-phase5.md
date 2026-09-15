# Admin Phase 5 — Operations + Security Control Plane

Phase 5 turns the Founder Console into a real **Operations & Security** plane.
It reuses Phase 1–4 RBAC, MetricResult honesty, audit logging, and the
lightweight Founder Dashboard — it does **not** invent metrics.

## Architecture

```text
Admin UI
  → requireAdminPage / requireAdminPermission
  → lib/admin/phase5-queries.ts | phase5-actions.ts
  → lib/admin/observability.ts (system/security/cron recorders)
  → Supabase service-role client
```

| Module | Role |
|--------|------|
| `lib/admin/ops-thresholds.ts` | Central stale/retry thresholds |
| `lib/admin/observability.ts` | Failures, cron runs, security events, fingerprints |
| `lib/admin/phase5-contracts.ts` | Typed contracts |
| `lib/admin/phase5-queries.ts` | Error groups, security, audit, cron summaries |
| `lib/admin/phase5-actions.ts` | Incident transitions, error resolve, job cancel |

## Database

Migration: `supabase/migrations/20260916050000_admin_phase5.sql`

| Table / change | Purpose |
|----------------|---------|
| `admin_error_groups` | Deterministic grouped errors |
| `cron_runs` | Cron execution history |
| `security_events` | Security-oriented events |
| `system_events` + correlation/fingerprint columns | Trace enrichment |
| `admin_incidents` + `acknowledged`, correlation, resolution | Lifecycle |

All Phase 5 tables: RLS on, `anon`/`authenticated` revoked, `service_role` only.

## Telemetry honesty

| Surface | Behavior |
|---------|----------|
| Webhooks | **Unavailable** — no delivery instrumentation in-repo |
| Cron | Configured schedule from `vercel.json` + history from `cron_runs` when present |
| Dependencies | `configured` ≠ `healthy`; unknown when not probeable |
| Error groups | From `admin_error_groups` / unavailable if migration missing |
| Security events | From `security_events` / unavailable if migration missing |

## Incident lifecycle

```text
open → acknowledged → investigating → (monitoring) → resolved
reopen → open
```

Mutations require `system.manage` and write `admin_audit_logs`.

Auto-incident: only for **critical** fingerprints with **≥5** occurrences
(`openIncidentIfCritical`). Single-user blips stay as error groups only.

## Retry / cancel

| Action | Permission | Safety |
|--------|------------|--------|
| Retry failed job | `jobs.retry` | Conditional update on `failed` + max attempts |
| Cancel queued/retrying | `jobs.cancel` | Only `queued`/`retrying`; never invents cancel for arbitrary running scrapes |

Non-retryable codes (centralized): `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION`, …

## Security model

- Deny-by-default RBAC unchanged
- ANALYST cannot mutate ops/security
- Sensitive permission matrix surfaced on `/admin/security`
- Security events sanitize secret-like metadata keys
- No `service_role` / provider secrets in client bundles

## Founder Dashboard

Still bounded:

```text
KPI lite + system strip + Phase 5 head-count signals
```

Heavy analytics stay on dedicated pages.

## Manual production steps

1. Apply `20260916050000_admin_phase5.sql` in Supabase SQL Editor for project `miutizhpylflhahfrucj`.
2. Confirm tables: `admin_error_groups`, `cron_runs`, `security_events`.
3. Confirm RLS + revoke for `anon`/`authenticated`.
4. Optionally enable **Leaked Password Protection** in Supabase Auth dashboard (manual Auth setting — not togglable safely from this repo alone).

## Known limitations

1. No inbound webhook delivery table → Webhooks page stays Unavailable.
2. Cron history only appears after workers write `cron_runs` (instrumented on `/api/jobs/process` and `/api/publishing/process-due`).
3. Job cancel does not stop an already-running scrape mid-flight (no cooperative cancel signal).
4. Security events require call sites; coverage grows as more privileged paths emit events.
5. Supabase Auth leaked-password protection may require Dashboard toggle.

## Verification checklist

- `npm test` / `typecheck` / `lint` / `build`
- GitHub CI green
- Migration applied + REST probes
- Vercel deploy for HEAD
- Authenticated browser QA when session available
