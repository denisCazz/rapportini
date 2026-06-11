import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addLocalMarca,
  addLocalModello,
  getCachedMarche,
  getCachedModelli,
  setCachedMarche,
} from '@/lib/catalog-cache';

function mockPersistingLocalStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}

describe('catalog-cache', () => {
  beforeEach(() => {
    mockPersistingLocalStorage();
  });

  it('stores and retrieves local marca offline', () => {
    const marca = addLocalMarca('Palazzetti');
    expect(marca.nome).toBe('Palazzetti');
    expect(getCachedMarche().some((m) => m.id === marca.id)).toBe(true);
  });

  it('stores modelli per marca in cache', () => {
    setCachedMarche([{ id: 'marca-1', nome: 'Test' }]);
    const modello = addLocalModello('marca-1', 'Model X');
    expect(getCachedModelli('marca-1')).toEqual(
      expect.arrayContaining([expect.objectContaining({ nome: 'Model X', marca_id: 'marca-1' })])
    );
    expect(modello.nome).toBe('Model X');
  });
});
