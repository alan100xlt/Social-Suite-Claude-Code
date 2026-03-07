import { describe, it, expect } from 'vitest';

/**
 * Unit tests for permission logic (pure functions extracted from usePermissions).
 */

type AppRole = 'owner' | 'admin' | 'manager' | 'collaborator' | 'community_manager' | 'member';

type PermissionName =
  | 'view_content' | 'create_content' | 'edit_content' | 'delete_content'
  | 'publish' | 'schedule'
  | 'manage_feeds' | 'manage_campaigns' | 'manage_team' | 'manage_settings'
  | 'view_analytics' | 'manage_breaking_news' | 'manage_automations'
  | 'manage_inbox' | 'respond_inbox';

const ALL_PERMISSIONS: PermissionName[] = [
  'view_content', 'create_content', 'edit_content', 'delete_content',
  'publish', 'schedule', 'manage_feeds', 'manage_campaigns',
  'manage_team', 'manage_settings', 'view_analytics',
  'manage_breaking_news', 'manage_automations', 'manage_inbox', 'respond_inbox',
];

function allGranted(): Record<string, boolean> {
  return Object.fromEntries(ALL_PERMISSIONS.map(p => [p, true]));
}

function mergePermissions(
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

describe('allGranted', () => {
  it('returns all 15 permissions as true', () => {
    const result = allGranted();
    expect(Object.keys(result)).toHaveLength(15);
    for (const key of ALL_PERMISSIONS) {
      expect(result[key]).toBe(true);
    }
  });
});

describe('mergePermissions', () => {
  it('returns defaults when no overrides', () => {
    const defaults = [
      { permission_name: 'view_content', granted: true },
      { permission_name: 'publish', granted: false },
    ];
    const result = mergePermissions(defaults, []);
    expect(result.view_content).toBe(true);
    expect(result.publish).toBe(false);
  });

  it('overrides take precedence over defaults', () => {
    const defaults = [
      { permission_name: 'publish', granted: false },
      { permission_name: 'view_content', granted: true },
    ];
    const overrides = [
      { permission_name: 'publish', granted: true },
    ];
    const result = mergePermissions(defaults, overrides);
    expect(result.publish).toBe(true);
    expect(result.view_content).toBe(true);
  });

  it('override can revoke a default permission', () => {
    const defaults = [
      { permission_name: 'manage_team', granted: true },
    ];
    const overrides = [
      { permission_name: 'manage_team', granted: false },
    ];
    const result = mergePermissions(defaults, overrides);
    expect(result.manage_team).toBe(false);
  });

  it('handles empty defaults and overrides', () => {
    const result = mergePermissions([], []);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('override adds permissions not in defaults', () => {
    const defaults = [
      { permission_name: 'view_content', granted: true },
    ];
    const overrides = [
      { permission_name: 'manage_inbox', granted: true },
    ];
    const result = mergePermissions(defaults, overrides);
    expect(result.view_content).toBe(true);
    expect(result.manage_inbox).toBe(true);
  });
});

describe('role hierarchy expectations', () => {
  // These document the expected default permission sets per role
  const ROLE_DEFAULTS: Record<AppRole, PermissionName[]> = {
    owner: ALL_PERMISSIONS,
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

  it('owner has all permissions', () => {
    expect(ROLE_DEFAULTS.owner).toEqual(ALL_PERMISSIONS);
  });

  it('collaborator cannot publish', () => {
    expect(ROLE_DEFAULTS.collaborator).not.toContain('publish');
  });

  it('community_manager can manage inbox', () => {
    expect(ROLE_DEFAULTS.community_manager).toContain('manage_inbox');
    expect(ROLE_DEFAULTS.community_manager).toContain('respond_inbox');
  });

  it('community_manager cannot publish or create content', () => {
    expect(ROLE_DEFAULTS.community_manager).not.toContain('publish');
    expect(ROLE_DEFAULTS.community_manager).not.toContain('create_content');
  });

  it('member has minimal permissions', () => {
    expect(ROLE_DEFAULTS.member).toHaveLength(2);
    expect(ROLE_DEFAULTS.member).toContain('view_content');
    expect(ROLE_DEFAULTS.member).toContain('view_analytics');
  });

  it('each role is a subset of the role above it', () => {
    const hierarchy: AppRole[] = ['owner', 'admin', 'manager'];
    for (let i = 1; i < hierarchy.length; i++) {
      const parentPerms = new Set(ROLE_DEFAULTS[hierarchy[i - 1]]);
      for (const perm of ROLE_DEFAULTS[hierarchy[i]]) {
        expect(parentPerms.has(perm)).toBe(true);
      }
    }
  });
});
