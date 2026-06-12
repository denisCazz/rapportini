const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active']);

export function isSubscriptionStatusActive(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

/** Stato persistito: prova annullata resta "trialing" su Stripe ma per noi è revocata. */
export function subscriptionStatusForStorage(subscription: {
  status: string;
  cancel_at_period_end?: boolean;
}): string {
  if (subscription.status === 'trialing' && subscription.cancel_at_period_end) {
    return 'canceled';
  }
  return subscription.status;
}

export function isStripeSubscriptionGrantedAccess(subscription: {
  status: string;
  cancel_at_period_end?: boolean;
}): boolean {
  return isSubscriptionStatusActive(subscriptionStatusForStorage(subscription));
}

const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'past_due',
  'paused',
  'incomplete_expired',
]);

export function isSubscriptionStatusInactive(status: string | null | undefined): boolean {
  if (!status) return false;
  return INACTIVE_SUBSCRIPTION_STATUSES.has(status);
}
