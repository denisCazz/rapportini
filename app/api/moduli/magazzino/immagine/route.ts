import { NextRequest, NextResponse } from 'next/server';
import { isAllowedRicambixImageUrl } from '@/lib/ricambixstufe-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url || !isAllowedRicambixImageUrl(url)) {
    return NextResponse.json({ error: 'URL immagine non valido' }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'image/*', 'User-Agent': 'Bitora-Magazzino/1.0' },
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Immagine non trovata' }, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('GET magazzino immagine error:', error);
    return NextResponse.json({ error: 'Errore caricamento immagine' }, { status: 502 });
  }
}
