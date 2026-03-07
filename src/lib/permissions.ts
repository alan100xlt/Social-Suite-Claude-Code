export type AppRole = 'owner' | 'admin' | 'manager' | 'collaborator' | 'community_manager' | 'member';

export type PermissionName =
  | 'view_content' | 'create_content' | 'edit_content' | 'delete_content'
  | 'publish' | 'schedule'
  | 'manage_feeds' | 'manage_campaigns' | 'manage_team' | 'manage_settings'
  | 'view_analytics' | 'manage_breaking_news' | 'manage_automations'
  | 'manage_inbox' | 'respond_inbox';

export const ALL_PERMISSIONS: PermissionName[] = [
  'view_content', 'create_content', 'edit_content', 'delete_content',
  'publish', 'schedule', 'manage_feeds', 'manage_campaigns',
  'manage_team', 'manage_settings', 'view_analytics',
  'manage_breaking_news', 'manage_automations', 'manage_inbox', 'respond_inbox',
];

export function allGranted(): Record<string, boolean> {
  return Object.fromEntries(ALL_PERMISSIONS.map(p => [p, true]));
}

export function mergePermissions(
  defaults: Array<{ permission_name: string; granted: boolean }>,
  overrides: Array<{ permission_name: string; granted: boolean }>
): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};
  for (const d of defaults) {
    permissions[d.permission_name] = d.granted;
  }
  for (const o of overrides) {
    permissions[o.permission_name] = o.granted;
  }
  return permissions;
}

export const ROLE_DEFAULTS: Record<AppRole, PermissionName[]> = {
  owner: [...ALL_PERMISSIONS],
  admin: ALL_PERMISSIONS.filter(p => p !== 'manage_team'),
  manager: [
    'view_content', 'create_content', 'edit_content', 'delete_content',
    'publish', 'schedule', 'manage_feeds', 'manage_campaigns',
    'view_analytics', 'manage_breaking_news', 'manage_automations',
    'manage_inbox', 'respond_inbox',
  ],
  collaborator: [
    'view_content', 'create_content', 'edit_content',
    'schedule', 'view_analytics', 'respond_inbox',
  ],
  community_manager: [
    'view_content', 'manage_inbox', 'respond_inbox', 'view_analytics',
  ],
  member: [
    'view_content', 'view_analytics',
  ],
};
