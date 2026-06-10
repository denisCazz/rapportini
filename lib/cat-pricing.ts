/** Prezzo base mensile per fino a 2 operatori (tutti i moduli inclusi). */
export const CAT_BASE_PRICE_EUR = 30;

/** Operatori inclusi nel pacchetto base. */
export const CAT_BASE_OPERATOR_SLOTS = 2;

/** Costo aggiuntivo mensile per ogni operatore oltre il pacchetto base. */
export const CAT_EXTRA_OPERATOR_PRICE_EUR = 5;

/**
 * Calcola il costo mensile licenza CAT in base al numero di operatori attivi.
 * Fino a 2 utenti: €30 totali; ogni utente aggiuntivo: +€5.
 */
export function calcCatLicensePriceEur(operatorCount: number): number {
  const count = Math.max(0, Math.floor(operatorCount));
  if (count <= CAT_BASE_OPERATOR_SLOTS) {
    return CAT_BASE_PRICE_EUR;
  }
  return CAT_BASE_PRICE_EUR + (count - CAT_BASE_OPERATOR_SLOTS) * CAT_EXTRA_OPERATOR_PRICE_EUR;
}

export function formatCatLicensePrice(operatorCount: number): string {
  const price = calcCatLicensePriceEur(operatorCount);
  const extra =
    operatorCount > CAT_BASE_OPERATOR_SLOTS
      ? ` (${operatorCount} operatori: pacchetto base + ${operatorCount - CAT_BASE_OPERATOR_SLOTS} extra)`
      : ` (fino a ${CAT_BASE_OPERATOR_SLOTS} operatori)`;
  return `€${price}/mese${extra}`;
}
