'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import ErrorBanner from '@/components/ui/ErrorBanner';
import PageLoader from '@/components/ui/PageLoader';
import {
  AlertTriangle,
  Package,
  Minus,
  Plus,
  ExternalLink,
  FilePlus,
  ShoppingCart,
  Search,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ricambixImageProxyUrl } from '@/lib/ricambixstufe-catalog';

const SHOP_URL = process.env.NEXT_PUBLIC_RICAMBI_SHOP_URL || 'https://www.ricambixstufe.it';

function shopOrderUrl(nome: string, codice?: string | null): string {
  const q = encodeURIComponent(codice || nome);
  return `${SHOP_URL}/?s=${q}`;
}

function usaNelRapportinoUrl(item: MagazzinoItem): string {
  const label = item.codice ? `${item.nome} (${item.codice})` : item.nome;
  return `/rapportini/nuovo?materiale=${encodeURIComponent(label)}`;
}

interface MagazzinoItem {
  id: string;
  nome: string;
  codice: string | null;
  giacenza: number;
  sogliaMinima: number;
  prezzoUnitario: number | null;
  sottoSoglia: boolean;
}

interface CatalogoProdotto {
  id: number;
  nome: string;
  slug: string;
  prezzo: number;
  categoria: string;
  categoriaSlug: string;
  immagine: string | null;
  giacenzaShop: number;
  url: string;
}

