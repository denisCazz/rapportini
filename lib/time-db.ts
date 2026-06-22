/** Converte stringa ora (HH:mm o HH:mm:ss) in Date per campo Postgres TIME via Prisma */
export function parseTimeForDb(ora: string): Date {
  const parts = ora.trim().split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parseInt(parts[2] || '0', 10);
  return new Date(1970, 0, 1, h, m, s);
}

/** Data intervento da stringa YYYY-MM-DD (mezzogiorno UTC, per salvataggio) */
export function parseDateOnly(s: string): Date {
  const d = new Date(s.trim() + 'T12:00:00.000Z');
  return d;
}

/** Inizio giornata UTC per filtri range (00:00:00.000Z) */
export function parseDateOnlyStart(s: string): Date {
  return new Date(s.trim() + 'T00:00:00.000Z');
}

/** Fine giornata UTC per filtri range (23:59:59.999Z) */
export function parseDateOnlyEnd(s: string): Date {
  return new Date(s.trim() + 'T23:59:59.999Z');
}

/** Data calendario locale → YYYY-MM-DD */
export function formatDateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Confronto inclusivo tra date YYYY-MM-DD */
export function isDateOnlyInRange(iso: string, inizio: string, fine: string): boolean {
  return iso >= inizio && iso <= fine;
}
