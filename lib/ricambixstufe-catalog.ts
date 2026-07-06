/**
 * Catalogo prodotti da ricambixstufe.it (dati embedded nel payload RSC della homepage).
 */

export interface RicambixProdotto {
  id: number;
  nome: string;
  slug: string;
  prezzo: number;
  categoria: string;
  categoriaSlug: string;
  immagine: string | null;
  giacenzaShop: number;
}

const DEFAULT_SHOP_URL = 'https://www.ricambixstufe.it';
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedProducts: RicambixProdotto[] | null = null;
let cachedAt = 0;

function shopBaseUrl(): string {
  return (
    process.env.RICAMBI_SHOP_URL ||
    process.env.NEXT_PUBLIC_RICAMBI_SHOP_URL ||
    DEFAULT_SHOP_URL
  ).replace(/\/$/, '');
}

function decodeFlightChunk(raw: string): string {
  return raw
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\');
}

function pickLocalizedName(full: string, startIndex: number, fallback: string): string {
  const slice = full.slice(startIndex, startIndex + 2500);
  const nameIt = slice.match(/"name_it":"((?:\\.|[^"\\])*)"/)?.[1];
  if (nameIt) return decodeFlightChunk(nameIt);
  return decodeFlightChunk(fallback);
}

/** Estrae l'array prodotti dal payload RSC della homepage RicambiXStufe. */
export function parseRicambixProductsFromHtml(html: string): RicambixProdotto[] {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g)].map(
    (m) => m[1]
  );
  const full = decodeFlightChunk(chunks.join(''));

  const products: RicambixProdotto[] = [];
  const re =
    /\{"id":(\d+),"name":"((?:\\.|[^"\\])*)","slug":"([^"]+)"[\s\S]*?"price":([0-9.]+),"category":"([^"]*)","categorySlug":"([^"]*)"[\s\S]*?"image":"([^"]*)"[\s\S]*?"stockQuantity":(\d+)/g;

  for (const match of full.matchAll(re)) {
    const index = match.index ?? 0;
    products.push({
      id: Number(match[1]),
      nome: pickLocalizedName(full, index, match[2]),
      slug: match[3],
      prezzo: Number(match[4]),
      categoria: match[5],
      categoriaSlug: match[6],
      immagine: match[7] || null,
      giacenzaShop: Number(match[8]),
    });
  }

  return products;
}

export async function fetchRicambixCatalog(): Promise<RicambixProdotto[]> {
  const now = Date.now();
  if (cachedProducts && now - cachedAt < CACHE_TTL_MS) {
    return cachedProducts;
  }

  const res = await fetch(shopBaseUrl(), {
    headers: { Accept: 'text/html', 'User-Agent': 'Bitora-Magazzino/1.0' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Impossibile caricare il catalogo RicambiXStufe (${res.status})`);
  }

  const html = await res.text();
  const products = parseRicambixProductsFromHtml(html);
  if (products.length === 0) {
    throw new Error('Catalogo RicambiXStufe non disponibile');
  }

  cachedProducts = products;
  cachedAt = now;
  return products;
}

export function filterRicambixProducts(
  products: RicambixProdotto[],
  query?: string,
  categoriaSlug?: string
): RicambixProdotto[] {
  const q = query?.trim().toLowerCase();
  let filtered = products;

  if (categoriaSlug) {
    filtered = filtered.filter((p) => p.categoriaSlug === categoriaSlug);
  }

  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        String(p.id).includes(q)
    );
  }

  return filtered;
}

export function ricambixProductUrl(slug: string): string {
  return `${shopBaseUrl()}/products/${slug}`;
}

/** Solo per test: resetta la cache in memoria. */
export function resetRicambixCatalogCache(): void {
  cachedProducts = null;
  cachedAt = 0;
}
