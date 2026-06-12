'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageLoader from '@/components/ui/PageLoader';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import { useSettings } from '@/lib/useSettings';
import { CreditCard, Package } from 'lucide-react';
import { MODULE_TRIAL_DAYS } from '@/lib/module-pricing';

interface BillingSummary {
  hasBundle: boolean;
  bundleStatus: string | null;
  bundleTrialEndsAt: string | null;
  stripeCustomerId: string | null;
  modules: Array<{
    code: string;
    nome: string;
    attivo: boolean;
    subscriptionStatus: string | null;
    trialEndsAt: string | null;
  }>;
}

export default function AbbonamentoContent() {
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth('/api/billing/portal');
      const data = await parseResponseBody<{
        data?: BillingSummary;
        stripeEnabled?: boolean;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data?.error || 'Errore caricamento');
      setSummary(data?.data ?? null);
      setStripeEnabled(Boolean(data?.stripeEnabled));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success(`Abbonamento attivato! Hai ${MODULE_TRIAL_DAYS} giorni di prova gratuita.`);
    }
  }, [searchParams]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetchWithAuth('/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ returnPath: '/utente/abbonamento' }),
      });
      const data = await parseResponseBody<{ data?: { url: string }; error?: string }>(res);
      if (!res.ok || !data?.data?.url) {
        throw new Error(data?.error || 'Portale non disponibile');
      }
      window.location.href = data.data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore portale');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <SidebarLayout settings={settings} pageTitle="Abbonamento" pageSubtitle="Moduli e fatturazione">
      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          {summary?.hasBundle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" aria-hidden />
                  Bundle tutti i moduli
                </CardTitle>
                <CardDescription>Stato abbonamento completo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={summary.bundleStatus === 'active' || summary.bundleStatus === 'trialing' ? 'default' : 'secondary'}>
                  {summary.bundleStatus || '—'}
                </Badge>
                {summary.bundleTrialEndsAt && (
                  <p className="text-sm text-muted-foreground">
                    Fine prova: {new Date(summary.bundleTrialEndsAt).toLocaleDateString('it-IT')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Moduli</CardTitle>
              <CardDescription>Stato attivazione per modulo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary?.modules.length ? (
                summary.modules.map((m) => (
                  <div key={m.code} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{m.nome}</p>
                      {m.trialEndsAt && (
                        <p className="text-xs text-muted-foreground">
                          Prova fino al {new Date(m.trialEndsAt).toLocaleDateString('it-IT')}
                        </p>
                      )}
                    </div>
                    <Badge variant={m.attivo ? 'default' : 'outline'}>
                      {m.attivo ? m.subscriptionStatus || 'attivo' : 'non attivo'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nessun modulo sottoscritto.</p>
              )}
            </CardContent>
          </Card>

          {stripeEnabled && summary?.stripeCustomerId && (
            <Button className="gap-2" onClick={openPortal} disabled={portalLoading}>
              <CreditCard className="h-4 w-4" aria-hidden />
              {portalLoading ? 'Apertura portale...' : 'Gestisci abbonamento e fatture'}
            </Button>
          )}
        </div>
      )}
    </SidebarLayout>
  );
}
