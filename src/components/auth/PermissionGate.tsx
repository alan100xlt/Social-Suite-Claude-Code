import { type ReactNode } from 'react';
import { useHasPermission, type PermissionName } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permission: PermissionName;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const hasPermission = useHasPermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
