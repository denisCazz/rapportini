'use client';

import { Lock } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { PaidModuleDefinition } from '@/lib/modules';

interface ActivateModulePlaceholderProps {
  modulo: PaidModuleDefinition;
}

export default function ActivateModulePlaceholder({ modulo }: ActivateModulePlaceholderProps) {
  return (
    <EmptyState
      icon={<Lock className="h-6 w-6 text-muted-foreground" aria-hidden />}
      title="Attiva modulo"
      description={`Il modulo "${modulo.nome}" non è attivo per il tuo account. Contatta l'amministratore per richiederne l'attivazione.`}
    />
  );
}
