'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import PianificazioneCalendar from '@/components/modules/PianificazioneCalendar';
import { PAID_MODULES } from '@/lib/modules';

const modulo = PAID_MODULES.find((m) => m.code === 'pianificazione_interventi')!;

export default function PianificazioneInterventiPage() {
  return (
    <ModulePageShell modulo={modulo}>
      <PianificazioneCalendar />
    </ModulePageShell>
  );
}
