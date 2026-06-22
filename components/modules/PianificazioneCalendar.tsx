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
import { formatDateOnlyLocal } from '@/lib/time-db';
import InterventoPianificatoActions from '@/components/modules/InterventoPianificatoActions';

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const TIPO_COLORI: Record<string, string> = {
  pianificato: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:text-blue-100 dark:border-blue-800',
  rapportino: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-950/50 dark:text-green-100 dark:border-green-800',
  manutenzione: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-800',
};

const TIPO_ACCENT: Record<string, string> = {
  pianificato: 'border-l-blue-500',
  rapportino: 'border-l-green-500',
  manutenzione: 'border-l-amber-500',
};

const TIPO_LABEL: Record<string, string> = {
  pianificato: 'Pianificato',
  rapportino: 'Rapportino',
  manutenzione: 'Manutenzione',
};

function toIsoDate(d: Date): string {
  return formatDateOnlyLocal(d);
}

function dayForDayView(weekStart: Date, weekEndDate: Date): Date {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const startIso = toIsoDate(weekStart);
  const endIso = toIsoDate(weekEndDate);
  if (todayIso >= startIso && todayIso <= endIso) return today;
  return new Date(weekStart);
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

type ViewMode = 'week' | 'day' | 'month';

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function detectOverlaps(eventi: EventoCalendario[]): Set<string> {
  const overlaps = new Set<string>();
  const byTecnicoData: Record<string, EventoCalendario[]> = {};
  for (const ev of eventi) {
    if (ev.tipo !== 'pianificato' || !ev.tecnico) continue;
    const key = `${ev.tecnico}:${ev.data}`;
    if (!byTecnicoData[key]) byTecnicoData[key] = [];
    byTecnicoData[key].push(ev);
  }
  for (const group of Object.values(byTecnicoData)) {
    if (group.length > 1) group.forEach((ev) => overlaps.add(ev.id));
  }
  return overlaps;
}

export default function PianificazioneCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
  const [currentDay, setCurrentDay] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [draggingId, setDraggingId] = useState<string | null>(null);
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

  const range = useMemo(() => {
    if (viewMode === 'day') {
      const iso = toIsoDate(currentDay);
      return { inizio: iso, fine: iso };
    }
    if (viewMode === 'month') {
      const first = startOfMonth(currentMonth);
      const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      return { inizio: toIsoDate(first), fine: toIsoDate(last) };
    }
    return { inizio: toIsoDate(currentWeek), fine: toIsoDate(weekEnd) };
  }, [viewMode, currentDay, currentMonth, currentWeek, weekEnd]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getPianificazione(range.inizio, range.fine);
      setEventi(result.eventi);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [range.inizio, range.fine]);

  const overlapIds = useMemo(() => detectOverlaps(eventi), [eventi]);

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
    for (const ev of eventi) {
      if (!map[ev.data]) map[ev.data] = [];
      map[ev.data].push(ev);
    }
    return map;
  }, [eventi]);

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

  const handleDropOnDay = async (iso: string, interventoId: string) => {
    try {
      await api.updateInterventoPianificato(interventoId, { dataPianificata: iso });
      toast.success('Intervento spostato');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore spostamento');
    } finally {
      setDraggingId(null);
    }
  };

  if (loading && eventi.length === 0) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => {
                  if (mode === 'day' && viewMode === 'week') {
                    setCurrentDay(dayForDayView(currentWeek, weekEnd));
                  } else if (mode === 'day' && viewMode === 'month') {
                    setCurrentDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
                  }
                  setViewMode(mode);
                }}
              >
                {mode === 'day' ? 'Giorno' : mode === 'week' ? 'Settimana' : 'Mese'}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (viewMode === 'day') setCurrentDay(addDays(currentDay, -1));
              else if (viewMode === 'month') setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
              else setCurrentWeek(addDays(currentWeek, -7));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {viewMode === 'day' && formatDataIt(toIsoDate(currentDay))}
            {viewMode === 'week' && `${formatDataIt(toIsoDate(currentWeek))} – ${formatDataIt(toIsoDate(weekEnd))}`}
            {viewMode === 'month' && currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (viewMode === 'day') setCurrentDay(addDays(currentDay, 1));
              else if (viewMode === 'month') setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
              else setCurrentWeek(addDays(currentWeek, 7));
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCurrentDay(now);
              setCurrentWeek(startOfWeek(now));
              setCurrentMonth(startOfMonth(now));
            }}
          >
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

      {viewMode === 'month' ? (
        <div className="grid grid-cols-7 gap-1">
          {GIORNI.map((g) => (
            <p key={g} className="text-center text-xs font-medium text-muted-foreground py-1">{g}</p>
          ))}
          {Array.from({ length: daysInMonth(currentMonth) }, (_, i) => {
            const day = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
            const iso = toIsoDate(day);
            const count = (eventiPerGiorno[iso] || []).length;
            return (
              <button
                key={iso}
                type="button"
                className={cn(
                  'min-h-16 rounded-md border p-1 text-left text-xs hover:bg-muted',
                  iso === toIsoDate(new Date()) && 'ring-2 ring-primary/40'
                )}
                onClick={() => {
                  setCurrentDay(day);
                  setViewMode('day');
                }}
              >
                <span className="font-semibold">{i + 1}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="mt-1 h-5 px-1 text-[10px]">{count}</Badge>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-3',
            viewMode === 'week' && 'grid-cols-1 sm:grid-cols-7 sm:gap-2 lg:gap-3',
            viewMode === 'day' && 'grid-cols-1'
          )}
        >
          {(viewMode === 'day' ? [currentDay] : weekDays).map((day, i) => {
            const iso = toIsoDate(day);
            const isToday = iso === toIsoDate(new Date());
            const dayEvents = eventiPerGiorno[iso] || [];
            const isWeekView = viewMode === 'week';
            return (
              <Card
                key={iso}
                className={cn(
                  'flex min-w-0 flex-col',
                  isToday && 'ring-2 ring-primary/40',
                  isWeekView && 'sm:min-h-[200px] sm:shadow-sm'
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('interventoId');
                  if (id) handleDropOnDay(iso, id);
                }}
              >
                <CardHeader
                  className={cn(
                    'shrink-0 p-3 pb-2',
                    isWeekView && 'sm:p-2.5 sm:pb-1.5 sm:text-center sm:cursor-pointer sm:hover:bg-muted/50'
                  )}
                  onClick={
                    isWeekView
                      ? () => {
                          setCurrentDay(day);
                          setViewMode('day');
                        }
                      : undefined
                  }
                >
                  {isWeekView && (
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                      {GIORNI[i]}
                    </p>
                  )}
                  <p
                    className={cn(
                      'text-lg font-semibold leading-none',
                      isToday && 'text-primary',
                      isWeekView && 'sm:text-base'
                    )}
                  >
                    {day.getDate()}
                  </p>
                </CardHeader>
                <CardContent
                  className={cn(
                    'flex min-h-0 flex-1 flex-col gap-2 p-3 pt-0',
                    isWeekView && 'sm:gap-1.5 sm:p-2 sm:pt-0'
                  )}
                >
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground sm:text-center">—</p>
                  ) : (
                    dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        draggable={Boolean(ev.interventoId)}
                        onDragStart={(e) => {
                          if (!ev.interventoId) return;
                          e.dataTransfer.setData('interventoId', ev.interventoId);
                          setDraggingId(ev.interventoId);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        className={cn(
                          'rounded-md border border-l-[3px] bg-card px-2 py-2 shadow-sm',
                          'sm:px-2.5 sm:py-2',
                          TIPO_COLORI[ev.tipo],
                          TIPO_ACCENT[ev.tipo],
                          ev.interventoId && 'cursor-grab active:cursor-grabbing',
                          overlapIds.has(ev.id) && 'ring-2 ring-destructive/50',
                          draggingId === ev.interventoId && 'opacity-50'
                        )}
                      >
                        <div className="space-y-0.5">
                          {ev.ora && (
                            <p className="text-[10px] font-medium tabular-nums leading-none opacity-70">
                              {ev.ora}
                            </p>
                          )}
                          <p className="text-xs font-semibold leading-snug break-words sm:text-[13px]">
                            {ev.titolo}
                          </p>
                        </div>

                        {overlapIds.has(ev.id) && (
                          <p className="mt-0.5 text-[10px] font-medium text-destructive">
                            Sovrapposizione
                          </p>
                        )}

                        {ev.cliente && (
                          <p className="mt-0.5 truncate text-[11px] opacity-80">{ev.cliente}</p>
                        )}
                        {ev.tecnico && (
                          <p className="truncate text-[10px] opacity-60">{ev.tecnico}</p>
                        )}

                        {ev.tipo === 'pianificato' && ev.interventoId && (
                          <InterventoPianificatoActions
                            interventoId={ev.interventoId}
                            stato={ev.stato}
                            titolo={ev.titolo}
                            variant="calendar"
                            onUpdated={loadData}
                          />
                        )}
                        {ev.rapportinoId && (
                          <Link
                            href={`/rapportini/modifica/${ev.rapportinoId}`}
                            className="mt-1 inline-block text-[11px] font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
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
      )}

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
