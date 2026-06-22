/** Normalizza firma salvata (data URL o base64 grezzo) per anteprima e validazione */
export function normalizeFirmaDataUrl(firma: string | null | undefined): string {
  const trimmed = (firma ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}

/** Firma accettabile: data URL immagine o base64 con contenuto reale */
export function isAcceptedFirma(value: string | null | undefined): boolean {
  const normalized = normalizeFirmaDataUrl(value);
  if (!normalized) return false;
  if (normalized.startsWith('data:image/')) {
    const comma = normalized.indexOf(',');
    if (comma === -1) return false;
    const payload = normalized.slice(comma + 1).trim();
    return payload.length >= 32;
  }
  return normalized.length >= 32;
}
