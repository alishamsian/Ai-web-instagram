-- Keep the durable worker claim contract aligned with the application job state machine.
-- The original migration used a zero-argument RPC; production now uses explicit
-- worker/stale/retry inputs and RETURNS TABLE(id uuid).

CREATE OR REPLACE FUNCTION public.claim_next_import_job(
  p_worker_id text,
  p_stale_before timestamptz,
  p_max_retries integer DEFAULT 3
)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT j.id
    FROM public.import_jobs j
    WHERE (
      j.status = 'queued'
      OR (
        j.status = 'scraping'
        AND j.updated_at < p_stale_before
        AND j.retry_count < p_max_retries
      )
    )
    ORDER BY j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.import_jobs j
  SET status = 'scraping',
      stage = 'connecting',
      started_at = COALESCE(j.started_at, now()),
      updated_at = now(),
      retry_count = CASE
        WHEN j.status = 'scraping' THEN j.retry_count + 1
        ELSE j.retry_count
      END
  FROM candidate c
  WHERE j.id = c.id
  RETURNING j.id;
END;
$$;

COMMENT ON FUNCTION public.claim_next_import_job(text, timestamptz, integer)
IS 'Atomically claims the oldest queued or stale scraping import job. Service-role only.';

REVOKE ALL ON FUNCTION public.claim_next_import_job(text, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_next_import_job(text, timestamptz, integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_next_import_job(text, timestamptz, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_import_job(text, timestamptz, integer) TO service_role;
