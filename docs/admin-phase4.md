# Admin Phase 4 — AI + Infrastructure Intelligence

Phase 4 extends the Founder Console with AI telemetry intelligence and an
honest infrastructure control plane. It reuses Phase 1–3 RBAC, audit, MetricResult,
and Vitrin admin UI — it does **not** invent metrics.

## Architecture

```text
Admin UI (server pages)
  → requireAdminPage / requireAdminPermission
  → lib/admin/phase4-queries.ts | phase4-actions.ts
  → Supabase service-role client
```

Supporting modules:

| Module | Role |
|--------|------|
| `lib/admin/phase4-contracts.ts` | Typed contracts (AIOverview, JobHealth, …) |
| `lib/admin/phase4-anomalies.ts` | Deterministic anomaly rules |
| `lib/admin/ai-pricing.ts` | Verified pricing adapter only |
| `lib/admin/phase4-queries.ts` | Aggregation, explorer, infra |
| `lib/admin/phase4-actions.ts` | Prompt registry + alert rule mutations |

## Data sources

| Domain | Source | Notes |
|--------|--------|-------|
| AI requests | `ai_usage_logs` | Sample capped (5k). `started`/`completed`/`failed` are separate rows today. |
| Tokens | `input_tokens` / `output_tokens` / `total_tokens` | Often null — production import path does not yet parse provider usage. |
| Cost | `estimated_cost` **or** `AI_PRICING_JSON` | Never invents list prices from memory. |
| Jobs / queue | `import_jobs` | Only real durable queue in-repo. |
| Alerts | `alerts` / `alert_rules` | Evaluator helper + duplicate suppression; no auto-destructive actions. |
| Cron | Configured API paths | **Configured schedule** ≠ successful execution. |
| Webhooks | — | No delivery telemetry table → explicit Unavailable. |

## MetricResult extensions (Phase 4)

`MetricResult` now also supports:

- `error` — query failure (never coerced to 0)
- `insufficient_sample` — includes `sampleSize` (e.g. p95 needs ≥20)

UI maps both to an honest `—` / unavailable card with reason.

## Latency percentiles

| Percentile | Minimum samples |
|------------|-----------------|
| p50 | 5 |
| p95 | 20 |
| p99 | 20 |

Displayed as e.g. `Need ≥20 latency samples for p95 (n=8)`.

## Stale job thresholds

Documented in `STALE_JOB_THRESHOLDS_MS`:

| Condition | Threshold |
|-----------|-----------|
| queued | 60 minutes |
| running (default) | 30 minutes |
| Instagram import running | 45 minutes |

## Anomaly rules

Deterministic comparisons of last 24h vs prior 24h:

- error spike
- latency spike
- token spike
- cost spike (**only** when verified cost exists)
- model failure concentration
- feature volume anomaly

Minimum recent terminal requests: 20 (no ML theater).

## Pricing

Set verified rates via env (optional):

```bash
AI_PRICING_JSON='[{"provider":"openai","model":"…","inputPer1k":0.0,"outputPer1k":0.0,"currency":"USD","source":"ops-sheet-2026-09"}]'
```

Without this (and without logged `estimated_cost`), Costs page shows:

> Cost unavailable — No verified provider pricing telemetry is currently configured.

## Permissions

| Action | Permission |
|--------|------------|
| Read AI / anomalies / economics | `ai.read` |
| Prompt registry upsert | `ai.manage` |
| Ops / deps / timeline | `system.read` |
| Alert rule create / investigating | `system.manage` |
| Job health / queues | `jobs.read` |

All mutations write `admin_audit_logs`.

## Migrations

- `20260916010000_admin_phase3.sql` — incidents, support notes, prompt registry
- `20260916020000_admin_phase3_indexes.sql` — Phase 3 indexes
- `20260916030000_admin_phase4.sql` — `correlation_id` on `ai_usage_logs` / `import_jobs`, provider/model indexes, `alerts.status` includes `investigating`

Apply in Supabase SQL Editor / `supabase db push` if CLI is linked.

## Navigation

```text
AI → Overview, Requests, Usage, Costs, Models, Providers, Prompts, Failures, Latency, Anomalies
OPERATIONS → Overview (/ops), Errors/Alerts, Queues, Jobs, Webhooks, Cron, Dependencies, Incidents
```

## Known limitations

1. Token/cost often unavailable until AI callers populate usage + verified pricing.
2. Instrumented AI callers: `import_analyze` (job path) and `price_suggest` (catalog suggest). Website config generation remains deterministic/local (no LLM call) — no `ai_usage_logs` rows expected.
3. Webhook / email / R2 / deployment probes are `not_instrumented`.
4. Cron shows configuration only — no `cron_runs` history table.
5. Alert rules exist; a scheduled evaluator cron is not shipped (idempotent helper is ready).
6. Phase 3/4 tables must be applied on production Supabase for incidents/prompts/correlation_id.
7. Per-website page-view counts on `/admin/websites` are unavailable until a dedicated aggregate exists (no unbounded `page_views` scans).
