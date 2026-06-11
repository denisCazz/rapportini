const CACHE_KEY = 'bitora_catalog_cache_v1';

export interface CachedMarca {
  id: string;
  nome: string;
  local?: boolean;
}

export interface CachedModello {
  id: string;
  nome: string;
  marca_id: string;
  local?: boolean;
}

interface CatalogCache {
  marche: CachedMarca[];
  modelliByMarca: Record<string, CachedModello[]>;
  updatedAt: number;
}

function readCache(): CatalogCache {
  if (typeof window === 'undefined') {
    return { marche: [], modelliByMarca: {}, updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { marche: [], modelliByMarca: {}, updatedAt: 0 };
    const parsed = JSON.parse(raw) as CatalogCache;
    return {
      marche: Array.isArray(parsed.marche) ? parsed.marche : [],
      modelliByMarca: parsed.modelliByMarca ?? {},
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return { marche: [], modelliByMarca: {}, updatedAt: 0 };
  }
}

function writeCache(cache: CatalogCache): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function getCachedMarche(): CachedMarca[] {
  return readCache().marche;
}

export function getCachedModelli(marcaId: string): CachedModello[] {
  return readCache().modelliByMarca[marcaId] ?? [];
}

export function setCachedMarche(marche: CachedMarca[]): void {
  const cache = readCache();
  cache.marche = marche;
  cache.updatedAt = Date.now();
  writeCache(cache);
}

export function setCachedModelli(marcaId: string, modelli: CachedModello[]): void {
  const cache = readCache();
  cache.modelliByMarca[marcaId] = modelli;
  cache.updatedAt = Date.now();
  writeCache(cache);
}

export function createLocalCatalogId(kind: 'marca' | 'modello'): string {
  return `local_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Registra una marca digitata offline nel catalogo locale (solo UI/cache). */
export function addLocalMarca(nome: string): CachedMarca {
  const trimmed = nome.trim();
  const cache = readCache();
  const existing = cache.marche.find((m) => m.nome.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const marca: CachedMarca = {
    id: createLocalCatalogId('marca'),
    nome: trimmed,
    local: true,
  };
  cache.marche = [...cache.marche, marca];
  cache.updatedAt = Date.now();
  writeCache(cache);
  return marca;
}

/** Registra un modello digitato offline nel catalogo locale (solo UI/cache). */
export function addLocalModello(marcaId: string, nome: string): CachedModello {
  const trimmed = nome.trim();
  const cache = readCache();
  const list = cache.modelliByMarca[marcaId] ?? [];
  const existing = list.find((m) => m.nome.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const modello: CachedModello = {
    id: createLocalCatalogId('modello'),
    nome: trimmed,
    marca_id: marcaId,
    local: true,
  };
  cache.modelliByMarca[marcaId] = [...list, modello];
  cache.updatedAt = Date.now();
  writeCache(cache);
  return modello;
}
