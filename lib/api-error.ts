/**
 * Restituisce un messaggio d'errore sicuro per il client.
 * In produzione non espone dettagli interni (stack, messaggi DB, ecc.).
 */
export function getSafeErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV !== 'production') {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
  }
  return fallback;
}
