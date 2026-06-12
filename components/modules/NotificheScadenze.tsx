'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ScadenzaManutenzione, UrgenzaScadenza } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ErrorBanner from '@/components/ui/ErrorBanner';
import PageLoader from '@/components/ui/PageLoader';
import { AlertTriangle, Bell, Check, Clock, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILTRI = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'scaduti', label: 'Scaduti' },
  { value: 'urgenti', label: 'Urgenti (7 gg)' },
  { value: 'prossimi', label: 'Prossimi (30 gg)' },
  { value: 'non_notificati', label: 'Da notificare' },
] as const;

const URGENZA_CONFIG: Record<UrgenzaScadenza, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
  scaduto: { label: 'Scaduto', variant: 'destructive' },
  urgente: { label: 'Urgente', variant: 'destructive' },
  prossimo: { label: 'Prossimo', variant: 'default' },
  ok: { label: 'OK', variant: 'secondary' },
};

function formatData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function giorniLabel(giorni: number): string {
  if (giorni < 0) return `${Math.abs(giorni)} giorni fa`;
  if (giorni === 0) return 'Oggi';
  if (giorni === 1) return 'Domani';
  return `Tra ${giorni} giorni`;
}

export default function NotificheScadenze() {
  const [scadenze, setScadenze] = useState<ScadenzaManutenzione[]>([]);
  const [riepilogo, setRiepilogo] = useState({
    totale: 0,
    scaduti: 0,
    urgenti: 0,
    prossimi: 0,
    nonNotificati: 0,
  });
  const [filtro, setFiltro] = useState('tutti');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getScadenze(filtro);
      setScadenze(data.scadenze);
      setRiepilogo(data.riepilogo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSegnaNotificato = async (scadenza: ScadenzaManutenzione, inviaEmail = false) => {
    const key = `${scadenza.rapportinoId}:${scadenza.dataScadenza}`;
    setMarking(key);
    try {
      await api.segnaScadenzaNotificata(scadenza.rapportinoId, scadenza.dataScadenza, inviaEmail);
      toast.success(inviaEmail ? 'Email promemoria inviata' : 'Scadenza segnata come notificata');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      setMarking(null);
    }
  };

  if (loading && scadenze.length === 0) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={riepilogo.scaduti > 0 ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Scaduti
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">{riepilogo.scaduti}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Urgenti (7 gg)
            </CardDescription>
            <CardTitle className="text-2xl text-amber-600 dark:text-amber-400">{riepilogo.urgenti}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prossimi (30 gg)</CardDescription>
            <CardTitle className="text-2xl">{riepilogo.prossimi}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Bell className="h-3.5 w-3.5" />
              Da notificare
            </CardDescription>
            <CardTitle className="text-2xl">{riepilogo.nonNotificati}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTRI.map((f) => (
          <Button
            key={f.value}
            variant={filtro === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {scadenze.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p>Nessuna scadenza trovata con i filtri selezionati.</p>
            <p className="mt-1 text-sm">
              Le scadenze derivano dal campo &quot;Prossimo intervento&quot; nei rapportini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scadenze.map((scadenza) => {
            const config = URGENZA_CONFIG[scadenza.urgenza];
            const key = `${scadenza.rapportinoId}:${scadenza.dataScadenza}`;
            return (
              <Card
                key={key}
                className={cn(
                  scadenza.urgenza === 'scaduto' && 'border-destructive/40',
                  scadenza.urgenza === 'urgente' && 'border-amber-500/40'
                )}
              >
                <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {scadenza.cliente.nome} {scadenza.cliente.cognome}
                      </p>
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {scadenza.notificato && (
                        <Badge variant="outline" className="gap-1">
                          <Check className="h-3 w-3" />
                          Notificato
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {scadenza.stufa.marca} {scadenza.stufa.modello} ({scadenza.stufa.tipo})
                    </p>
                    <p className="text-sm">
                      Scadenza: <strong>{formatData(scadenza.dataScadenza)}</strong>
                      <span className="ml-2 text-muted-foreground">({giorniLabel(scadenza.giorniRimanenti)})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ultimo intervento: {formatData(scadenza.ultimoIntervento)} — Tecnico: {scadenza.operatore.nome} {scadenza.operatore.cognome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scadenza.cliente.citta} ·{' '}
                      <a href={`tel:${scadenza.cliente.telefono}`} className="inline-flex items-center gap-0.5 hover:underline">
                        <Phone className="h-3 w-3" />
                        {scadenza.cliente.telefono}
                      </a>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {!scadenza.notificato && scadenza.urgenza !== 'ok' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={marking === key}
                          onClick={() => handleSegnaNotificato(scadenza, true)}
                        >
                          <Mail className="h-3.5 w-3.5" aria-hidden />
                          {marking === key ? 'Invio...' : 'Invia email'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={marking === key}
                          onClick={() => handleSegnaNotificato(scadenza)}
                        >
                          Segna notificato
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" render={<Link href={`/rapportini/modifica/${scadenza.rapportinoId}`} />}>
                      Apri rapportino
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
