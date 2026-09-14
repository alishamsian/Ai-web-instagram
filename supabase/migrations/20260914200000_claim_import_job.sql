-- Atomic import job claiming + least-privilege on the claim RPC.
-- Prevents two workers from processing the same queued job.

create or replace function public.claim_next_import_job()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  select id
  into claimed_id
  from public.import_jobs
  where status = 'queued'
  order by created_at asc
  for update skip locked
  limit 1;

  if claimed_id is null then
    return null;
  end if;

  update public.import_jobs
  set
    status = 'scraping',
    stage = 'connecting',
    updated_at = now()
  where id = claimed_id;

  return claimed_id;
end;
$$;

comment on function public.claim_next_import_job() is
  'Atomically claim the oldest queued import job (FOR UPDATE SKIP LOCKED). Service-role only.';

revoke all on function public.claim_next_import_job() from public;
revoke all on function public.claim_next_import_job() from anon;
revoke all on function public.claim_next_import_job() from authenticated;
grant execute on function public.claim_next_import_job() to service_role;

-- Re-assert anon least privilege (safe if already applied).
revoke all on all tables in schema public from anon;
grant select on table public.websites to anon;
grant usage on schema public to anon, authenticated, service_role;
