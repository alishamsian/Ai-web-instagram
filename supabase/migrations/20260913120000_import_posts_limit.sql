-- Add optional posts_limit to import jobs (user-chosen scrape size).
alter table import_jobs
  add column if not exists posts_limit int;

comment on column import_jobs.posts_limit is
  'Requested Instagram posts to scrape for this job (plan-capped).';
