'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAID_MODULES } from '@/lib/modules';
import { Bell } from 'lucide-react';

const modulo = PAID_MODULES.find((m) => m.code === 'notifiche_scadenze')!;

export default function NotificheScadenzePage() {
  return (
    <ModulePageShell modulo={modulo}>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Bell className="h-5 w-5 text-primary" aria-hidden />
          <CardTitle>Notifiche scadenze manutenzioni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Qui potrai configurare e ricevere avvisi per le scadenze di manutenzione dei clienti.
            Il modulo è attivo per il tuo account.
          </p>
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}
