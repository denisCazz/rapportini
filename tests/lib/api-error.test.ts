import { describe, it, expect, afterEach } from 'vitest';
import { getSafeErrorMessage } from '@/lib/api-error';

describe('getSafeErrorMessage', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('returns fallback in production', () => {
    process.env.NODE_ENV = 'production';
    expect(getSafeErrorMessage(new Error('sensitive db detail'), 'Errore generico')).toBe('Errore generico');
  });

  it('returns error message in development', () => {
    process.env.NODE_ENV = 'development';
    expect(getSafeErrorMessage(new Error('debug detail'), 'Errore generico')).toBe('debug detail');
  });
});
