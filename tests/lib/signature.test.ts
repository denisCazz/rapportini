import { describe, it, expect } from 'vitest';
import { isAcceptedFirma, normalizeFirmaDataUrl } from '@/lib/signature';

describe('signature helpers', () => {
  it('normalizes raw base64 to data URL', () => {
    const raw = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+B/g8FEw';
    expect(normalizeFirmaDataUrl(raw)).toBe(`data:image/png;base64,${raw}`);
  });

  it('keeps existing data URL', () => {
    const dataUrl = 'data:image/png;base64,abc123def456ghi789jkl012mno345pqr678stu901vwx';
    expect(normalizeFirmaDataUrl(dataUrl)).toBe(dataUrl);
  });

  it('accepts valid data URL signatures', () => {
    const dataUrl = 'data:image/png;base64,abc123def456ghi789jkl012mno345pqr678stu901vwx';
    expect(isAcceptedFirma(dataUrl)).toBe(true);
  });

  it('rejects empty signatures', () => {
    expect(isAcceptedFirma('')).toBe(false);
    expect(isAcceptedFirma('data:image/png;base64,')).toBe(false);
  });
});
