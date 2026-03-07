import { type ReactNode } from 'react';
import { useIsFeatureEnabled, type FeatureConfig } from '@/hooks/useFeatureConfig';

interface FeatureGateProps {
  feature: keyof FeatureConfig;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useIsFeatureEnabled(feature);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}
