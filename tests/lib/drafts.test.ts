import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveDraft,
  getDrafts,
  getDraft,
  getDraftForUser,
  deleteDraft,
  clearDrafts,
  saveDeletedItem,
  getDeletedItems,
  getLastDeletedItem,
  removeDeletedItem,
  generateDraftId,
  getNewRapportinoDraftKey,
  purgeForeignDrafts,
  debounce,
  parseRapportinoDraftPayload,
} from '@/lib/drafts';

describe('Drafts System', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveDraft', () => {
    it('should save a draft to localStorage', () => {
      const draftData = { nome: 'Test', cognome: 'User' };
      saveDraft('test-draft-1', draftData, 1);

      const drafts = getDrafts();
      expect(drafts.length).toBe(1);
      expect(drafts[0].id).toBe('test-draft-1');
      expect(drafts[0].data).toEqual(draftData);
      expect(drafts[0].step).toBe(1);
    });

    it('should update existing draft', () => {
      saveDraft('test-draft-1', { nome: 'Test1' }, 1);
      saveDraft('test-draft-1', { nome: 'Test2' }, 2);

      const drafts = getDrafts();
      expect(drafts.length).toBe(1);
      expect(drafts[0].data.nome).toBe('Test2');
      expect(drafts[0].step).toBe(2);
    });

    it('should keep only last 5 drafts', () => {
      for (let i = 0; i < 7; i++) {
        saveDraft(`draft-${i}`, { index: i }, 0);
      }

      const drafts = getDrafts();
      expect(drafts.length).toBe(5);
    });
  });

  describe('getDraft', () => {
    it('should return specific draft by id', () => {
      saveDraft('draft-1', { data: 'test1' }, 0);
      saveDraft('draft-2', { data: 'test2' }, 0);

      const draft = getDraft('draft-1');
      expect(draft).not.toBeNull();
      expect(draft?.data.data).toBe('test1');
    });

    it('should return null for non-existent draft', () => {
      const draft = getDraft('non-existent');
      expect(draft).toBeNull();
    });
  });

  describe('getDraftForUser', () => {
    it('should return draft when userId matches', () => {
      saveDraft('rapportino_new_user-1', { form: {} }, 2, { userId: 'user-1' });
      const draft = getDraftForUser('rapportino_new_user-1', 'user-1');
      expect(draft?.step).toBe(2);
    });

    it('should hide draft owned by another user', () => {
      saveDraft('rapportino_new_user-2', { form: {} }, 1, { userId: 'user-2' });
      expect(getDraftForUser('rapportino_new_user-2', 'user-1')).toBeNull();
    });

    it('should ignore legacy shared draft key', () => {
      saveDraft('rapportino_new', { form: {} }, 3);
      expect(getDraftForUser('rapportino_new', 'user-1')).toBeNull();
    });
  });

  describe('purgeForeignDrafts', () => {
    it('should remove legacy and foreign drafts', () => {
      saveDraft('rapportino_new', { form: {} }, 1);
      saveDraft('rapportino_new_user-1', { form: {} }, 1, { userId: 'user-1' });
      saveDraft('rapportino_new_user-2', { form: {} }, 1, { userId: 'user-2' });

      purgeForeignDrafts('user-1');

      const drafts = getDrafts();
      expect(drafts).toHaveLength(1);
      expect(drafts[0].id).toBe('rapportino_new_user-1');
    });
  });

  describe('deleteDraft', () => {
    it('should delete a specific draft', () => {
      saveDraft('draft-1', { data: 'test1' }, 0);
      saveDraft('draft-2', { data: 'test2' }, 0);

      deleteDraft('draft-1');

      const drafts = getDrafts();
      expect(drafts.length).toBe(1);
      expect(drafts[0].id).toBe('draft-2');
    });
  });

  describe('clearDrafts', () => {
    it('should clear all drafts', () => {
      saveDraft('draft-1', { data: 'test1' }, 0);
      saveDraft('draft-2', { data: 'test2' }, 0);

      clearDrafts();

      const drafts = getDrafts();
      expect(drafts.length).toBe(0);
    });
  });
});

describe('Deleted Items (Undo)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveDeletedItem', () => {
    it('should save deleted item', () => {
      saveDeletedItem('item-1', { nome: 'Test' });

      const items = getDeletedItems();
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('item-1');
    });

    it('should keep only last 10 items', () => {
      for (let i = 0; i < 15; i++) {
        saveDeletedItem(`item-${i}`, { index: i });
      }

      const items = getDeletedItems();
      expect(items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getLastDeletedItem', () => {
    it('should return most recent deleted item', () => {
      saveDeletedItem('item-1', { nome: 'First' });
      saveDeletedItem('item-2', { nome: 'Second' });

      const last = getLastDeletedItem();
      expect(last?.id).toBe('item-2');
    });

    it('should return null when no items', () => {
      const last = getLastDeletedItem();
      expect(last).toBeNull();
    });
  });

  describe('removeDeletedItem', () => {
    it('should remove specific deleted item', () => {
      saveDeletedItem('item-1', { nome: 'First' });
      saveDeletedItem('item-2', { nome: 'Second' });

      removeDeletedItem('item-1');

      const items = getDeletedItems();
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('item-2');
    });
  });
});

describe('parseRapportinoDraftPayload', () => {
  it('should parse new payload with form and ui', () => {
    const payload = {
      form: { operatore: { nome: 'Mario' } },
      ui: { marcaId: 'm1', modelloId: 'mod1' },
    };
    const parsed = parseRapportinoDraftPayload(payload);
    expect(parsed.form).toEqual(payload.form);
    expect(parsed.ui?.marcaId).toBe('m1');
  });

  it('should parse legacy payload with flat form values', () => {
    const legacy = {
      operatore: { nome: 'Luigi', cognome: 'Verdi' },
      cliente: { nome: 'Cliente' },
    };
    const parsed = parseRapportinoDraftPayload(legacy);
    expect(parsed.form).toEqual(legacy);
    expect(parsed.ui).toBeUndefined();
  });
});

describe('Utility Functions', () => {
  describe('getNewRapportinoDraftKey', () => {
    it('should scope draft key to user id', () => {
      expect(getNewRapportinoDraftKey('abc-123')).toBe('rapportino_new_abc-123');
    });
  });

  describe('generateDraftId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateDraftId();
      const id2 = generateDraftId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^draft_\d+_[a-z0-9]+$/);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
});
