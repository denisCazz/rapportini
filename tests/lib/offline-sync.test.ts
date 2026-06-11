import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isNetworkFailure } from '@/lib/offline-sync';

describe('isNetworkFailure', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    }
  });

  it('returns true when navigator is offline', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    expect(isNetworkFailure(new Error('anything'))).toBe(true);
  });

  it('returns true for TypeError (failed fetch)', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('returns true for network-related Error messages', () => {
    expect(isNetworkFailure(new Error('NetworkError when attempting to fetch resource'))).toBe(true);
  });

  it('returns false for application errors', () => {
    expect(isNetworkFailure(new Error('Validazione fallita'))).toBe(false);
  });

  it('returns true for service worker offline responses', () => {
    expect(isNetworkFailure(new Error('Offline'))).toBe(true);
  });
});
