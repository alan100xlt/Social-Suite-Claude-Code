import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Superadmin only
  try {
    await authorize(req, { superadminOnly: true });
  } catch (authError) {
    if (authError instanceof Response) return authError;
    throw authError;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { action, ...params } = await req.json();

  try {
    switch (action) {
      case 'list': {
        const { data, error } = await supabase
          .from('cron_job_settings')
          .select('*')
          .order('created_at');
        if (error) throw error;
        return json({ success: true, jobs: data });
      }

      case 'update': {
        const { jobName, schedule, enabled, description } = params;
        if (!jobName) throw new Error('jobName is required');

        const { data, error } = await supabase.rpc('update_cron_job', {
          _job_name: jobName,
          _schedule: schedule ?? null,
          _enabled: enabled ?? null,
          _description: description ?? null,
        });
        if (error) throw error;
        return json(data);
      }

      case 'trigger': {
        const { jobName } = params;
        if (!jobName) throw new Error('jobName is required');

        const { data, error } = await supabase.rpc('trigger_cron_job', {
          _job_name: jobName,
        });
        if (error) throw error;
        return json(data);
      }

      default:
        return json({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ success: false, error: message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
