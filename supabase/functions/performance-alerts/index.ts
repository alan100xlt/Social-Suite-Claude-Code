import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/authorize.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check feature config
    const { data: config } = await supabase
      .from('company_feature_config')
      .select('config')
      .eq('company_id', companyId)
      .maybeSingle();

    const featureConfig = config?.config as any;
    const alertConfig = featureConfig?.performance_alerts;

    if (!alertConfig?.enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Performance alerts disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const viralThreshold = alertConfig.viral_threshold || 3.0;
    const underperformThreshold = alertConfig.underperform_threshold || 0.3;

    // Get recent post snapshots (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSnapshots } = await supabase
      .from('post_analytics_snapshots')
      .select('*')
      .eq('company_id', companyId)
      .gte('snapshot_date', oneDayAgo);

    // Get historical averages (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: historicalSnapshots } = await supabase
      .from('post_analytics_snapshots')
      .select('likes, comments, shares')
      .eq('company_id', companyId)
      .gte('snapshot_date', thirtyDaysAgo)
      .lt('snapshot_date', oneDayAgo);

    if (!historicalSnapshots || historicalSnapshots.length < 5) {
      return new Response(
        JSON.stringify({ success: true, alerts: 0, reason: 'Not enough historical data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate average engagement
    const avgEngagement = historicalSnapshots.reduce((sum: number, s: any) => {
      return sum + (s.likes || 0) + (s.comments || 0) + (s.shares || 0);
    }, 0) / historicalSnapshots.length;

    const alerts: Array<{ postId: string; type: 'viral' | 'underperforming'; multiplier: number }> = [];

    for (const snapshot of recentSnapshots || []) {
      const engagement = (snapshot.likes || 0) + (snapshot.comments || 0) + (snapshot.shares || 0);
      const multiplier = avgEngagement > 0 ? engagement / avgEngagement : 0;

      if (multiplier >= viralThreshold) {
        alerts.push({ postId: snapshot.post_id, type: 'viral', multiplier });
      } else if (multiplier <= underperformThreshold && engagement > 0) {
        alerts.push({ postId: snapshot.post_id, type: 'underperforming', multiplier });
      }
    }

    // Send alerts via Courier if any found
    if (alerts.length > 0) {
      const courierToken = Deno.env.get('COURIER_AUTH_TOKEN');
      if (courierToken) {
        // Get company admins/managers for notification
        const { data: members } = await supabase
          .from('company_memberships')
          .select('user_id, role')
          .eq('company_id', companyId)
          .in('role', ['owner', 'admin', 'manager']);

        for (const alert of alerts) {
          for (const member of members || []) {
            try {
              await fetch('https://api.courier.com/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${courierToken}`,
                  'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(15_000),
                body: JSON.stringify({
                  message: {
                    to: { user_id: member.user_id },
                    content: {
                      title: alert.type === 'viral'
                        ? `Post going viral! (${alert.multiplier.toFixed(1)}x average)`
                        : `Post underperforming (${(alert.multiplier * 100).toFixed(0)}% of average)`,
                      body: `Post ${alert.postId} is ${alert.type === 'viral' ? 'performing exceptionally well' : 'below expected engagement'}.`,
                    },
                    routing: { method: 'all', channels: ['email', 'push'] },
                  },
                }),
              });
            } catch (err) {
              console.error(`Failed to send alert to ${member.user_id}:`, err);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts: alerts.length, details: alerts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Performance alerts error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
