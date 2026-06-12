'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import MagazzinoRicambi from '@/components/modules/MagazzinoRicambi';
import { PAID_MODULES } from '@/lib/modules';

const modulo = PAID_MODULES.find((m) => m.code === 'magazzino_ricambi')!;

export default function MagazzinoPage() {
  return (
    <ModulePageShell modulo={modulo}>
      <MagazzinoRicambi />
    </ModulePageShell>
  );
}
