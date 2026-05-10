import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type AuditAction =
  | 'login_success'
  | 'login_failure'
  | 'password_change'
  | 'password_reset'
  | 'user_delete'
  | 'account_deactivate';

export async function writeAuditLog(entry: {
  org_id: string;
  user_id?: string | null;
  action: AuditAction | string;
  resource?: string | null;
  details?: Prisma.InputJsonValue;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        org_id: entry.org_id,
        user_id: entry.user_id ?? null,
        action: entry.action,
        resource: entry.resource ?? null,
        details: entry.details ?? undefined,
        ip: entry.ip ?? null,
      },
    });
  } catch (e) {
    console.warn('audit_log write skipped:', e);
  }
}