export default function MagazzinoRicambi() {
  const [items, setItems] = useState<MagazzinoItem[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [soglia, setSoglia] = useState('5');
  const [quantita, setQuantita] = useState('1');

  const [catalogoQuery, setCatalogoQuery] = useState('');
  const [catalogoItems, setCatalogoItems] = useState<CatalogoProdotto[]>([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  const [selectedProdotto, setSelectedProdotto] = useState<CatalogoProdotto | null>(null);
  const [saving, setSaving] = useState(false);
  const [movimentoId, setMovimentoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth('/api/moduli/magazzino');
      const data = await parseResponseBody<{
        data?: { items: MagazzinoItem[]; alertCount: number };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data?.error || 'Errore');
      setItems(data?.data?.items ?? []);
      setAlertCount(data?.data?.alertCount ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalogo = useCallback(async (query: string) => {
    try {
      setCatalogoLoading(true);
      setCatalogoError(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const res = await fetchWithAuth(`/api/moduli/magazzino/catalogo?${params}`);
      const data = await parseResponseBody<{
        data?: { items: CatalogoProdotto[] };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data?.error || 'Errore catalogo');
      setCatalogoItems(data?.data?.items ?? []);
    } catch (err: unknown) {
      setCatalogoError(err instanceof Error ? err.message : 'Errore catalogo');
      setCatalogoItems([]);
    } finally {
      setCatalogoLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showForm) return;
    const timer = setTimeout(() => loadCatalogo(catalogoQuery), 300);
    return () => clearTimeout(timer);
  }, [showForm, catalogoQuery, loadCatalogo]);

  const existingByCodice = useMemo(() => {
    const map = new Map<string, MagazzinoItem>();
    for (const item of items) {
      if (item.codice) map.set(item.codice, item);
    }
    return map;
  }, [items]);

  const resetForm = () => {
    setShowForm(false);
    setCatalogoQuery('');
    setSelectedProdotto(null);
    setQuantita('1');
    setSoglia('5');
    setCatalogoItems([]);
    setCatalogoError(null);
  };

  const movimento = async (id: string, tipo: 'carico' | 'scarico', qty = 1) => {
    try {
      setMovimentoId(id);
      const res = await fetchWithAuth(`/api/moduli/magazzino/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [tipo]: qty }),
      });
      const data = await parseResponseBody<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || 'Errore movimento');
      await load();
      toast.success(tipo === 'carico' ? `+${qty} pezzi` : `-${qty} pezzi`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore movimento');
    } finally {
      setMovimentoId(null);
    }
  };

  const handleAggiungiDalCatalogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdotto) {
      toast.error('Seleziona un ricambio dal catalogo');
      return;
    }

    const qty = Math.max(1, parseInt(quantita, 10) || 1);
    const codice = String(selectedProdotto.id);
    const existing = existingByCodice.get(codice);

    try {
      setSaving(true);
      if (existing) {
        const res = await fetchWithAuth(`/api/moduli/magazzino/${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ carico: qty }),
        });
        const data = await parseResponseBody<{ error?: string }>(res);
        if (!res.ok) throw new Error(data?.error || 'Errore');
        toast.success(`Aggiunti ${qty} pezzi a ${existing.nome}`);
      } else {
        const res = await fetchWithAuth('/api/moduli/magazzino', {
          method: 'POST',
          body: JSON.stringify({
            nome: selectedProdotto.nome,
            codice,
            descrizione: selectedProdotto.categoria,
            giacenza: qty,
            sogliaMinima: parseInt(soglia, 10) || 5,
            prezzoUnitario: selectedProdotto.prezzo,
          }),
        });
        const data = await parseResponseBody<{ error?: string }>(res);
        if (!res.ok) throw new Error(data?.error || 'Errore');
        toast.success('Ricambio aggiunto al magazzino');
      }
      resetForm();
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm text-muted-foreground">{items.length} ricambi</span>
          {alertCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {alertCount} sotto soglia
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={SHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            Catalogo Ricambi x Stufe
            <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </a>
          <Button onClick={() => (showForm ? resetForm() : setShowForm(true))}>
            {showForm ? 'Annulla' : 'Aggiungi dal catalogo'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aggiungi ricambio da RicambiXStufe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="catalogo-search">Cerca nel catalogo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="catalogo-search"
                  value={catalogoQuery}
                  onChange={(e) => {
                    setCatalogoQuery(e.target.value);
                    setSelectedProdotto(null);
                  }}
                  placeholder="Nome, categoria o codice prodotto..."
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {catalogoError && (
              <p className="text-sm text-destructive">{catalogoError}</p>
            )}

            <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
              {catalogoLoading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento catalogo...
                </div>
              ) : catalogoItems.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nessun prodotto trovato</p>
              ) : (
                catalogoItems.slice(0, 50).map((prodotto) => {
                  const codice = String(prodotto.id);
                  const inMagazzino = existingByCodice.get(codice);
                  const selected = selectedProdotto?.id === prodotto.id;
                  const imageSrc = ricambixImageProxyUrl(prodotto.immagine);
                  return (
                    <button
                      key={prodotto.id}
                      type="button"
                      onClick={() => setSelectedProdotto(prodotto)}
                      className={cn(
                        'flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50',
                        selected && 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                      )}
                    >
                      {imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageSrc}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded object-cover bg-muted"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-snug">{prodotto.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {prodotto.categoria} · Cod. {codice} · {prodotto.prezzo.toFixed(2)} €
                        </p>
                        {inMagazzino && (
                          <p className="text-xs text-primary mt-0.5">
                            Già in magazzino: {inMagazzino.giacenza} pz.
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {catalogoItems.length > 50 && (
              <p className="text-xs text-muted-foreground">
                Mostrati i primi 50 risultati. Affina la ricerca per trovare altri prodotti.
              </p>
            )}

            <form onSubmit={handleAggiungiDalCatalogo} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Quantità da aggiungere</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantita}
                  onChange={(e) => setQuantita(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Soglia minima</Label>
                <Input
                  type="number"
                  min={0}
                  value={soglia}
                  onChange={(e) => setSoglia(e.target.value)}
                  disabled={!!selectedProdotto && existingByCodice.has(String(selectedProdotto.id))}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={!selectedProdotto || saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    'Aggiungi pezzi'
                  )}
                </Button>
              </div>
            </form>

            {selectedProdotto && (
              <p className="text-xs text-muted-foreground">
                Selezionato: {selectedProdotto.nome}.{' '}
                <a
                  href={selectedProdotto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Scheda su RicambiXStufe
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className={item.sottoSoglia ? 'border-destructive/50' : ''}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.nome}</p>
                  {item.codice && (
                    <p className="text-xs text-muted-foreground">Cod. {item.codice}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Soglia minima: {item.sogliaMinima}
                    {item.prezzoUnitario != null && (
                      <> · {item.prezzoUnitario.toFixed(2)} €/pz.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <span className="text-sm font-medium">Giacenza</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => movimento(item.id, 'scarico')}
                    disabled={item.giacenza <= 0 || movimentoId === item.id}
                    title="Togli 1 pezzo"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span
                    className={cn(
                      'min-w-[2.5rem] text-center text-lg font-semibold tabular-nums',
                      item.sottoSoglia && 'text-destructive'
                    )}
                  >
                    {movimentoId === item.id ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : (
                      item.giacenza
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => movimento(item.id, 'carico')}
                    disabled={movimentoId === item.id}
                    title="Aggiungi 1 pezzo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {item.sottoSoglia && (
                  <a
                    href={shopOrderUrl(item.nome, item.codice)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1.5')}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
                    Ordina
                  </a>
                )}
                <Link
                  href={usaNelRapportinoUrl(item)}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
                >
                  <FilePlus className="h-3.5 w-3.5" aria-hidden />
                  Usa nel rapportino
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nessun ricambio in magazzino. Usa &quot;Aggiungi dal catalogo&quot; per importare i pezzi da
            RicambiXStufe.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
