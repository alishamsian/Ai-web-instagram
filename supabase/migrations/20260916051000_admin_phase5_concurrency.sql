-- Phase 5 hardening: atomic error-group aggregation and safe incident assignment.

create or replace function public.upsert_admin_error_group(
  p_fingerprint text,
  p_source text,
  p_error_code text,
  p_normalized_message text,
  p_severity text,
  p_now timestamptz,
  p_correlation_id text,
  p_resource_type text,
  p_resource_id text,
  p_workspace_id uuid,
  p_sample_message text
)
returns table (id uuid, occurrence_count integer, status text)
language sql
security invoker
set search_path = public
as $$
  insert into public.admin_error_groups (
    fingerprint, source, error_code, normalized_message, severity,
    occurrence_count, first_seen_at, last_seen_at, last_correlation_id,
    last_resource_type, last_resource_id, last_workspace_id, sample_message,
    status, updated_at
  ) values (
    p_fingerprint, p_source, p_error_code, p_normalized_message, p_severity,
    1, p_now, p_now, p_correlation_id, p_resource_type, p_resource_id,
    p_workspace_id, p_sample_message, 'open', p_now
  )
  on conflict (fingerprint) do update set
    occurrence_count = public.admin_error_groups.occurrence_count + 1,
    last_seen_at = excluded.last_seen_at,
    last_correlation_id = excluded.last_correlation_id,
    last_resource_type = excluded.last_resource_type,
    last_resource_id = excluded.last_resource_id,
    last_workspace_id = excluded.last_workspace_id,
    sample_message = excluded.sample_message,
    severity = excluded.severity,
    updated_at = excluded.updated_at,
    status = case when public.admin_error_groups.status = 'resolved' then 'open' else public.admin_error_groups.status end
  returning public.admin_error_groups.id, public.admin_error_groups.occurrence_count, public.admin_error_groups.status;
$$;

revoke all on function public.upsert_admin_error_group(
  text,text,text,text,text,timestamptz,text,text,text,uuid,text
) from public, anon, authenticated;
grant execute on function public.upsert_admin_error_group(
  text,text,text,text,text,timestamptz,text,text,text,uuid,text
) to service_role;

create index if not exists admin_profiles_active_user_idx
  on public.admin_profiles (user_id)
  where is_active = true;
