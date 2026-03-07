import { describe, test, expect } from 'vitest';
import {
  canTransition,
  canApprove,
  VALID_TRANSITIONS,
  type ContentStatus,
} from '@/lib/content-workflow';

describe('Content Workflow State Machine', () => {
  describe('canTransition', () => {
    const validPairs: [ContentStatus, ContentStatus][] = [
      ['draft', 'awaiting_approval'],
      ['awaiting_approval', 'approved'],
      ['awaiting_approval', 'rejected'],
      ['rejected', 'draft'],
      ['approved', 'scheduled'],
      ['scheduled', 'published'],
      ['scheduled', 'draft'],
      ['published', 'pulled'],
      ['published', 'archived'],
      ['pulled', 'archived'],
    ];

    test.each(validPairs)('%s -> %s is valid', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });

    const invalidPairs: [ContentStatus, ContentStatus][] = [
      ['draft', 'published'],
      ['draft', 'approved'],
      ['draft', 'rejected'],
      ['draft', 'scheduled'],
      ['awaiting_approval', 'draft'],
      ['awaiting_approval', 'scheduled'],
      ['rejected', 'approved'],
      ['rejected', 'published'],
      ['approved', 'draft'],
      ['approved', 'published'],
      ['published', 'draft'],
      ['archived', 'draft'],
      ['archived', 'published'],
      ['pulled', 'draft'],
    ];

    test.each(invalidPairs)('%s -> %s is invalid', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    });
  });

  describe('terminal states', () => {
    test('archived has no valid transitions', () => {
      expect(VALID_TRANSITIONS.archived).toEqual([]);
    });

    test('all statuses are defined in VALID_TRANSITIONS', () => {
      const allStatuses: ContentStatus[] = [
        'draft',
        'awaiting_approval',
        'approved',
        'rejected',
        'scheduled',
        'published',
        'pulled',
        'archived',
      ];
      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
      }
    });
  });

  describe('canApprove', () => {
    test('returns true when publish permission is granted', () => {
      expect(canApprove({ publish: true, edit: true })).toBe(true);
    });

    test('returns false when publish permission is missing', () => {
      expect(canApprove({ edit: true })).toBe(false);
    });

    test('returns false when publish permission is explicitly false', () => {
      expect(canApprove({ publish: false })).toBe(false);
    });

    test('returns false for empty permissions', () => {
      expect(canApprove({})).toBe(false);
    });
  });
});
