-- Phase 7 billing hardening: billing data is server/service-role owned.
-- Authenticated users do not need direct table grants; server routes use service_role.
-- RLS remains enabled as defense in depth.

revoke all on public.subscriptions from anon, authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;

-- Keep the intended service-role-only boundary explicit for all sensitive billing tables.
revoke all on public.billing_customers from anon, authenticated;
revoke all on public.billing_events from anon, authenticated;
revoke all on public.billing_transactions from anon, authenticated;
revoke all on public.entitlement_overrides from anon, authenticated;
revoke all on public.user_sessions from anon, authenticated;
