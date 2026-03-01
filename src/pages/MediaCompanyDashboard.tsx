import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MediaCompanyDashboard } from '@/components/media-company/MediaCompanyDashboard'
import { useParams } from 'react-router-dom'
import { useMediaCompanyPermission } from '@/hooks/useMediaCompanyHierarchy'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertTriangle } from 'lucide-react'

export default function MediaCompanyDashboardPage() {
  const { mediaCompanyId } = useParams<{ mediaCompanyId: string }>()
  
  const { data: hasPermission, isLoading: permissionLoading } = useMediaCompanyPermission(
    mediaCompanyId || '',
    'member'
  )

  if (permissionLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!mediaCompanyId) {
    return (
      <DashboardLayout>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Media company ID is required. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this media company dashboard.
            Please contact your media company administrator for access.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <MediaCompanyDashboard mediaCompanyId={mediaCompanyId} />
    </DashboardLayout>
  )
}
