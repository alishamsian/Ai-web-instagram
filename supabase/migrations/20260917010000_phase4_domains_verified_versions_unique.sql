-- Phase 4: production SaaS foundation — domains verification + version uniqueness

alter table if exists domains
  add column if not exists verified_at timestamptz;

-- Grandfather existing domains so current Pro setups keep routing.
update domains
set verified_at = coalesce(verified_at, created_at)
where verified_at is null;

-- New claims must verify before edge routing activates (app sets verified_at null).

create unique index if not exists website_versions_website_id_version_uidx
  on website_versions (website_id, version);
