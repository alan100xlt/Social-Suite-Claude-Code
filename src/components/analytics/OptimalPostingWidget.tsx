import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, TrendingUp, Calendar, BarChart3 } from 'lucide-react'
import { useOptimalPostingWindows } from '@/hooks/useOptimalPostingWindows'
import { Skeleton } from '@/components/ui/skeleton'

interface OptimalPostingWidgetProps {
  companyId: string
  platform?: string
}

export function OptimalPostingWidget({ companyId, platform }: OptimalPostingWidgetProps) {
  const { data, isLoading, error } = useOptimalPostingWindows({
    companyId,
    platform,
    enabled: !!companyId
  })

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high_confidence': return 'bg-green-100 text-green-800'
      case 'confident': return 'bg-blue-100 text-blue-800'
      case 'low_confidence': return 'bg-yellow-100 text-yellow-800'
      case 'no_data': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high_confidence': return 'High Confidence'
      case 'confident': return 'Confident'
      case 'low_confidence': return 'Low Confidence'
      case 'no_data': return 'No Data'
      default: return 'Unknown'
    }
  }

  const formatDayHour = (dayOfWeek: number, hour: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return `${days[dayOfWeek]} ${hour}:00`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Optimal Posting Times
          </CardTitle>
          <CardDescription>
            Best times to post based on your historical engagement data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Optimal Posting Times
          </CardTitle>
          <CardDescription>
            Best times to post based on your historical engagement data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No posting data available yet</p>
            <p className="text-sm">Publish more posts to see optimal timing recommendations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Optimal Posting Times
        </CardTitle>
        <CardDescription>
          Best times to post based on your historical engagement data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((platformData) => (
            <div key={platformData.platform} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium capitalize">{platformData.platform}</h4>
                  <Badge className={getConfidenceColor(platformData.confidence)}>
                    {getConfidenceText(platformData.confidence)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {platformData.totalPosts} posts analyzed
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="space-y-3">
                  {platformData.topWindows.map((window, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          index === 0 ? 'bg-green-500 text-white' :
                          index === 1 ? 'bg-blue-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {formatDayHour(window.dayOfWeek, window.hour)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {window.postCount} posts
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {(window.avgEngagement * 100).toFixed(1)}% avg
                        </div>
                        <div className="text-sm text-muted-foreground">
                          engagement
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                <p className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {platformData.narrative}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
