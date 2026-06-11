import { describe, it, expect } from 'vitest';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

describe('RATE_LIMIT_CONFIGS', () => {
  it('uses 60 second windows for per-minute limits', () => {
    expect(RATE_LIMIT_CONFIGS.createRapportino.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_CONFIGS.search.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_CONFIGS.api.windowMs).toBe(60 * 1000);
  });
});
