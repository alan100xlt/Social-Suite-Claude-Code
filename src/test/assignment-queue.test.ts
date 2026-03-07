import { describe, test, expect } from 'vitest';

describe('AssignmentQueue', () => {
  test('module exports AssignmentQueue component', async () => {
    const mod = await import('@/components/inbox/AssignmentQueue');
    expect(mod.AssignmentQueue).toBeDefined();
  });
});
