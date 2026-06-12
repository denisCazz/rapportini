const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active']);

export function isSubscriptionStatusActive(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
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
