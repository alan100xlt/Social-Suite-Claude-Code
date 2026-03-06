-- ============================================================================
-- Security fixes: SQL injection, RLS, and GRANT hardening
-- ============================================================================

-- Fix 1: dispatch_company_sync — whitelist function names to prevent injection
CREATE OR REPLACE FUNCTION public.dispatch_company_sync(_function_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _base_url text;
  _service_key text;
  _company RECORD;
  _count int := 0;
BEGIN
  -- Whitelist: only allow known fan-out functions
  IF _function_name NOT IN ('inbox-sync', 'analytics-sync') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid function name: ' || _function_name);
  END IF;

  -- Get Supabase URL and service role key from vault
  SELECT decrypted_secret INTO _base_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF _base_url IS NULL OR _service_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing vault secrets');
  END IF;

  -- Fan out: one HTTP request per company with a getlate_profile_id
  FOR _company IN
    SELECT id FROM companies WHERE getlate_profile_id IS NOT NULL
  LOOP
    PERFORM net.http_post(
      url := _base_url || '/functions/v1/' || _function_name,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object('companyId', _company.id)
    );
    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'function', _function_name,
    'companies_dispatched', _count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_company_sync(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_company_sync(text) TO service_role, postgres;

-- Fix 2: update_cron_job — use %L (literal) instead of %s to prevent injection
CREATE OR REPLACE FUNCTION public.update_cron_job(
  _job_name text,
  _schedule text DEFAULT NULL,
  _enabled boolean DEFAULT NULL,
  _description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settings cron_job_settings%ROWTYPE;
  _cron_command text;
BEGIN
  -- Fetch current settings
  SELECT * INTO _settings FROM cron_job_settings WHERE job_name = _job_name;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found: ' || _job_name);
  END IF;

  -- Apply updates
  IF _schedule IS NOT NULL THEN
    _settings.schedule := _schedule;
  END IF;
  IF _enabled IS NOT NULL THEN
    _settings.enabled := _enabled;
  END IF;
  IF _description IS NOT NULL THEN
    _settings.description := _description;
  END IF;

  -- Update settings table
  UPDATE cron_job_settings
  SET schedule = _settings.schedule,
      enabled = _settings.enabled,
      description = _settings.description,
      updated_at = now()
  WHERE job_name = _job_name;

  -- Build the pg_net command for this job (using %L for safe literal escaping)
  _cron_command := format(
    $cmd$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/' || %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
    $cmd$,
    _settings.edge_function
  );

  -- Unschedule existing job (ignore if not found)
  BEGIN
    PERFORM cron.unschedule(_job_name);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- job might not exist yet
  END;

  -- Re-schedule only if enabled
  IF _settings.enabled THEN
    PERFORM cron.schedule(_job_name, _settings.schedule, _cron_command);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_name', _job_name,
    'schedule', _settings.schedule,
    'enabled', _settings.enabled
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_cron_job(text, text, boolean, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_cron_job(text, text, boolean, text) TO service_role, postgres;

-- Fix 3: chat_messages — replace USING(true) policy with proper tenant isolation
DROP POLICY IF EXISTS "chat_messages_service" ON chat_messages;

-- Service role already bypasses RLS, so no service policy needed.
-- Add proper UPDATE and DELETE policies scoped to company membership.
CREATE POLICY "chat_messages_update" ON chat_messages FOR UPDATE
  USING (thread_id IN (
    SELECT id FROM chat_threads WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE
  USING (thread_id IN (
    SELECT id FROM chat_threads WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

-- Fix 4: Tighten GRANT on cron_job_settings — remove anon access
REVOKE ALL ON public.cron_job_settings FROM anon;
GRANT SELECT ON public.cron_job_settings TO authenticated;
GRANT ALL ON public.cron_job_settings TO service_role, postgres;

-- Fix 5: Tighten GRANT on cron_health_logs — remove anon access
REVOKE ALL ON public.cron_health_logs FROM anon;
GRANT SELECT ON public.cron_health_logs TO authenticated;
GRANT ALL ON public.cron_health_logs TO service_role, postgres;

-- Fix 6: Add exception handling for cron.unschedule in fan-out dispatch
-- (already handled by the CREATE OR REPLACE above using whitelist)
