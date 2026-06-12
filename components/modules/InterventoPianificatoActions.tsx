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
  /** @deprecated usa variant */
  compact?: boolean;
  /** default = pulsanti con testo; compact = impilati; calendar = responsive per celle calendario */
  variant?: 'default' | 'compact' | 'calendar';
  onUpdated?: () => void;
  className?: string;
}

export default function InterventoPianificatoActions({
  interventoId,
  stato = 'pianificato',
  titolo,
  compact = false,
  variant: variantProp,
  onUpdated,
  className,
}: InterventoPianificatoActionsProps) {
  const variant = variantProp ?? (compact ? 'compact' : 'default');
  const [confirmAction, setConfirmAction] = useState<'completa' | 'annulla' | null>(null);
  const [loading, setLoading] = useState<'completa' | 'annulla' | null>(null);
  const canCreateRapportini = auth.canCreateRapportini();

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

  if (variant === 'calendar') {
    return (
      <>
        {/* Mobile: pulsanti impilati con testo */}
        <div className={cn('mt-2 flex flex-col gap-1 md:hidden', className)}>
          {canCreateRapportini && (
            <Link
              href={`/rapportini/nuovo?interventoId=${interventoId}`}
              className={buttonVariants({
                variant: 'default',
                size: 'sm',
                className: 'h-7 w-full justify-center gap-1 px-2 text-[11px] font-medium',
              })}
            >
              <FilePlus className="h-3.5 w-3.5" />
              Crea rapportino
            </Link>
          )}
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 gap-1 px-2 text-[11px]"
              disabled={loading !== null}
              onClick={() => setConfirmAction('completa')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Fatto
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 gap-1 px-2 text-[11px] text-destructive hover:text-destructive"
              disabled={loading !== null}
              onClick={() => setConfirmAction('annulla')}
            >
              <XCircle className="h-3.5 w-3.5" />
              Annulla
            </Button>
          </div>
        </div>

        {/* Desktop: barra icone compatta */}
        <div className={cn('mt-1.5 hidden items-center gap-0.5 md:flex', className)}>
          {canCreateRapportini && (
            <Link
              href={`/rapportini/nuovo?interventoId=${interventoId}`}
              title="Crea rapportino"
              aria-label="Crea rapportino"
              className={buttonVariants({
                variant: 'secondary',
                size: 'icon',
                className: 'h-7 w-7 shrink-0',
              })}
            >
              <FilePlus className="h-3.5 w-3.5" />
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            title="Segna completato"
            aria-label="Segna completato"
            disabled={loading !== null}
            onClick={() => setConfirmAction('completa')}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            title="Annulla intervento"
            aria-label="Annulla intervento"
            disabled={loading !== null}
            onClick={() => setConfirmAction('annulla')}
          >
            <XCircle className="h-3.5 w-3.5" />
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

  const isCompact = variant === 'compact';

  return (
    <>
      <div
        className={cn(
          isCompact ? 'mt-2 flex flex-col gap-1' : 'mt-2 flex flex-wrap items-center gap-1',
          className
        )}
      >
        {canCreateRapportini && (
          <Link
            href={`/rapportini/nuovo?interventoId=${interventoId}`}
            className={buttonVariants({
              variant: 'default',
              size: 'sm',
              className: cn(
                isCompact && 'h-7 w-full justify-center gap-1 px-2 text-[11px] font-medium'
              ),
            })}
          >
            <FilePlus className={cn(isCompact ? 'h-3.5 w-3.5' : 'mr-1 h-3.5 w-3.5')} />
            Crea rapportino
          </Link>
        )}
        <div className={cn(isCompact && 'flex gap-1')}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(isCompact && 'h-7 flex-1 gap-1 px-2 text-[11px]')}
            disabled={loading !== null}
            onClick={() => setConfirmAction('completa')}
          >
            <CheckCircle2 className={cn(isCompact ? 'h-3.5 w-3.5' : 'mr-1 h-3.5 w-3.5')} />
            {isCompact ? 'Fatto' : 'Completa'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'text-destructive hover:text-destructive',
              isCompact && 'h-7 flex-1 gap-1 px-2 text-[11px]'
            )}
            disabled={loading !== null}
            onClick={() => setConfirmAction('annulla')}
          >
            <XCircle className={cn(isCompact ? 'h-3.5 w-3.5' : 'mr-1 h-3.5 w-3.5')} />
            Annulla
          </Button>
        </div>
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
