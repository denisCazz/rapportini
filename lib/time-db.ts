/** Converte stringa ora (HH:mm o HH:mm:ss) in Date per campo Postgres TIME via Prisma */
export function parseTimeForDb(ora: string): Date {
  const parts = ora.trim().split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parseInt(parts[2] || '0', 10);
  return new Date(1970, 0, 1, h, m, s);
}

/** Data intervento da stringa YYYY-MM-DD */
export function parseDateOnly(s: string): Date {
  const d = new Date(s.trim() + 'T12:00:00.000Z');
  return d;
}
