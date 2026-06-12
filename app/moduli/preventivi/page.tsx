'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import PreventiviPanel from '@/components/modules/PreventiviPanel';
import { PAID_MODULES } from '@/lib/modules';

const modulo = PAID_MODULES.find((m) => m.code === 'preventivi')!;

export default function PreventiviPage() {
  return (
    <ModulePageShell modulo={modulo}>
      <PreventiviPanel />
    </ModulePageShell>
  );
}
