import { describe, it, expect } from '@jest/globals';

/**
 * Basic health check test
 */
describe('Health Check', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should have MINING_NODE_ENV || NODE_ENV defined', () => {
    expect(process.env.MINING_NODE_ENV || process.env.NODE_ENV).toBeDefined();
  });
});
