'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import SidebarLayout from '@/components/SidebarLayout';
import PageLoader from '@/components/ui/PageLoader';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AziendaSettings } from '@/types';
import { ModuleCode } from '@/lib/modules';
import { formatCatLicensePrice } from '@/lib/cat-pricing';

interface ModuloCatalogo {
  id: string;
  code: ModuleCode;
  nome: string;
  descrizione: string | null;
}

interface TecnicoModuli {
  id: string;
  nome: string;
  cognome: string;
  username: string;
  attivo: boolean;
  moduli: Array<{
    code: ModuleCode;
    nome: string;
    attivo: boolean;
  }>;
}

interface CatModulesResponse {
  data?: {
    cat: { nome_azienda: string | null; partita_iva: string | null } | null;
    moduli: ModuloCatalogo[];
    tecnici: TecnicoModuli[];
    pricing: {
      operatorCount: number;
      monthlyPriceEur: number;
      basePriceEur: number;
      baseOperatorSlots: number;
      extraOperatorPriceEur: number;
    };
    subscription: {
      active: boolean;
      status: string | null;
      licensedOperatorSlots: number | null;
    };
    stripeEnabled: boolean;
  };
  error?: string;
}

function CatModuliPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [moduli, setModuli] = useState<ModuloCatalogo[]>([]);
  const [tecnici, setTecnici] = useState<TecnicoModuli[]>([]);
  const [pricingLabel, setPricingLabel] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [monthlyPriceEur, setMonthlyPriceEur] = useState(0);
  const [operatorCount, setOperatorCount] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!auth.isCatAdmin()) {
      router.push('/');
      return;
    }
    hasLoadedRef.current = true;
    setSettings(storage.getSettings());
    loadData();
    loadInviteLink();

    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('Pagamento avviato! I moduli saranno attivabili a breve.');
    } else if (checkout === 'cancel') {
      toast.message('Pagamento annullato');
    }
  }, [router, searchParams]);

  const loadInviteLink = async () => {
    try {
      const response = await fetchWithAuth('/api/cat/invite');
      const data = await parseResponseBody<{ data?: { invite_url?: string } }>(response);
      if (response.ok && data?.data?.invite_url) {
        setInviteUrl(data.data.invite_url);
      }
    } catch {
      // non bloccante
    }
  };

  const regenerateInviteLink = async () => {
    try {
      const response = await fetchWithAuth('/api/cat/invite', { method: 'POST' });
      const data = await parseResponseBody<{ data?: { invite_url?: string }; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nella rigenerazione');
      }
      if (data?.data?.invite_url) {
        setInviteUrl(data.data.invite_url);
        toast.success('Nuovo link invito generato');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nella rigenerazione');
    }
  };

  const copyInviteLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copiato negli appunti');
    } catch {
      toast.error('Impossibile copiare il link');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/cat/modules');
      const data = await parseResponseBody<CatModulesResponse>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel caricamento');
      }
      setModuli(data?.data?.moduli || []);
      setTecnici(data?.data?.tecnici || []);
      const count = data?.data?.pricing?.operatorCount ?? 0;
      const price = data?.data?.pricing?.monthlyPriceEur ?? 0;
      setPricingLabel(formatCatLicensePrice(count));
      setOperatorCount(count);
      setMonthlyPriceEur(price);
      setSubscriptionActive(Boolean(data?.data?.subscription?.active));
      setSubscriptionStatus(data?.data?.subscription?.status ?? null);
      setStripeEnabled(Boolean(data?.data?.stripeEnabled));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (utenteId: string, moduleCode: ModuleCode, attivo: boolean) => {
    const key = `${utenteId}:${moduleCode}`;
    setSavingKey(key);

    try {
      const response = await fetchWithAuth('/api/cat/modules', {
        method: 'PUT',
        body: JSON.stringify({
          utente_id: utenteId,
          module_code: moduleCode,
          attivo,
        }),
      });
      const data = await parseResponseBody<{ error?: string; pricing?: { operatorCount: number } }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel salvataggio');
      }

      setTecnici((prev) =>
        prev.map((tecnico) =>
          tecnico.id === utenteId
            ? {
                ...tecnico,
                moduli: tecnico.moduli.map((modulo) =>
                  modulo.code === moduleCode ? { ...modulo, attivo } : modulo
                ),
              }
            : tecnico
        )
      );

      if (data?.pricing) {
        setPricingLabel(formatCatLicensePrice(data.pricing.operatorCount));
      }

      toast.success(attivo ? 'Modulo attivato per l\'operatore' : 'Modulo disattivato');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setSavingKey(null);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await fetchWithAuth('/api/cat/modules/checkout', { method: 'POST' });
      const data = await parseResponseBody<{ data?: { url?: string }; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nell\'avvio del pagamento');
      }
      if (data?.data?.url) {
        window.location.href = data.data.url;
        return;
      }
      throw new Error('URL di pagamento non disponibile');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel pagamento');
      setCheckoutLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Moduli operatori"
      pageSubtitle="Attiva i moduli per i tecnici del tuo CAT"
      onLogout={handleLogout}
    >
      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadData} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Link invito operatori</CardTitle>
              <CardDescription>
                Condividi questo link con i tecnici: i dati del CAT verranno compilati automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm"
                placeholder="Link invito non disponibile"
              />
              <button
                type="button"
                onClick={copyInviteLink}
                disabled={!inviteUrl}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Copia link
              </button>
              <button
                type="button"
                onClick={regenerateInviteLink}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium"
              >
                Rigenera
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pacchetto licenza moduli</CardTitle>
              <CardDescription>
                {pricingLabel} — fino a 2 operatori inclusi a €30/mese, poi €5/mese per ogni operatore aggiuntivo.
                {subscriptionActive
                  ? ' Abbonamento attivo: puoi attivare i moduli per gli operatori.'
                  : ' Sottoscrivi il pacchetto per attivare i moduli.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {subscriptionActive ? (
                  <span className="font-medium text-primary">Abbonamento attivo</span>
                ) : subscriptionStatus ? (
                  <span>Stato pagamento: {subscriptionStatus}</span>
                ) : (
                  <span>Nessun abbonamento attivo</span>
                )}
                {operatorCount > 0 && (
                  <span className="block">Operatori attivi: {operatorCount} · €{monthlyPriceEur}/mese</span>
                )}
              </div>
              {stripeEnabled && operatorCount > 0 && (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {checkoutLoading
                    ? 'Reindirizzamento...'
                    : subscriptionActive
                      ? 'Aggiorna abbonamento su Stripe'
                      : 'Paga pacchetto con Stripe'}
                </button>
              )}
              {!stripeEnabled && (
                <p className="text-sm text-amber-600">Stripe non configurato — contatta il supporto.</p>
              )}
            </CardContent>
          </Card>

          {tecnici.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Nessun operatore</CardTitle>
                <CardDescription>
                  Gli operatori possono registrarsi con la Partita IVA del CAT oppure puoi crearli dalla gestione utenti.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            tecnici.map((tecnico) => (
              <Card key={tecnico.id}>
                <CardHeader>
                  <CardTitle>
                    {tecnico.nome} {tecnico.cognome}
                  </CardTitle>
                  <CardDescription>
                    @{tecnico.username}
                    {!tecnico.attivo && ' · Account disattivato'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Modulo</th>
                          <th className="pb-2 font-medium">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tecnico.moduli.map((modulo) => {
                          const key = `${tecnico.id}:${modulo.code}`;
                          const isSaving = savingKey === key;
                          return (
                            <tr key={modulo.code} className="border-b border-border last:border-0">
                              <td className="py-3 pr-4">
                                <p className="font-medium text-foreground">{modulo.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {moduli.find((m) => m.code === modulo.code)?.descrizione}
                                </p>
                              </td>
                              <td className="py-3">
                                <label className="inline-flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={modulo.attivo}
                                    disabled={isSaving || !tecnico.attivo || (!modulo.attivo && !subscriptionActive)}
                                    onChange={(e) =>
                                      handleToggle(tecnico.id, modulo.code, e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-border"
                                  />
                                  <span className={modulo.attivo ? 'text-primary' : 'text-muted-foreground'}>
                                    {isSaving ? 'Salvataggio...' : modulo.attivo ? 'Attivo' : 'Non attivo'}
                                  </span>
                                </label>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </SidebarLayout>
  );
}

export default function CatModuliPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CatModuliPageContent />
    </Suspense>
  );
}
