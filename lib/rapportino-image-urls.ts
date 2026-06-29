import type { RapportinoImmagine } from '@/types';

/** Base URL pubblica dell'app (per link nei report PDF/email). */
export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return url.replace(/\/$/, '');
}

/** URL assoluto per visualizzare un'immagine del rapportino. */
export function buildRapportinoImmagineUrl(rapportinoId: string, imageId: string): string {
  return `${getAppBaseUrl()}/api/rapportini/${rapportinoId}/immagini/${imageId}`;
}

/** Arricchisce le immagini con URL assoluti (server-side). */
export function withAbsoluteImageUrls(
  rapportinoId: string,
  immagini: RapportinoImmagine[]
): RapportinoImmagine[] {
  return immagini.map((img) => ({
    ...img,
    url: img.url?.startsWith('http')
      ? img.url
      : buildRapportinoImmagineUrl(rapportinoId, img.id),
  }));
}
