# Admin Phase 6 — Intelligence + Production

## Architecture

Phase 6 adds a **Founder Intelligence Layer** on top of Phases 1–5 without replacing the lightweight Founder Dashboard.

| Layer | Location | Notes |
| --- | --- | --- |
| Event taxonomy | `lib/admin/events.ts` | Extended names; no parallel duplicate events |
| Pure intelligence | `lib/admin/intelligence/*` | Unit-testable, no I/O |
| Queries | `lib/admin/phase6-queries.ts` | Server-only, RBAC, bounded |
| AI anomalies | `lib/admin/phase4-anomalies.ts` | Reused (no duplicate engine) |
| Ops / errors | Phase 5 modules | Reused |
| UI | `/admin/analytics/*`, `/admin/health`, dashboard insights | Design system reused |

Dashboard remains lite: KPIs head-counts + system strip + ops signals + **top 5 deterministic insights**. Heavy analytics live on dedicated pages.

## Event taxonomy

Canonical names in `PRODUCT_EVENT_NAMES`. Prefer reuse over aliases.

| Product need | Canonical / source |
| --- | --- |
| signup_completed | `signup` (+ `signup_started`) |
| instagram_import_* | `import_started` / `import_completed` / `import_failed` |
| website_generated | table `websites` (+ optional future event) |
| website_previewed | **not instrumented** — funnel marks unavailable / partial via `website_edited` |
| website_published | `website_published` (instrumented on publish API) |
| editor_saved | `website_edited` (instrumented on website PATCH) |
| custom_domain | `domain_connected` |
| AI | `ai_generation_*` via `lib/admin/ai-telemetry.ts` |
| subscription_* | **mostly uninstrumented** — business layer returns unavailable |

Schema fields: `user_id`, `workspace_id`, `event_name`, `occurred_at`, `metadata` (sanitized — no secrets/PII).

## Activation definition

**ID:** `v1_publish_or_successful_import_within_window`

**Window:** `ACTIVATION_WINDOW_DAYS = 30` (canonical constant in `lib/admin/intelligence/limits.ts`)

A user is **activated** when, **within 30 days after signup** (`profiles.created_at`), their workspace achieves at least one of:

1. **Successful Instagram import** — `import_jobs.status = 'completed'` (timestamp = `completed_at` or `updated_at`)
2. **Published website** — `websites.published_at` set

### Temporal integrity (non-negotiable)

```text
signup_at ≤ activation_at ≤ signup_at + ACTIVATION_WINDOW_DAYS
AND activation_at ≤ analysis_cutoff (now)
```

Never count:

* activation before signup
* activation after the 30-day window
* future activity relative to the analysis cutoff
* raw `instagram_imports` row existence (not a success signal)

### Query boundaries

Cohort profiles: `[range.start, range.end)`.

Related activation scans: `[range.start, range.end + ACTIVATION_WINDOW_DAYS)`, then per-user validation.

### Performance

Owner→workspaces maps built once (`O(users + workspaces + events)`). Sample caps mark metrics as **`partial`**, never as exact.

**Denominator:** profiles created in the selected range (eligible users).

**Metrics:** activated users, activated workspaces, activation rate, drop-off, median hours to activation (when measurable).

## Retention definition

- **Cohort basis:** signup date (`profiles.created_at`)
- **Activity:** any of `product_events`, `websites.updated_at`, `import_jobs.updated_at` attributed to the user
- **NOT** session/login retention (those events are incomplete)
- Day 1 / 7 / 14 / 30 and weekly W0–W12
- If cohort size `< MIN_COHORT_SIZE` (5) → **Insufficient data** (never fake 0%)

## Cohort definition

Rows = UTC signup week. Columns = W0, W1, W2, W3, W4, W8, W12 activity retention. Same activity definition as retention.

## Feature adoption

Only features with evidence:

| Feature | Source |
| --- | --- |
| Instagram import | `instagram_imports` |
| Website editor | `product_events.website_edited` (unavailable if empty) |
| Website publish | `websites` published |
| Custom domain | `domains` |
| AI generation | `ai_usage_logs` |
| Channel publishing | `publications` |

## Health scoring

`HEALTH_WEIGHTS` in `lib/admin/intelligence/health-score.ts`:

- Positive: recent activity, published site, import success, AI usage, publishing
- Penalties: inactivity bands, repeated failures
- Categories: `healthy` (≥70), `neutral` (≥40), `at_risk` (<40), `insufficient_data`
- Framework: **rule-based-weighted** — not ML

Legacy `lib/admin/health.ts` signal list remains for Phase 3 badges where still used.

## Lifecycle rules

`new` → `onboarding` → `activated` → `engaged` → `power_user`, with `dormant` / `at_risk` overrides from inactivity and health category. See `lifecycle.ts`.

## At-risk rules

Explainable flags: no activity, incomplete activation, published-then-inactive, repeated import/publishing failures, high error rate, sudden usage drop. Each flag has `reason` + `evidence`.

## Anomaly rules

AI anomalies reuse Phase 4 `detectAiAnomalies` (error/latency/token/cost/model/feature volume). Requires `minRecentRequests` (≥20) or returns empty (insufficient sample).

## Founder insights

`generateFounderInsights` — deterministic thresholds only. Types: activation_drop, retention_drop, error_spike, ai_degradation, queue_backlog, customer_risk, publishing_failure_spike, feature_adoption_change. Cap = 5. No LLM for facts.

## Unavailable metrics

| Metric | Reason |
| --- | --- |
| Revenue / MRR | No amount/currency billing telemetry |
| Plan movement | `subscription_changed` not instrumented |
| Session active users | No session telemetry |
| website_previewed funnel step | No dedicated event |
| Retention % for tiny cohorts | `insufficient_data` |

**Never** display `$0` or `0%` as a stand-in for unavailable.

## Performance limits

| Limit | Value |
| --- | --- |
| Default range | 30d |
| Max analytics range | 90d (`6m`/`12m` clamped) |
| Sample cap | 5000 rows |
| Min cohort size | 5 |
| Founder insights | 5 |
| Dashboard | no `ai_usage_logs` full scans |

## Security model

- Admin authorization server-side via `requireAdminPermission`
- ANALYST read-only (no mutation permissions)
- `product_events` / AI logs: service_role only; RLS enabled; anon/authenticated revoked
- Event metadata sanitized; domain events store `hostLength` not host PII
- No service_role in client bundles

## Migration

`supabase/migrations/20260916120000_admin_phase6.sql` — additive indexes only for analytics access patterns.

## Known limitations

1. Preview funnel step incomplete until `website_previewed` is instrumented.
2. Retention is **activity-based**, not true session retention.
3. Activation/previous-period insight deltas need durable `daily_metrics` history — currently omitted rather than faked.
4. Domain adoption mixes website-level domain rows with workspace eligibility (documented as partial).
5. Cross-system correlations are labeled **Observed correlation** only when shown; no causal claims.
6. Authenticated browser QA depends on local admin credentials — report explicitly if not run.

## Tests

`tests/admin-phase6-closure.test.ts` covers activation math, retention gates, health/lifecycle/risk, anomalies, insights, DQ, performance bounds, RBAC, instrumentation, migration presence.
