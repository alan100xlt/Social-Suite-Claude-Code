import { describe, it, expect } from 'vitest';
import {
  allGranted,
  mergePermissions,
  ALL_PERMISSIONS,
  ROLE_DEFAULTS,
  type AppRole,
} from '@/lib/permissions';

/**
 * Unit tests for permission logic — imports the actual functions
 * used by usePermissions hook.
 */

describe('allGranted', () => {
  it('returns all 15 permissions set to true', () => {
    const result = allGranted();
    expect(Object.keys(result)).toHaveLength(15);
    for (const key of ALL_PERMISSIONS) {
      expect(result[key]).toBe(true);
    }
  });

  it('returns a fresh object each call (no shared mutation risk)', () => {
    const a = allGranted();
    const b = allGranted();
    a.view_content = false;
    expect(b.view_content).toBe(true);
  });
});

describe('mergePermissions', () => {
  it('returns defaults when no overrides exist', () => {
    const defaults = [
      { permission_name: 'view_content', granted: true },
      { permission_name: 'publish', granted: false },
    ];
    const result = mergePermissions(defaults, []);
    expect(result.view_content).toBe(true);
    expect(result.publish).toBe(false);
  });

  it('overrides take precedence — can grant a denied permission', () => {
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

  it('overrides take precedence — can revoke a granted permission', () => {
    const defaults = [
      { permission_name: 'manage_team', granted: true },
    ];
    const overrides = [
      { permission_name: 'manage_team', granted: false },
    ];
    const result = mergePermissions(defaults, overrides);
    expect(result.manage_team).toBe(false);
  });

  it('returns empty object for empty inputs', () => {
    const result = mergePermissions([], []);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('override can introduce permissions absent from defaults', () => {
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

  it('last override wins when duplicates exist', () => {
    const result = mergePermissions([], [
      { permission_name: 'publish', granted: true },
      { permission_name: 'publish', granted: false },
    ]);
    expect(result.publish).toBe(false);
  });
});

describe('ROLE_DEFAULTS', () => {
  it('owner has all permissions', () => {
    expect(new Set(ROLE_DEFAULTS.owner)).toEqual(new Set(ALL_PERMISSIONS));
  });

  it('admin has all except manage_team', () => {
    expect(ROLE_DEFAULTS.admin).not.toContain('manage_team');
    expect(ROLE_DEFAULTS.admin.length).toBe(ALL_PERMISSIONS.length - 1);
  });

  it('collaborator cannot publish or delete', () => {
    expect(ROLE_DEFAULTS.collaborator).not.toContain('publish');
    expect(ROLE_DEFAULTS.collaborator).not.toContain('delete_content');
  });

  it('community_manager can manage and respond to inbox', () => {
    expect(ROLE_DEFAULTS.community_manager).toContain('manage_inbox');
    expect(ROLE_DEFAULTS.community_manager).toContain('respond_inbox');
  });

  it('community_manager cannot publish or create content', () => {
    expect(ROLE_DEFAULTS.community_manager).not.toContain('publish');
    expect(ROLE_DEFAULTS.community_manager).not.toContain('create_content');
  });

  it('member has only view_content and view_analytics', () => {
    expect(ROLE_DEFAULTS.member).toHaveLength(2);
    expect(ROLE_DEFAULTS.member).toContain('view_content');
    expect(ROLE_DEFAULTS.member).toContain('view_analytics');
  });

  it('each role in the hierarchy is a strict subset of the one above', () => {
    const hierarchy: AppRole[] = ['owner', 'admin', 'manager'];
    for (let i = 1; i < hierarchy.length; i++) {
      const parentPerms = new Set(ROLE_DEFAULTS[hierarchy[i - 1]]);
      for (const perm of ROLE_DEFAULTS[hierarchy[i]]) {
        expect(parentPerms.has(perm)).toBe(true);
      }
      // Strict subset — parent has more
      expect(ROLE_DEFAULTS[hierarchy[i]].length).toBeLessThan(ROLE_DEFAULTS[hierarchy[i - 1]].length);
    }
  });

  it('all role permission arrays contain only valid PermissionName values', () => {
    const validPerms = new Set(ALL_PERMISSIONS);
    for (const [role, perms] of Object.entries(ROLE_DEFAULTS)) {
      for (const perm of perms) {
        expect(validPerms.has(perm), `${role} has invalid permission: ${perm}`).toBe(true);
      }
    }
  });
});
