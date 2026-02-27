import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { posthog } from '@/lib/posthog';

/**
 * Tracks SPA route changes as $pageview events in PostHog.
 * PostHog's default capture_pageview only fires on initial page load,
 * so this component ensures every react-router navigation is captured.
 */
export function PostHogPageviewTracker() {
  const location = useLocation();

  useEffect(() => {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
    });
  }, [location.pathname, location.search]);

  return null;
}
