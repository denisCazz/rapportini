'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { AlertTriangle, Package, Minus, ExternalLink, FilePlus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

export default function MagazzinoRicambi() {
  const [items, setItems] = useState<MagazzinoItem[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [giacenza, setGiacenza] = useState('0');
  const [soglia, setSoglia] = useState('5');

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

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/moduli/magazzino', {
        method: 'POST',
        body: JSON.stringify({
          nome,
          giacenza: parseInt(giacenza, 10) || 0,
          sogliaMinima: parseInt(soglia, 10) || 5,
        }),
      });
      const data = await parseResponseBody<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || 'Errore');
      toast.success('Ricambio aggiunto');
      setShowForm(false);
      setNome('');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    }
  };

  const scarico = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/moduli/magazzino/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scarico: 1 }),
      });
      if (!res.ok) throw new Error('Errore scarico');
      load();
    } catch {
      toast.error('Errore scarico');
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
            Ordina su Ricambi x Stufe
            <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </a>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Annulla' : 'Nuovo ricambio'}</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuovo ricambio</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-3">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Giacenza</Label>
                <Input type="number" min={0} value={giacenza} onChange={(e) => setGiacenza(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Soglia minima</Label>
                <Input type="number" min={0} value={soglia} onChange={(e) => setSoglia(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="submit">Salva</Button>
              </div>
            </form>
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
                    Giacenza: {item.giacenza} / soglia {item.sogliaMinima}
                  </p>
                </div>
                <Button variant="outline" size="icon" onClick={() => scarico(item.id)} title="Scarica 1">
                  <Minus className="h-4 w-4" />
                </Button>
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
    </div>
  );
}
