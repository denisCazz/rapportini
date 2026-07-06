import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  filterRicambixProducts,
  isAllowedRicambixImageUrl,
  parseRicambixProductsFromHtml,
  resetRicambixCatalogCache,
  ricambixImageProxyUrl,
  type RicambixProdotto,
} from '@/lib/ricambixstufe-catalog';

const SAMPLE_HTML = `
<script>self.__next_f.push([1,"5:[\\"$\\",\\"$Lf\\",null,{\\"products\\":[{\\"id\\":10,\\"name\\":\\"MOTORE TEST\\",\\"slug\\":\\"motore-test\\",\\"description\\":\\"desc\\",\\"price\\":140,\\"category\\":\\"MOTORIDUTTORI\\",\\"categorySlug\\":\\"motoriduttori\\",\\"image\\":\\"https://example.com/img.jpg\\",\\"weight\\":null,\\"stockQuantity\\":31,\\"name_it\\":\\"MOTORE TEST IT\\"},{\\"id\\":20,\\"name\\":\\"VENTILATORE\\",\\"slug\\":\\"ventilatore-test\\",\\"description\\":\\"desc\\",\\"price\\":99.5,\\"category\\":\\"VENTILATORI FUMI\\",\\"categorySlug\\":\\"ventilatori-fumi\\",\\"image\\":\\"\\",\\"weight\\":null,\\"stockQuantity\\":0,\\"name_it\\":\\"VENTILATORE IT\\"}]}"])</script>
`;

describe('ricambixstufe-catalog', () => {
  beforeEach(() => {
    resetRicambixCatalogCache();
    vi.restoreAllMocks();
  });

  it('parses products from RSC flight payload', () => {
    const products = parseRicambixProductsFromHtml(SAMPLE_HTML);
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      id: 10,
      nome: 'MOTORE TEST IT',
      slug: 'motore-test',
      prezzo: 140,
      categoria: 'MOTORIDUTTORI',
      giacenzaShop: 31,
    });
  });

  it('filters products by query and category', () => {
    const products: RicambixProdotto[] = [
      {
        id: 1,
        nome: 'MOTORE COCLEA',
        slug: 'motore',
        prezzo: 10,
        categoria: 'MOTORIDUTTORI',
        categoriaSlug: 'motoriduttori',
        immagine: null,
        giacenzaShop: 5,
      },
      {
        id: 2,
        nome: 'RESISTENZA',
        slug: 'resistenza',
        prezzo: 20,
        categoria: 'RESISTENZE',
        categoriaSlug: 'resistenze',
        immagine: null,
        giacenzaShop: 2,
      },
    ];

    expect(filterRicambixProducts(products, 'motore')).toHaveLength(1);
    expect(filterRicambixProducts(products, undefined, 'resistenze')).toHaveLength(1);
    expect(filterRicambixProducts(products, '2')).toHaveLength(1);
  });

  it('builds same-origin proxy URLs for RicambiXStufe images', () => {
    const url =
      'https://pub-e5b1a861541243efa43922161ac876d7.r2.dev/products/10/test.jpg';
    expect(isAllowedRicambixImageUrl(url)).toBe(true);
    expect(ricambixImageProxyUrl(url)).toBe(
      '/api/moduli/magazzino/immagine?url=' + encodeURIComponent(url)
    );
    expect(ricambixImageProxyUrl('https://evil.example/x.jpg')).toBeNull();
  });
});
