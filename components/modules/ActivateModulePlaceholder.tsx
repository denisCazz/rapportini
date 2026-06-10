'use client';

import { useState } from 'react';
import { Lock, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import {
  formatEarningsRange,
  getModuleEarningsEstimate,
  MODULE_MONTHLY_PRICE_EUR,
  MODULE_TRIAL_DAYS,
} from '@/lib/module-pricing';
import { PaidModuleDefinition } from '@/lib/modules';

interface ActivateModulePlaceholderProps {
  modulo: PaidModuleDefinition;
  stripeEnabled?: boolean;
  onActivated?: () => void;
}

export default function ActivateModulePlaceholder({
  modulo,
  stripeEnabled = true,
  onActivated,
}: ActivateModulePlaceholderProps) {
  const [loading, setLoading] = useState(false);
  const estimate = getModuleEarningsEstimate(modulo.code);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/modules/checkout', {
        method: 'POST',
        body: JSON.stringify({ module_code: modulo.code }),
      });
      const data = await parseResponseBody<{ data?: { url: string }; error?: string }>(response);

      if (!response.ok) {
        throw new Error(data?.error || 'Impossibile avviare il pagamento');
      }

      if (data?.data?.url) {
        window.location.href = data.data.url;
        return;
      }

      throw new Error('URL di pagamento non disponibile');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'attivazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <EmptyState
        icon={<Lock className="h-6 w-6 text-muted-foreground" aria-hidden />}
        title="Attiva modulo"
        description={`Il modulo "${modulo.nome}" non è ancora attivo per il tuo account.`}
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Guadagno stimato con questo modulo</p>
              <p className="text-2xl font-semibold text-primary">{formatEarningsRange(estimate)}/mese</p>
              <p className="text-sm text-muted-foreground">{estimate.rationale}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {MODULE_TRIAL_DAYS} giorni gratis, poi €{MODULE_MONTHLY_PRICE_EUR}/mese
              </p>
              <p className="text-muted-foreground">
                Attiva ora con Stripe: il primo mese è gratuito. Dopo la prova, l&apos;abbonamento
                si rinnova automaticamente a €{MODULE_MONTHLY_PRICE_EUR}/mese fino a disdetta.
              </p>
            </div>
          </div>

          {stripeEnabled ? (
            <Button className="w-full" onClick={handleActivate} disabled={loading}>
              {loading ? 'Reindirizzamento a Stripe...' : 'Attiva modulo — 1° mese gratis'}
            </Button>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-muted/50 p-3 text-center text-sm text-muted-foreground">
              Pagamenti in configurazione. Riprova tra poco o contatta il supporto.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
