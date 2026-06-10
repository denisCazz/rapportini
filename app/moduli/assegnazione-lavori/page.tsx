'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import AssegnazioneLavori from '@/components/modules/AssegnazioneLavori';
import { PAID_MODULES } from '@/lib/modules';

const modulo = PAID_MODULES.find((m) => m.code === 'assegnazione_lavori')!;

export default function AssegnazioneLavoriPage() {
  return (
    <ModulePageShell modulo={modulo}>
      <AssegnazioneLavori />
    </ModulePageShell>
  );
}
