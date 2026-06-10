'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { InterventoPianificato, TecnicoCaricoLavoro } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ErrorBanner from '@/components/ui/ErrorBanner';
import PageLoader from '@/components/ui/PageLoader';
import { ClipboardList, UserRound } from 'lucide-react';

function formatData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function InterventoCard({
  intervento,
  tecnici,
  onAssign,
  assigning,
}: {
  intervento: InterventoPianificato;
  tecnici: TecnicoCaricoLavoro[];
  onAssign: (interventoId: string, utenteId: string | null) => void;
  assigning: string | null;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{intervento.titolo}</p>
          <p className="text-xs text-muted-foreground">
            {formatData(intervento.dataPianificata)}
            {intervento.oraPianificata && ` alle ${intervento.oraPianificata}`}
          </p>
          {intervento.cliente && (
            <p className="mt-1 text-sm text-muted-foreground">
              {intervento.cliente.nome} {intervento.cliente.cognome} — {intervento.cliente.citta}
            </p>
          )}
          {intervento.descrizione && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{intervento.descrizione}</p>
          )}
        </div>
        <select
          value={intervento.tecnico?.id || ''}
          disabled={assigning === intervento.id}
          onChange={(e) => onAssign(intervento.id, e.target.value || null)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Non assegnato</option>
          {tecnici.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} {t.cognome}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function AssegnazioneLavori() {
  const [tecnici, setTecnici] = useState<TecnicoCaricoLavoro[]>([]);
  const [nonAssegnati, setNonAssegnati] = useState<InterventoPianificato[]>([]);
  const [totale, setTotale] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAssegnazioneLavori();
      setTecnici(data.tecnici);
      setNonAssegnati(data.nonAssegnati);
      setTotale(data.totaleInterventi);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (interventoId: string, utenteId: string | null) => {
    setAssigning(interventoId);
    try {
      await api.assegnaIntervento(interventoId, utenteId);
      toast.success(utenteId ? 'Lavoro assegnato' : 'Assegnazione rimossa');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'assegnazione');
    } finally {
      setAssigning(null);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Interventi futuri</CardDescription>
            <CardTitle className="text-2xl">{totale}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Non assegnati</CardDescription>
            <CardTitle className="text-2xl text-amber-600 dark:text-amber-400">{nonAssegnati.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tecnici attivi</CardDescription>
            <CardTitle className="text-2xl">{tecnici.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {nonAssegnati.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Lavori da assegnare
            </CardTitle>
            <CardDescription>
              Interventi pianificati senza tecnico assegnato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nonAssegnati.map((intervento) => (
              <InterventoCard
                key={intervento.id}
                intervento={intervento}
                tecnici={tecnici}
                onAssign={handleAssign}
                assigning={assigning}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {tecnici.map((tecnico) => (
          <Card key={tecnico.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserRound className="h-4 w-4" />
                  {tecnico.nome} {tecnico.cognome}
                </CardTitle>
                <Badge variant={tecnico.totale > 3 ? 'destructive' : 'secondary'}>
                  {tecnico.totale} {tecnico.totale === 1 ? 'lavoro' : 'lavori'}
                </Badge>
              </div>
              {tecnico.qualifica && (
                <CardDescription>{tecnico.qualifica}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {tecnico.interventi.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun intervento assegnato</p>
              ) : (
                tecnico.interventi.map((intervento) => (
                  <InterventoCard
                    key={intervento.id}
                    intervento={intervento}
                    tecnici={tecnici}
                    onAssign={handleAssign}
                    assigning={assigning}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {tecnici.length === 0 && nonAssegnati.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Nessun intervento pianificato.</p>
            <p className="mt-1 text-sm">
              Crea interventi dal modulo Pianificazione interventi per assegnarli ai tecnici.
            </p>
            <Button variant="outline" className="mt-4" onClick={loadData}>
              Aggiorna
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
