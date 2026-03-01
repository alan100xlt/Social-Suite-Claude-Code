import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

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

interface UseOptimalPostingWindowsOptions {
  companyId: string
  platform?: string
  timezone?: string
  enabled?: boolean
}

export function useOptimalPostingWindows({
  companyId,
  platform,
  timezone = 'UTC',
  enabled = true
}: UseOptimalPostingWindowsOptions) {
  return useQuery({
    queryKey: ['optimal-posting-windows', companyId, platform, timezone],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-optimal-windows', {
        body: {
          company_id: companyId,
          platform,
          timezone
        }
      })

      if (error) throw error
      return data as PlatformResult[]
    },
    enabled: enabled && !!companyId,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}

// Helper hook for heatmap data
export function usePostingHeatmapData(companyId: string, platform?: string) {
  return useQuery({
    queryKey: ['posting-heatmap-data', companyId, platform],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_optimal_posting_windows', {
          _company_id: companyId,
          _platform: platform,
          _timezone: 'UTC'
        })

      if (error) throw error

      // Transform data for Nivo heatmap
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      return data.map((row: any) => ({
        x: row.hour,
        y: dayNames[row.day_of_week],
        value: row.avg_engagement * 100, // Convert to percentage
        postCount: row.post_count
      }))
    },
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
