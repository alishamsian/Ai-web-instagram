# Admin Phase 7 — Monetization + Growth + Product Instrumentation

Phase 6 remains **CLOSED**. Phase 7 adds the commercial control layer on top of existing admin foundations.

## Architecture

| Layer | Location | Notes |
| --- | --- | --- |
| Stripe config | `lib/billing/config.ts` | Server-only secrets; price IDs from env |
| Stripe client | `lib/billing/stripe.ts` | Official SDK |
| Customers | `lib/billing/customers.ts` | Idempotent create/reuse |
| Checkout / Portal | `lib/billing/checkout.ts`, `portal.ts` | Session creation ≠ payment |
| Webhooks | `lib/billing/webhooks.ts` + `app/api/webhooks/stripe` | Signature verify + idempotent ledger |
| Subscription states | `lib/billing/subscription-state.ts` | Single normalization map |
| Entitlements | `lib/billing/entitlements-resolver.ts` | Extends Phase entitlements — does not replace `PLAN_ENTITLEMENTS` |
| MRR / revenue math | `lib/billing/mrr.ts` | Pure; provider amounts only |
| Sessions | `lib/billing/sessions.ts` | Privacy-conscious `user_sessions` |
| Queries | `lib/admin/phase7-queries.ts` | Revenue / growth / billing ops |
| Actions | `lib/admin/phase7-actions.ts` | Audited entitlement overrides |
| Intelligence | `lib/admin/intelligence/{paid-conversion,session-metrics,commercial-lifecycle,billing-data-quality}.ts` | Pure |

Checkout Session creation **never** grants paid access. Webhook/`subscriptions` rows are authoritative.

## Environment

```text
STRIPE_SECRET_KEY            # server-only
STRIPE_WEBHOOK_SECRET        # server-only
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_YEARLY
STRIPE_PRICE_BUSINESS_MONTHLY
STRIPE_PRICE_BUSINESS_YEARLY
BILLING_DATA_AVAILABLE_FROM  # optional ISO boundary
```

Never use `NEXT_PUBLIC_` for Stripe secrets.

If billing is not configured, metrics return:

```text
unavailable — Billing provider not configured
```

## Database (migration)

`supabase/migrations/20260916200000_admin_phase7_billing.sql`

| Table | Purpose |
| --- | --- |
| `billing_customers` | workspace ↔ Stripe customer |
| `subscriptions` (extended) | provider ids, period, amount, interval |
| `billing_events` | idempotent webhook ledger (`provider` + `provider_event_id` unique) |
| `billing_transactions` | invoice/charge/refund amounts |
| `entitlement_overrides` | audited temporary plan overrides |
| `user_sessions` | DAU/WAU/MAU session starts |

### RLS

- RLS enabled on all billing tables
- `anon`: no access
- `authenticated`: SELECT own workspace rows on customers / subscriptions / transactions only
- `billing_events`, `entitlement_overrides`, `user_sessions`: service_role only
- Mutations: service_role via Next.js server

## Subscription state machine

Canonical statuses: `trialing`, `active`, `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `paused`.

Paid access statuses: `active` | `trialing` | `past_due`.

## Entitlement precedence

1. Unexpired, non-revoked **override**
2. If billing configured: valid **subscription** → plan
3. If billing configured and no valid subscription → **free** (ignore stale `workspaces.plan`)
4. If billing **not** configured → `workspaces.plan` (dev/legacy)

`workspaces.plan` is denormalized by webhooks for UI convenience; the resolver is authoritative when billing is on.

## Checkout lifecycle

```text
User selects price
 → POST /api/billing/checkout (session workspace only; price must be env-configured)
 → Stripe Checkout Session
 → redirect
 → webhook customer.subscription.* / invoice.*
 → local subscriptions + workspaces.plan
 → entitlements
```

## Webhook idempotency

1. Insert `billing_events` with unique `(provider, provider_event_id)`
2. Duplicate insert → treat as already processed
3. Process side effects
4. Mark `processed` / `ignored` / `failed`
5. Failures → Phase 5 `recordSystemFailure` + Stripe retry (HTTP 500)

Handled events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid` / `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.finalized` (ignored), `charge.refunded`.

Payloads stored sanitized (`payload_safe`) — no raw card data.

## MRR / ARR / revenue definitions

- **MRR**: sum of `unit_amount_cents × quantity` for `active|trialing` subscriptions. Annual → `/12`. Week/day excluded. One-time charges excluded.
- **ARR**: `MRR × 12`
- **Gross revenue**: succeeded `invoice_payment|charge` in range
- **Refunds**: succeeded refunds + `refunded_amount_cents`
- **Net**: gross − refunds
- **Collected cash ≠ booked MRR**

Multi-currency: no silent FX conversion — mixed currency → `partial` with warning.

## Paid conversion

- Signup → paid within `PAID_CONVERSION_WINDOW_DAYS` (60)
- Activated → paid within same window from activation
- Immature cohorts → `pending` / `insufficient_data` — **never 0%**

## Activation (unchanged Phase 6)

```text
signup_at ≤ activation_at ≤ signup_at + 30 days
```

Successful import = `import_jobs.status = completed` OR `websites.published_at`.

## Commercial funnel

```text
signup → import → website generated → editor_opened → edited → preview → publish → domain → checkout → paid
```

Preview: real `website_previewed` from Phase 7. Historical proxy via `website_edited` remains marked `partial`.

## Session telemetry

- Events: `login`, `logout`, `session_started`
- Table: `user_sessions` (hashed UA, opaque session_key)
- DAU/WAU/MAU only when telemetry available — otherwise `unavailable`

Activity-based retention from Phase 6 is **not** replaced. Session retention is separate when data exists.

## Commercial lifecycle

States: `new`, `activated`, `engaged`, `trial`, `paid`, `expansion`, `at_risk`, `churned`, `reactivated`.

Missing billing telemetry is not negative evidence.

## Health / at-risk

Phase 6 rule-based health remains. Billing risk (`past_due` / `unpaid` / failed payments) feeds commercial lifecycle and founder billing summary. Permission denial stays `permission_denied`, never `0`.

## Admin UI

| Route | Permission |
| --- | --- |
| `/admin/growth` | `growth.read` |
| `/admin/revenue` | `billing.read` / revenue intelligence |
| `/admin/billing` | `billing.read` |
| Founder strip | `system.read` (bounded) |

RBAC additions: `billing.manage`, `billing.override`, `revenue.read`, `growth.read`.  
ANALYST: read-only. SUPPORT: no manage/override.

## Data quality

`assessBillingDataQuality` covers orphans, duplicate provider ids, unprocessed events, paid plan without subscription, canceled-still-paid, bad amounts/currencies/timestamps.

## Data availability boundary

If `BILLING_DATA_AVAILABLE_FROM` is set, ranges before that date are marked `partial` / unavailable as appropriate. No fabricated historical MRR.

## Known limitations

- Stripe must be configured in the environment for live checkout/webhooks
- Expansion/contraction/churned MRR movement metrics require sufficient subscription transition history — otherwise `unavailable`
- Acquisition attribution / PQL not invented
- Browser QA of live Stripe checkout depends on configured keys

## Tests

`tests/admin-phase7-closure.test.ts` + existing Phase 3–6 suites must stay green.
