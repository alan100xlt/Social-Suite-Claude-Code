import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Edge Function Consistency Tests
 *
 * Validates that edge functions follow required patterns by reading source code.
 * These are NOT runtime tests — they verify code structure.
 */

const EDGE_FN_DIR = path.resolve(__dirname, '../../supabase/functions');

function readEdgeFn(name: string): string {
  return fs.readFileSync(path.join(EDGE_FN_DIR, name, 'index.ts'), 'utf8');
}

describe('inbox-sync cursor persistence', () => {
  const source = readEdgeFn('inbox-sync');

  describe('comments sync', () => {
    it('reads cursor from inbox_sync_state before fetching comments', () => {
      // The syncComments function must read the existing cursor from DB
      expect(source).toContain("sync_type: 'comments'");
      // Must select cursor from inbox_sync_state
      expect(source).toMatch(/select\(.*cursor.*\)[\s\S]*sync_type.*comments/);
    });

    it('writes cursor to inbox_sync_state after fetching comments', () => {
      // The upsert to inbox_sync_state for comments must include cursor field
      const commentsUpsertMatch = source.match(
        /sync_type:\s*'comments'[\s\S]{0,300}cursor/
      );
      expect(commentsUpsertMatch).not.toBeNull();
    });

    it('reads nextCursor from pagination response (not cursor)', () => {
      // Contract tests confirmed: pagination uses nextCursor, not cursor
      // Comments post list pagination
      expect(source).toContain('pagination?.nextCursor');
    });
  });

  describe('DMs sync', () => {
    it('reads cursor from inbox_sync_state before fetching DMs', () => {
      expect(source).toContain("sync_type: 'dms'");
      // Must select cursor from inbox_sync_state
      expect(source).toMatch(/select\(.*cursor.*\)[\s\S]*sync_type.*dms/);
    });

    it('writes cursor to inbox_sync_state after fetching DMs', () => {
      // The upsert to inbox_sync_state for DMs must include cursor field
      const dmsUpsertMatch = source.match(
        /sync_type:\s*'dms'[\s\S]{0,300}cursor/
      );
      expect(dmsUpsertMatch).not.toBeNull();
    });

    it('reads nextCursor from DM pagination response', () => {
      // Must use nextCursor for DM conversations pagination too
      // There should be at least 2 occurrences (comments + DMs)
      const nextCursorMatches = source.match(/pagination\?\.nextCursor/g);
      expect(nextCursorMatches).not.toBeNull();
      expect(nextCursorMatches!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
