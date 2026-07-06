import { NextRequest, NextResponse } from 'next/server';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import {
  fetchRicambixCatalog,
  filterRicambixProducts,
  ricambixProductUrl,
} from '@/lib/ricambixstufe-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.MAGAZZINO_RICAMBI);
    if (!auth.ok) return auth.response;

    const q = request.nextUrl.searchParams.get('q') ?? undefined;
    const categoria = request.nextUrl.searchParams.get('categoria') ?? undefined;

    const catalog = await fetchRicambixCatalog();
    const filtered = filterRicambixProducts(catalog, q, categoria);

    const categorie = [...new Set(catalog.map((p) => p.categoriaSlug))].sort();

    return NextResponse.json({
      data: {
        items: filtered.map((p) => ({
          id: p.id,
          nome: p.nome,
          slug: p.slug,
          prezzo: p.prezzo,
          categoria: p.categoria,
          categoriaSlug: p.categoriaSlug,
          immagine: p.immagine,
          giacenzaShop: p.giacenzaShop,
          url: ricambixProductUrl(p.slug),
        })),
        total: filtered.length,
        categorie,
      },
    });
  } catch (error) {
    console.error('GET magazzino catalogo error:', error);
    return NextResponse.json(
      { error: 'Errore caricamento catalogo RicambiXStufe' },
      { status: 502 }
    );
  }
}
