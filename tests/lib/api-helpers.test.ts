import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthHeaders } from '@/lib/api-helpers';

vi.mock('@/lib/auth', () => ({
  auth: {
    getUser: () => ({
      id: 'user-1',
      ruolo: 'operatore',
      org_id: 'org-1',
    }),
    refreshTokens: vi.fn(),
  },
}));

describe('getAuthHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include JSON content type by default', () => {
    const headers = getAuthHeaders();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should omit content type when uploading form data', () => {
    const headers = getAuthHeaders({ skipContentType: true });
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers['X-User-Id']).toBe('user-1');
  });
});
