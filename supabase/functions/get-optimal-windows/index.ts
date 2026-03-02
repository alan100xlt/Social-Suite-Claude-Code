import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OptimalWindow {
  dayOfWeek: number
  hour: number
  avgEngagement: number
  postCount: number
}

interface PlatformResult {
  platform: string
  topWindows: OptimalWindow[]
  narrative: string
  confidence: string
  totalPosts: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { company_id, platform, timezone = 'UTC' } = await req.json()

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Check cache first (24-hour cache)
    const { data: cacheData } = await supabase
      .from('company_voice_settings')
      .select('optimal_windows_cache, optimal_windows_cached_at')
      .eq('company_id', company_id)
      .single()

    const now = new Date()
    const cacheAge = cacheData?.optimal_windows_cached_at 
      ? (now.getTime() - new Date(cacheData.optimal_windows_cached_at).getTime()) / (1000 * 60 * 60)
      : Infinity

    if (cacheData?.optimal_windows_cache && cacheAge < 24) {
      return new Response(
        JSON.stringify(cacheData.optimal_windows_cache),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Call the RPC function
    const { data: rawData, error } = await supabase
      .rpc('get_optimal_posting_windows', {
        _company_id: company_id,
        _platform: platform,
        _timezone: timezone
      })

    if (error) throw error

    // Process data by platform
    const platformMap = new Map<string, any[]>()
    let totalPosts = 0

    for (const row of rawData) {
      if (!platformMap.has(row.platform)) {
        platformMap.set(row.platform, [])
      }
      platformMap.get(row.platform)!.push(row)
      totalPosts += row.post_count
    }

    const results: PlatformResult[] = []

    for (const [platformName, rows] of platformMap) {
      // Sort by engagement and get top 3 windows
      const sortedRows = rows.sort((a, b) => b.avg_engagement - a.avg_engagement)
      const topWindows = sortedRows.slice(0, 3).map(row => ({
        dayOfWeek: row.day_of_week,
        hour: row.hour,
        avgEngagement: row.avg_engagement,
        postCount: row.post_count
      }))

      // Generate narrative (simplified version - in production you'd call Gemini here)
      const bestWindow = topWindows[0]
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const narrative = `Best time is ${dayNames[bestWindow.dayOfWeek]} at ${bestWindow.hour}:00. ` +
        `Average engagement: ${(bestWindow.avgEngagement * 100).toFixed(1)}%. ` +
        `Based on ${rows.length} time slots with data.`

      results.push({
        platform: platformName,
        topWindows,
        narrative,
        confidence: rows[0]?.confidence_level || 'no_data',
        totalPosts: rows.reduce((sum, row) => sum + row.post_count, 0)
      })
    }

    // Cache the results
    await supabase
      .from('company_voice_settings')
      .update({
        optimal_windows_cache: results,
        optimal_windows_cached_at: now.toISOString()
      })
      .eq('company_id', company_id)

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )

  } catch (error) {
    console.error('get-optimal-windows error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})
