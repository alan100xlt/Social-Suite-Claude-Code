import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize, corsHeaders } from '../_shared/authorize.ts';
import { CronMonitor } from '../_shared/cron-monitor.ts';

/**
 * GA Analytics Sync Edge Function
 *
 * Pulls hourly page metrics and traffic source data from GA4 Data API.
 * Runs hourly via cron-dispatcher (per-company fan-out).
 *
 * Steps:
 *   1. Fetch active GA connections for the company
 *   2. Refresh access tokens as needed
 *   3. Pull page metrics via GA4 runReport
 *   4. Pull traffic source breakdown via GA4 runReport
 *   5. Correlate post URLs to GA page paths
 *   6. Batch upsert all data
 */

const GA_DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEADLINE_MS = 50_000;
const FETCH_TIMEOUT_MS = 15_000;
const BATCH_SIZE = 50;

interface GAConnection {
  id: string;
  company_id: string;
  property_id: string;
  property_name: string | null;
  refresh_token: string;
  access_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function refreshAccessToken(
  connection: GAConnection,
  clientId: string,
  clientSecret: string,
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  // Check if current token is still valid
  if (connection.access_token && connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at).getTime();
    if (expiresAt > Date.now() + 60_000) {
      return connection.access_token;
    }
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Token refresh failed for connection ${connection.id}: ${errorText}`);
    return null;
  }

  const tokenData = await response.json();
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  // Update stored token
  await supabase
    .from('google_analytics_connections')
    .update({
      access_token: tokenData.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!googleClientId || !googleClientSecret) {
    return jsonResponse({ success: false, error: 'Google OAuth not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let targetCompanyId: string | null = null;
  try {
    const body = await req.clone().json();
    targetCompanyId = body.companyId || null;
  } catch {
    // No body
  }

  const monitorName = targetCompanyId
    ? `ga-analytics-sync:${targetCompanyId.slice(0, 8)}`
    : 'ga-analytics-sync';
  const monitor = new CronMonitor(monitorName, supabase);
  await monitor.start();

  const pastDeadline = () => Date.now() - startTime > DEADLINE_MS;

  try {
    try {
      await authorize(req, { allowServiceRole: true });
    } catch (authError) {
      if (authError instanceof Response) return authError;
      throw authError;
    }

    // Determine date range: last 24 hours for hourly sync
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    // Fetch active GA connections
    let connectionsQuery = supabase
      .from('google_analytics_connections')
      .select('*')
      .eq('is_active', true);

    if (targetCompanyId) {
      connectionsQuery = connectionsQuery.eq('company_id', targetCompanyId);
    }

    const { data: connections, error: connError } = await connectionsQuery;

    if (connError) throw new Error(`Failed to fetch GA connections: ${connError.message}`);

    if (!connections || connections.length === 0) {
      await monitor.success({ message: 'No active GA connections', companyId: targetCompanyId });
      return jsonResponse({ success: true, message: 'No active GA connections' });
    }

    const results = {
      connectionsSynced: 0,
      totalConnections: connections.length,
      pageSnapshots: 0,
      referralSnapshots: 0,
      correlations: 0,
      bailedEarly: false,
      durationMs: 0,
      errors: [] as string[],
    };

    for (const connection of connections as GAConnection[]) {
      if (pastDeadline()) {
        results.bailedEarly = true;
        break;
      }

      try {
        // Refresh access token
        const accessToken = await refreshAccessToken(
          connection, googleClientId, googleClientSecret, supabase
        );

        if (!accessToken) {
          await supabase
            .from('google_analytics_connections')
            .update({
              sync_error: 'Token refresh failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', connection.id);
          results.errors.push(`Connection ${connection.id}: token refresh failed`);
          continue;
        }

        // ── Report 1: Page Metrics ──────────────────────────
        if (!pastDeadline()) {
          const pageReportBody = {
            dateRanges: [{ startDate, endDate }],
            dimensions: [
              { name: 'pagePath' },
              { name: 'pageTitle' },
              { name: 'dateHour' },
            ],
            metrics: [
              { name: 'screenPageViews' },
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' },
            ],
            limit: 10000,
          };

          const pageResponse = await fetch(
            `${GA_DATA_API}/${connection.property_id}:runReport`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(pageReportBody),
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            }
          );

          if (pageResponse.ok) {
            const pageData = await pageResponse.json();
            const pageSnapshots: Record<string, unknown>[] = [];

            for (const row of pageData.rows || []) {
              const pagePath = row.dimensionValues?.[0]?.value || '/';
              const pageTitle = row.dimensionValues?.[1]?.value || null;
              const dateHourStr = row.dimensionValues?.[2]?.value || '';

              // Parse dateHour (YYYYMMDDHH) to timestamptz
              const year = dateHourStr.slice(0, 4);
              const month = dateHourStr.slice(4, 6);
              const day = dateHourStr.slice(6, 8);
              const hour = dateHourStr.slice(8, 10);
              const snapshotHour = `${year}-${month}-${day}T${hour}:00:00Z`;

              pageSnapshots.push({
                company_id: connection.company_id,
                connection_id: connection.id,
                page_path: pagePath,
                page_title: pageTitle,
                pageviews: parseInt(row.metricValues?.[0]?.value || '0'),
                sessions: parseInt(row.metricValues?.[1]?.value || '0'),
                users: parseInt(row.metricValues?.[2]?.value || '0'),
                bounce_rate: parseFloat(row.metricValues?.[3]?.value || '0'),
                avg_time_on_page: parseFloat(row.metricValues?.[4]?.value || '0'),
                snapshot_hour: snapshotHour,
              });
            }

            // Batch upsert
            for (let i = 0; i < pageSnapshots.length && !pastDeadline(); i += BATCH_SIZE) {
              const batch = pageSnapshots.slice(i, i + BATCH_SIZE);
              const { error: upsertError } = await supabase
                .from('ga_page_snapshots')
                .upsert(batch, { onConflict: 'company_id,page_path,snapshot_hour', ignoreDuplicates: false });

              if (upsertError) {
                results.errors.push(`Page snapshot batch error: ${upsertError.message}`);
              } else {
                results.pageSnapshots += batch.length;
              }
            }
          } else {
            const errorText = await pageResponse.text();
            console.error(`GA page report failed for ${connection.id}: ${pageResponse.status} — ${errorText.slice(0, 200)}`);
            results.errors.push(`Connection ${connection.id}: page report ${pageResponse.status}`);
          }
        }

        // ── Report 2: Traffic Sources ───────────────────────
        if (!pastDeadline()) {
          const trafficReportBody = {
            dateRanges: [{ startDate, endDate }],
            dimensions: [
              { name: 'pagePath' },
              { name: 'sessionSource' },
              { name: 'sessionMedium' },
              { name: 'sessionCampaignName' },
              { name: 'dateHour' },
            ],
            metrics: [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'screenPageViews' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' },
            ],
            limit: 10000,
          };

          const trafficResponse = await fetch(
            `${GA_DATA_API}/${connection.property_id}:runReport`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(trafficReportBody),
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            }
          );

          if (trafficResponse.ok) {
            const trafficData = await trafficResponse.json();
            const referralSnapshots: Record<string, unknown>[] = [];

            for (const row of trafficData.rows || []) {
              const pagePath = row.dimensionValues?.[0]?.value || '/';
              const source = row.dimensionValues?.[1]?.value || '(not set)';
              const medium = row.dimensionValues?.[2]?.value || '(not set)';
              const campaign = row.dimensionValues?.[3]?.value || null;
              const dateHourStr = row.dimensionValues?.[4]?.value || '';

              const year = dateHourStr.slice(0, 4);
              const month = dateHourStr.slice(4, 6);
              const day = dateHourStr.slice(6, 8);
              const hour = dateHourStr.slice(8, 10);
              const snapshotHour = `${year}-${month}-${day}T${hour}:00:00Z`;

              referralSnapshots.push({
                company_id: connection.company_id,
                connection_id: connection.id,
                page_path: pagePath,
                source,
                medium,
                campaign,
                sessions: parseInt(row.metricValues?.[0]?.value || '0'),
                users: parseInt(row.metricValues?.[1]?.value || '0'),
                pageviews: parseInt(row.metricValues?.[2]?.value || '0'),
                bounce_rate: parseFloat(row.metricValues?.[3]?.value || '0'),
                avg_session_duration: parseFloat(row.metricValues?.[4]?.value || '0'),
                snapshot_hour: snapshotHour,
              });
            }

            for (let i = 0; i < referralSnapshots.length && !pastDeadline(); i += BATCH_SIZE) {
              const batch = referralSnapshots.slice(i, i + BATCH_SIZE);
              const { error: upsertError } = await supabase
                .from('ga_referral_snapshots')
                .upsert(batch, { onConflict: 'company_id,page_path,source,medium,snapshot_hour', ignoreDuplicates: false });

              if (upsertError) {
                results.errors.push(`Referral snapshot batch error: ${upsertError.message}`);
              } else {
                results.referralSnapshots += batch.length;
              }
            }
          } else {
            const errorText = await trafficResponse.text();
            console.error(`GA traffic report failed for ${connection.id}: ${trafficResponse.status}`);
            results.errors.push(`Connection ${connection.id}: traffic report ${trafficResponse.status}`);
          }
        }

        // ── Step 3: URL Correlation ─────────────────────────
        if (!pastDeadline()) {
          // Get recent posts with URLs
          const { data: recentPosts } = await supabase
            .from('post_analytics_snapshots')
            .select('post_id, platform, post_url, content')
            .eq('company_id', connection.company_id)
            .not('post_url', 'is', null)
            .order('published_at', { ascending: false })
            .limit(200);

          // Get known page paths
          const { data: knownPages } = await supabase
            .from('ga_page_snapshots')
            .select('page_path')
            .eq('company_id', connection.company_id)
            .order('snapshot_hour', { ascending: false })
            .limit(500);

          const pagePaths = new Set((knownPages || []).map(p => p.page_path));

          if (recentPosts && pagePaths.size > 0) {
            const correlations: Record<string, unknown>[] = [];

            for (const post of recentPosts) {
              // Extract URLs from post_url and content
              const urls: string[] = [];
              if (post.post_url) urls.push(post.post_url);
              if (post.content) {
                const contentUrls = post.content.match(/https?:\/\/[^\s"'<>]+/g) || [];
                urls.push(...contentUrls);
              }

              for (const url of urls) {
                try {
                  const parsed = new URL(url);
                  const path = parsed.pathname;

                  // Check if this path exists in GA data
                  if (pagePaths.has(path)) {
                    correlations.push({
                      company_id: connection.company_id,
                      post_id: post.post_id,
                      platform: post.platform,
                      page_path: path,
                      match_type: 'url',
                      match_confidence: 1.0,
                      updated_at: new Date().toISOString(),
                    });
                  }

                  // Also check with trailing slash variants
                  const altPath = path.endsWith('/') ? path.slice(0, -1) : path + '/';
                  if (pagePaths.has(altPath)) {
                    correlations.push({
                      company_id: connection.company_id,
                      post_id: post.post_id,
                      platform: post.platform,
                      page_path: altPath,
                      match_type: 'url',
                      match_confidence: 0.9,
                      updated_at: new Date().toISOString(),
                    });
                  }
                } catch {
                  // Invalid URL, skip
                }
              }
            }

            if (correlations.length > 0) {
              for (let i = 0; i < correlations.length && !pastDeadline(); i += BATCH_SIZE) {
                const batch = correlations.slice(i, i + BATCH_SIZE);
                const { error: corrError } = await supabase
                  .from('post_page_correlations')
                  .upsert(batch, { onConflict: 'company_id,post_id,page_path', ignoreDuplicates: false });

                if (corrError) {
                  results.errors.push(`Correlation batch error: ${corrError.message}`);
                } else {
                  results.correlations += batch.length;
                }
              }
            }
          }
        }

        // Update last sync timestamp
        await supabase
          .from('google_analytics_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

        results.connectionsSynced++;
        console.log(`Completed GA sync for connection ${connection.id}`);
      } catch (connError) {
        console.error(`Error syncing connection ${connection.id}:`, connError);
        const errorMsg = connError instanceof Error ? connError.message : 'Unknown error';
        results.errors.push(`Connection ${connection.id}: ${errorMsg}`);

        await supabase
          .from('google_analytics_connections')
          .update({
            sync_error: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
      }
    }

    results.durationMs = Date.now() - startTime;
    results.errors = results.errors.slice(0, 5); // Truncate to avoid log bloat
    console.log('GA analytics sync completed:', JSON.stringify(results));

    await monitor.success(results);
    return jsonResponse({ success: true, ...results });
  } catch (error) {
    console.error('GA analytics sync error:', error);
    await monitor.error(error instanceof Error ? error : new Error(String(error)));
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
