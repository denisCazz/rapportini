'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import NotificheScadenze from '@/components/modules/NotificheScadenze';
import { PAID_MODULES } from '@/lib/modules';

const modulo = PAID_MODULES.find((m) => m.code === 'notifiche_scadenze')!;

export default function NotificheScadenzePage() {
  return (
    <ModulePageShell modulo={modulo}>
      <NotificheScadenze />
    </ModulePageShell>
  );
}
