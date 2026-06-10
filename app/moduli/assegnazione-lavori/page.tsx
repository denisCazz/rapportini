'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAID_MODULES } from '@/lib/modules';
import { ClipboardList } from 'lucide-react';

const modulo = PAID_MODULES.find((m) => m.code === 'assegnazione_lavori')!;

export default function AssegnazioneLavoriPage() {
  return (
    <ModulePageShell modulo={modulo}>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
          <CardTitle>Assegnazione lavori ai tecnici</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Qui potrai assegnare e gestire i lavori per ogni tecnico del team.
            Il modulo è attivo per il tuo account.
          </p>
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}
