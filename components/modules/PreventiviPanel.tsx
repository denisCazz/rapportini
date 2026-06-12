'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import PageLoader from '@/components/ui/PageLoader';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { FileText, List, Plus, Trash2 } from 'lucide-react';

interface PreventivoRiga {
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  tipo: 'materiale' | 'manodopera';
}

interface Preventivo {
  id: string;
  numero: string;
  stato: string;
  totale: number;
  titolo: string | null;
  cliente: string;
  rapportinoId: string | null;
}

const STATO_LABEL: Record<string, string> = {
  bozza: 'Bozza',
  inviato: 'Inviato',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
};

function emptyRiga(): PreventivoRiga {
  return { descrizione: '', quantita: 1, prezzoUnitario: 0, tipo: 'materiale' };
}

export default function PreventiviPanel() {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [saving, setSaving] = useState(false);

  // form state
  const [titolo, setTitolo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienti, setClienti] = useState<Array<{ id: string; nome: string; cognome: string; email?: string }>>([]);
  const [validoFino, setValidoFino] = useState('');
  const [note, setNote] = useState('');
  const [righe, setRighe] = useState<PreventivoRiga[]>([emptyRiga()]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithAuth('/api/moduli/preventivi');
      const data = await parseResponseBody<{ data?: Preventivo[]; error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || 'Errore');
      setPreventivi(data?.data ?? []);
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
    if (clienteSearch.length < 2 || clienteId) {
      setClienti([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clienti/search?q=${encodeURIComponent(clienteSearch)}`);
      if (res.ok) setClienti(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [clienteSearch, clienteId]);

  const totale = useMemo(
    () => righe.reduce((sum, r) => sum + (r.quantita || 0) * (r.prezzoUnitario || 0), 0),
    [righe]
  );

  const resetForm = () => {
    setTitolo('');
    setClienteId('');
    setClienteSearch('');
    setClienteEmail('');
    setClienti([]);
    setValidoFino('');
    setNote('');
    setRighe([emptyRiga()]);
  };

  const updateRiga = (idx: number, patch: Partial<PreventivoRiga>) => {
    setRighe((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/moduli/preventivi', {
        method: 'POST',
        body: JSON.stringify({
          titolo: titolo || null,
          clienteId: clienteId || null,
          clienteNome: !clienteId ? clienteSearch || null : null,
          clienteEmail: clienteEmail || null,
          validoFino: validoFino || null,
          note: note || null,
          righe: righe.map((r) => ({
            descrizione: r.descrizione || null,
            quantita: r.quantita || 1,
            prezzoUnitario: r.prezzoUnitario || 0,
            tipo: r.tipo,
          })),
        }),
      });
      const data = await parseResponseBody<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || 'Errore');
      toast.success('Preventivo creato');
      resetForm();
      setView('list');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  const accetta = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/moduli/preventivi/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stato: 'accettato' }),
      });
      const data = await parseResponseBody<{ data?: { rapportinoId?: string }; error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || 'Errore');
      toast.success('Preventivo accettato e rapportino creato');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Nuovo preventivo</h2>
          <Button variant="outline" onClick={() => setView('list')} className="gap-2">
            <List className="h-4 w-4" aria-hidden />
            Storico preventivi
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="grid gap-5">
              <p className="text-xs text-muted-foreground">
                Nessun campo è obbligatorio: compila solo ciò che ti serve.
              </p>

              <div className="space-y-1">
                <Label>Titolo / oggetto</Label>
                <Input
                  value={titolo}
                  onChange={(e) => setTitolo(e.target.value)}
                  placeholder="Es. Manutenzione stagionale stufa a pellet"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Cliente</Label>
                  <Input
                    value={clienteSearch}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      setClienteId('');
                    }}
                    placeholder="Cerca o scrivi un nome..."
                  />
                  {clienti.length > 0 && (
                    <ul className="rounded-md border">
                      {clienti.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setClienteId(c.id);
                              setClienteSearch(`${c.nome} ${c.cognome}`);
                              if (c.email) setClienteEmail(c.email);
                              setClienti([]);
                            }}
                          >
                            {c.nome} {c.cognome}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Email cliente</Label>
                  <Input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    placeholder="cliente@email.it"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Voci del preventivo</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setRighe((prev) => [...prev, emptyRiga()])}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Aggiungi voce
                  </Button>
                </div>
                <div className="space-y-2">
                  {righe.map((r, idx) => (
                    <div
                      key={idx}
                      className="grid items-end gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Descrizione</Label>
                        <Input
                          value={r.descrizione}
                          onChange={(e) => updateRiga(idx, { descrizione: e.target.value })}
                          placeholder="Es. Guarnizione portello"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <select
                          value={r.tipo}
                          onChange={(e) =>
                            updateRiga(idx, { tipo: e.target.value as PreventivoRiga['tipo'] })
                          }
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="materiale">Materiale</option>
                          <option value="manodopera">Manodopera</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Q.tà</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-20"
                          value={r.quantita}
                          onChange={(e) =>
                            updateRiga(idx, { quantita: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Prezzo €</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24"
                          value={r.prezzoUnitario}
                          onChange={(e) =>
                            updateRiga(idx, { prezzoUnitario: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={righe.length === 1}
                        onClick={() => setRighe((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label="Rimuovi voce"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end text-sm font-semibold">
                  Totale: €{totale.toFixed(2)}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Valido fino al</Label>
                  <Input
                    type="date"
                    value={validoFino}
                    onChange={(e) => setValidoFino(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Note</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Condizioni, tempistiche, esclusioni..."
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvataggio…' : 'Crea preventivo'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setView('list')}>
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Storico preventivi</h2>
        <Button
          onClick={() => {
            resetForm();
            setView('form');
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nuovo preventivo
        </Button>
      </div>

      {preventivi.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nessun preventivo. Crea il primo con &quot;Nuovo preventivo&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {preventivi.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.numero}
                      {p.titolo ? ` — ${p.titolo}` : ''}
                      {p.cliente ? ` · ${p.cliente}` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">€{p.totale.toFixed(2)}</p>
                  </div>
                  <Badge variant="outline">{STATO_LABEL[p.stato] ?? p.stato}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {p.stato !== 'accettato' && !p.rapportinoId && (
                    <Button size="sm" onClick={() => accetta(p.id)}>
                      Accetta → Rapportino
                    </Button>
                  )}
                  {p.rapportinoId && (
                    <a
                      href={`/rapportini/modifica/${p.rapportinoId}`}
                      className="text-sm text-primary underline"
                    >
                      Apri rapportino
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
