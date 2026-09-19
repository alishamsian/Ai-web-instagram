# Production launch checklist (Phase 4)

Use this before inviting real customers. Checkboxes are operational — not a claim of legal compliance.

## Environment

- [ ] `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_ROOT_DOMAIN` set for production
- [ ] Supabase URL + publishable key (client) and `SUPABASE_SECRET_KEY` (server only)
- [ ] `AI_API_KEY` configured (or mocks disabled in production)
- [ ] `APIFY_API_TOKEN` configured for live Instagram import
- [ ] `JOB_WORKER_SECRET` / `CRON_SECRET` set (not equal to Supabase keys)
- [ ] Stripe keys only if billing go-live is intended
- [ ] No secrets in `NEXT_PUBLIC_*` beyond intended public config
- [ ] Migration `20260917010000_phase4_domains_verified_versions_unique.sql` applied

## Auth / workspace

- [ ] Signup → workspace creation works
- [ ] Cross-workspace website access returns 404 / NOT_FOUND
- [ ] Unauthenticated website/editor/AI/publish routes return 401
- [ ] Soft-deleted websites are not editable or public

## Website creation / onboarding

- [ ] Import with invalid URL shows safe error (no stack / provider text)
- [ ] Plan website limit returns 402
- [ ] Failed generation does not leave a publishable broken site
- [ ] Duplicate submit does not create duplicate sites for same cached username

## Editor / save

- [ ] Classic editor autosave + manual save work
- [ ] Version conflict (409) shows reload/review message (no silent overwrite)
- [ ] AI Apply + rapid edit does not drop the newer intentional change without conflict UX

## Publish / public

- [ ] Publish preflight blocks empty brand / empty products
- [ ] Failed publish leaves previous published version live
- [ ] Draft sites are not served on `/s/[slug]`
- [ ] Public SEO title/description render from published config

## Domains

- [ ] New custom domains start as `pending_verification` (`verified_at` null)
- [ ] Unverified hosts do not route at edge / proxy
- [ ] Host collision returns 409
- [ ] Malformed / localhost hosts rejected

## AI usage / billing-ready

- [ ] Co-design rate limited (429)
- [ ] LLM path respects server-authoritative AI quota (402 when exhausted)
- [ ] Deterministic AI path does not burn quota
- [ ] Usage counters increment only on completed LLM generations
- [ ] Client cannot forge plan / limits / entitlements

## Observability / legal

- [ ] Product events fire for signup, import, save, publish, AI (no full prompts)
- [ ] Locale `error.tsx` shows safe UI (digest only)
- [ ] `/privacy` and `/terms` reachable in FA and EN
- [ ] Health endpoint does not leak raw DB bodies in production

## Verify locally / CI

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## Explicit non-goals this phase

- No deletion of Classic Editor or old routes
- No second WebsiteConfig / history / billing system
- No DNS platform rewrite (reuse Vercel + existing domain table)
