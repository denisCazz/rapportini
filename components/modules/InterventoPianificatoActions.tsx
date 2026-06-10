'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, FilePlus, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { StatoInterventoPianificato } from '@/types';

interface InterventoPianificatoActionsProps {
  interventoId: string;
  stato?: StatoInterventoPianificato | string;
  titolo?: string;
  compact?: boolean;
  onUpdated?: () => void;
  className?: string;
}

export default function InterventoPianificatoActions({
  interventoId,
  stato = 'pianificato',
  titolo,
  compact = false,
  onUpdated,
  className,
}: InterventoPianificatoActionsProps) {
  const [confirmAction, setConfirmAction] = useState<'completa' | 'annulla' | null>(null);
  const [loading, setLoading] = useState<'completa' | 'annulla' | null>(null);
  const isOperatore = auth.getUser()?.ruolo === 'operatore';

  if (stato === 'completato') {
    return (
      <Badge variant="secondary" className={cn('text-[10px]', className)}>
        Completato
      </Badge>
    );
  }

  if (stato === 'annullato') {
    return (
      <Badge variant="outline" className={cn('text-[10px]', className)}>
        Annullato
      </Badge>
    );
  }

  const handleCompleta = async () => {
    setLoading('completa');
    try {
      await api.updateInterventoPianificato(interventoId, { stato: 'completato' });
      toast.success('Intervento segnato come completato');
      onUpdated?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(null);
    }
  };

  const handleAnnulla = async () => {
    setLoading('annulla');
    try {
      await api.deleteInterventoPianificato(interventoId);
      toast.success('Intervento annullato');
      onUpdated?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(null);
    }
  };

  const label = titolo ? `"${titolo}"` : 'questo intervento';

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1',
          compact ? 'mt-1.5' : 'mt-2',
          className
        )}
      >
        {isOperatore && (
          <Link
            href={`/rapportini/nuovo?interventoId=${interventoId}`}
            className={buttonVariants({
              variant: 'secondary',
              size: 'sm',
              className: cn(compact && 'h-6 px-2 text-[10px]'),
            })}
          >
            <FilePlus className={cn('mr-1', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
            Crea rapportino
          </Link>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(compact && 'h-6 px-2 text-[10px]')}
          disabled={loading !== null}
          onClick={() => setConfirmAction('completa')}
        >
          <CheckCircle2 className={cn('mr-1', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          Completa
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'text-destructive hover:text-destructive',
            compact && 'h-6 px-2 text-[10px]'
          )}
          disabled={loading !== null}
          onClick={() => setConfirmAction('annulla')}
        >
          <XCircle className={cn('mr-1', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          Annulla
        </Button>
      </div>

      <ConfirmDialog
        open={confirmAction === 'completa'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Segna come completato"
        description={`Confermi di voler segnare ${label} come completato senza creare un rapportino?`}
        confirmLabel="Segna completato"
        onConfirm={handleCompleta}
      />

      <ConfirmDialog
        open={confirmAction === 'annulla'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Annulla intervento"
        description={`Confermi di voler annullare ${label}? L'intervento non verrà eliminato ma non sarà più visibile nel calendario.`}
        confirmLabel="Annulla intervento"
        variant="destructive"
        onConfirm={handleAnnulla}
      />
    </>
  );
}
