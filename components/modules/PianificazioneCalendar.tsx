'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { EventoCalendario } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import ErrorBanner from '@/components/ui/ErrorBanner';
import PageLoader from '@/components/ui/PageLoader';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const TIPO_COLORI: Record<string, string> = {
  pianificato: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  rapportino: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
  manutenzione: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
};

const TIPO_LABEL: Record<string, string> = {
  pianificato: 'Pianificato',
  rapportino: 'Rapportino',
  manutenzione: 'Manutenzione',
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function formatDataIt(iso: string): string {
  const [y, m, day] = iso.split('-');
  return `${day}/${m}/${y}`;
}

export default function PianificazioneCalendar() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
  const [eventi, setEventi] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tecnici, setTecnici] = useState<Array<{ id: string; nome: string; cognome: string }>>([]);
  const [clientiSearch, setClientiSearch] = useState('');
  const [clientiResults, setClientiResults] = useState<Array<{ id: string; nome: string; cognome: string; citta: string }>>([]);
  const [form, setForm] = useState({
    titolo: '',
    descrizione: '',
    dataPianificata: toIsoDate(new Date()),
    oraPianificata: '09:00',
    clienteId: '',
    clienteLabel: '',
    utenteId: '',
  });

  const weekEnd = useMemo(() => addDays(currentWeek, 6), [currentWeek]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i)),
    [currentWeek]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getPianificazione(toIsoDate(currentWeek), toIsoDate(weekEnd));
      setEventi(result.eventi);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [currentWeek, weekEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    api.getTecniciModulo().then(setTecnici).catch(() => {});
  }, []);

  useEffect(() => {
    if (clientiSearch.length < 2) {
      setClientiResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clienti/search?q=${encodeURIComponent(clientiSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setClientiResults(data);
        }
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientiSearch]);

  const eventiPerGiorno = useMemo(() => {
    const map: Record<string, EventoCalendario[]> = {};
    for (const day of weekDays) {
      map[toIsoDate(day)] = [];
    }
    for (const ev of eventi) {
      if (map[ev.data]) {
        map[ev.data].push(ev);
      }
    }
    return map;
  }, [eventi, weekDays]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titolo.trim()) {
      toast.error('Il titolo è obbligatorio');
      return;
    }
    try {
      setSaving(true);
      await api.createInterventoPianificato({
        titolo: form.titolo.trim(),
        descrizione: form.descrizione.trim() || undefined,
        dataPianificata: form.dataPianificata,
        oraPianificata: form.oraPianificata || undefined,
        clienteId: form.clienteId || undefined,
        utenteId: form.utenteId || undefined,
      });
      toast.success('Intervento pianificato');
      setShowForm(false);
      setForm({
        titolo: '',
        descrizione: '',
        dataPianificata: toIsoDate(new Date()),
        oraPianificata: '09:00',
        clienteId: '',
        clienteLabel: '',
        utenteId: '',
      });
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleta = async (interventoId: string) => {
    try {
      await api.updateInterventoPianificato(interventoId, { stato: 'completato' });
      toast.success('Intervento completato');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    }
  };

  const handleAnnulla = async (interventoId: string) => {
    try {
      await api.deleteInterventoPianificato(interventoId);
      toast.success('Intervento annullato');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    }
  };

  if (loading && eventi.length === 0) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {formatDataIt(toIsoDate(currentWeek))} – {formatDataIt(toIsoDate(weekEnd))}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(startOfWeek(new Date()))}>
            Oggi
          </Button>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Annulla' : 'Nuovo intervento'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pianifica nuovo intervento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="titolo">Titolo *</Label>
                <Input
                  id="titolo"
                  value={form.titolo}
                  onChange={(e) => setForm((f) => ({ ...f, titolo: e.target.value }))}
                  placeholder="Es. Manutenzione annuale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={form.dataPianificata}
                  onChange={(e) => setForm((f) => ({ ...f, dataPianificata: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ora">Ora</Label>
                <Input
                  id="ora"
                  type="time"
                  value={form.oraPianificata}
                  onChange={(e) => setForm((f) => ({ ...f, oraPianificata: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cliente">Cliente</Label>
                {form.clienteId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{form.clienteLabel}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((f) => ({ ...f, clienteId: '', clienteLabel: '' }))}
                    >
                      Rimuovi
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      id="cliente"
                      value={clientiSearch}
                      onChange={(e) => setClientiSearch(e.target.value)}
                      placeholder="Cerca per nome..."
                    />
                    {clientiResults.length > 0 && (
                      <ul className="rounded-md border border-border">
                        {clientiResults.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setForm((f) => ({
                                  ...f,
                                  clienteId: c.id,
                                  clienteLabel: `${c.nome} ${c.cognome} — ${c.citta}`,
                                }));
                                setClientiSearch('');
                                setClientiResults([]);
                              }}
                            >
                              {c.nome} {c.cognome} — {c.citta}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tecnico">Tecnico assegnato</Label>
                <select
                  id="tecnico"
                  value={form.utenteId}
                  onChange={(e) => setForm((f) => ({ ...f, utenteId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Nessuno</option>
                  {tecnici.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} {t.cognome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="descrizione">Note</Label>
                <Textarea
                  id="descrizione"
                  value={form.descrizione}
                  onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvataggio...' : 'Salva intervento'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
        {weekDays.map((day, i) => {
          const iso = toIsoDate(day);
          const isToday = iso === toIsoDate(new Date());
          const dayEvents = eventiPerGiorno[iso] || [];
          return (
            <Card key={iso} className={cn(isToday && 'ring-2 ring-primary/40')}>
              <CardHeader className="p-3 pb-1">
                <p className="text-xs font-medium text-muted-foreground">{GIORNI[i]}</p>
                <p className={cn('text-lg font-semibold', isToday && 'text-primary')}>
                  {day.getDate()}
                </p>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-1">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nessun evento</p>
                ) : (
                  dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={cn('rounded-md border px-2 py-1.5 text-xs', TIPO_COLORI[ev.tipo])}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate">{ev.titolo}</span>
                        {ev.ora && <span className="shrink-0 opacity-70">{ev.ora}</span>}
                      </div>
                      {ev.cliente && <p className="truncate opacity-80">{ev.cliente}</p>}
                      {ev.tipo === 'pianificato' && ev.interventoId && (
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            className="underline opacity-70 hover:opacity-100"
                            onClick={() => handleCompleta(ev.interventoId!)}
                          >
                            Completa
                          </button>
                          <button
                            type="button"
                            className="underline opacity-70 hover:opacity-100"
                            onClick={() => handleAnnulla(ev.interventoId!)}
                          >
                            Annulla
                          </button>
                        </div>
                      )}
                      {ev.rapportinoId && (
                        <Link
                          href={`/rapportini/modifica/${ev.rapportinoId}`}
                          className="mt-0.5 block underline opacity-70 hover:opacity-100"
                        >
                          Apri rapportino
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(TIPO_LABEL).map(([tipo, label]) => (
          <div key={tipo} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('inline-block h-3 w-3 rounded-sm border', TIPO_COLORI[tipo])} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
