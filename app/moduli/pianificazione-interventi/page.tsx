'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAID_MODULES } from '@/lib/modules';
import { Calendar } from 'lucide-react';

const modulo = PAID_MODULES.find((m) => m.code === 'pianificazione_interventi')!;

export default function PianificazioneInterventiPage() {
  return (
    <ModulePageShell modulo={modulo}>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" aria-hidden />
          <CardTitle>Pianificazione interventi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Qui potrai visualizzare e pianificare gli interventi tecnici sul calendario.
            Il modulo è attivo per il tuo account.
          </p>
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}
