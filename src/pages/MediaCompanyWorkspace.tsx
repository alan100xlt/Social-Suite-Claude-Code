import React from 'react';
import { useParams } from 'react-router-dom';
import { EnterpriseWorkspace } from '@/components/media-company/EnterpriseWorkspace';
import { useSecurityContext } from '@/hooks/useSecurityContext';

export function MediaCompanyWorkspace() {
  const { mediaCompanyId } = useParams<{ mediaCompanyId: string }>();
  const { securityContext } = useSecurityContext();

  if (!mediaCompanyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Media Company Not Found</h2>
          <p className="text-gray-600">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  // Check if user has access to this media company
  if (securityContext && !securityContext.mediaCompanies.includes(mediaCompanyId)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this media company workspace.</p>
        </div>
      </div>
    );
  }

  return <EnterpriseWorkspace mediaCompanyId={mediaCompanyId} />;
}
