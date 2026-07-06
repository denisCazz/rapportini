'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  PlannerClienteDettaglio,
  PlannerClienteListItem,
  PlannerPercorso,
} from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ErrorBanner from '@/components/ui/ErrorBanner';
import PageLoader from '@/components/ui/PageLoader';
import {
  MapPin,
  Route,
  Users,
  Navigation,
  Sparkles,
  Phone,
  Mail,
  StickyNote,
  UserPlus,
  ExternalLink,
} from 'lucide-react';
import InterventoPianificatoActions from '@/components/modules/InterventoPianificatoActions';

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function PercorsiTab() {
  const [data, setData] = useState(() => toIsoDate(new Date()));
  const [utenteId, setUtenteId] = useState('');
  const [percorso, setPercorso] = useState<PlannerPercorso | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPercorso = useCallback(async (geocodifica = false) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getPlannerPercorso(data, utenteId || undefined, geocodifica);
      setPercorso(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [data, utenteId]);

  useEffect(() => {
    loadPercorso();
  }, [loadPercorso]);

  const handleOptimize = async () => {
    try {
      setOptimizing(true);
      const result = await api.optimizePlannerPercorso(data, utenteId || undefined);
      toast.success(`Percorso ottimizzato: ${result.orariAggiornati} interventi riordinati`);
      await loadPercorso(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'ottimizzazione');
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Pianificazione percorso
          </CardTitle>
          <CardDescription>
            Ottimizza l&apos;ordine delle tappe in base alla distanza dal deposito aziendale
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Data</label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-40" />
          </div>
          {percorso && percorso.tecnici.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tecnico</label>
              <select
                value={utenteId}
                onChange={(e) => setUtenteId(e.target.value)}
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Tutti (admin)</option>
                {percorso.tecnici.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} {t.cognome}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" onClick={() => loadPercorso(true)} disabled={loading}>
            Aggiorna
          </Button>
          <Button onClick={handleOptimize} disabled={optimizing || loading || !percorso?.percorso.stops.length}>
            <Sparkles className="mr-2 h-4 w-4" />
            {optimizing ? 'Ottimizzazione...' : 'Ottimizza percorso'}
          </Button>
        </CardContent>
      </Card>

      {error && <ErrorBanner message={error} />}
      {loading && <PageLoader />}

      {!loading && percorso && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{percorso.totaleInterventi}</p>
                <p className="text-sm text-muted-foreground">Interventi pianificati</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{percorso.percorso.distanzaTotaleKm} km</p>
                <p className="text-sm text-muted-foreground">Distanza stimata</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold">{percorso.percorso.durataStimataMin} min</p>
                <p className="text-sm text-muted-foreground">Durata stimata (viaggio + interventi)</p>
              </CardContent>
            </Card>
          </div>

          {percorso.senzaCoordinate > 0 && (
            <ErrorBanner
              message={`${percorso.senzaCoordinate} interventi senza coordinate: usa "Ottimizza percorso" per geocodificare gli indirizzi mancanti.`}
            />
          )}

          {percorso.percorso.stops.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <a
                href={percorso.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <Navigation className="mr-2 h-4 w-4" />
                Apri in Google Maps
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </div>
          )}

          <div className="space-y-3">
            {percorso.percorso.stops.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nessun intervento con indirizzo per questa data. Pianifica interventi dal modulo Pianificazione.
                </CardContent>
              </Card>
            ) : (
              percorso.percorso.stops.map((stop, index) => (
                <Card key={stop.interventoId}>
                  <CardContent className="flex flex-wrap items-start gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{stop.titolo}</p>
                        {stop.oraPianificata && <Badge variant="secondary">{stop.oraPianificata}</Badge>}
                      </div>
                      {stop.clienteNome && (
                        <p className="mt-1 text-sm text-foreground">{stop.clienteNome}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        <MapPin className="mr-1 inline h-3.5 w-3.5" />
                        {stop.indirizzo}, {stop.citta}
                      </p>
                      {stop.telefono && (
                        <a href={`tel:${stop.telefono}`} className="mt-1 inline-flex items-center text-sm text-primary">
                          <Phone className="mr-1 h-3.5 w-3.5" />
                          {stop.telefono}
                        </a>
                      )}
                    </div>
                    <InterventoPianificatoActions
                      interventoId={stop.interventoId}
                      stato="pianificato"
                      titolo={stop.titolo}
                      onUpdated={() => loadPercorso()}
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClienteDettaglio({
  cliente,
  onUpdated,
  onClose,
}: {
  cliente: PlannerClienteDettaglio;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [nota, setNota] = useState('');
  const [contatto, setContatto] = useState({ nome: '', ruolo: '', telefono: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleAddNota = async () => {
    if (!nota.trim()) return;
    try {
      setSaving(true);
      await api.addPlannerClienteNota(cliente.id, nota.trim());
      setNota('');
      toast.success('Nota aggiunta');
      onUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  const handleAddContatto = async () => {
    if (!contatto.nome.trim()) return;
    try {
      setSaving(true);
      await api.addPlannerClienteContatto(cliente.id, {
        nome: contatto.nome.trim(),
        ruolo: contatto.ruolo || undefined,
        telefono: contatto.telefono || undefined,
        email: contatto.email || undefined,
      });
      setContatto({ nome: '', ruolo: '', telefono: '', email: '' });
      toast.success('Contatto aggiunto');
      onUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>
            {cliente.nome} {cliente.cognome}
          </CardTitle>
          <CardDescription>
            {cliente.indirizzo}, {cliente.citta} {cliente.cap}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Chiudi
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <a href={`tel:${cliente.telefono}`} className="inline-flex items-center text-primary">
            <Phone className="mr-1 h-4 w-4" />
            {cliente.telefono}
          </a>
          {cliente.email && (
            <a href={`mailto:${cliente.email}`} className="inline-flex items-center text-primary">
              <Mail className="mr-1 h-4 w-4" />
              {cliente.email}
            </a>
          )}
          {cliente.lat != null && cliente.lng != null && (
            <Badge variant="outline">
              <MapPin className="mr-1 h-3 w-3" />
              Geocodificato
            </Badge>
          )}
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-2 font-medium">
            <Users className="h-4 w-4" />
            Contatti ({cliente.contatti.length})
          </h4>
          {cliente.contatti.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun contatto aggiuntivo</p>
          ) : (
            <ul className="space-y-2">
              {cliente.contatti.map((c) => (
                <li key={c.id} className="rounded-md border p-2 text-sm">
                  <span className="font-medium">{c.nome}</span>
                  {c.ruolo && <span className="text-muted-foreground"> — {c.ruolo}</span>}
                  {c.principale && <Badge className="ml-2" variant="secondary">Principale</Badge>}
                  <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground">
                    {c.telefono && <span>{c.telefono}</span>}
                    {c.email && <span>{c.email}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Nome contatto"
              value={contatto.nome}
              onChange={(e) => setContatto((p) => ({ ...p, nome: e.target.value }))}
            />
            <Input
              placeholder="Ruolo (es. coniuge)"
              value={contatto.ruolo}
              onChange={(e) => setContatto((p) => ({ ...p, ruolo: e.target.value }))}
            />
            <Input
              placeholder="Telefono"
              value={contatto.telefono}
              onChange={(e) => setContatto((p) => ({ ...p, telefono: e.target.value }))}
            />
            <Input
              placeholder="Email"
              value={contatto.email}
              onChange={(e) => setContatto((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <Button className="mt-2" size="sm" variant="outline" onClick={handleAddContatto} disabled={saving}>
            <UserPlus className="mr-2 h-4 w-4" />
            Aggiungi contatto
          </Button>
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-2 font-medium">
            <StickyNote className="h-4 w-4" />
            Note CRM
          </h4>
          {cliente.note.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna nota</p>
          ) : (
            <ul className="mb-3 space-y-2">
              {cliente.note.map((n) => (
                <li key={n.id} className="rounded-md bg-muted/50 p-2 text-sm">
                  <p>{n.testo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.createdAt ? formatData(n.createdAt.slice(0, 10)) : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Textarea
            placeholder="Aggiungi una nota sul cliente..."
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
          />
          <Button className="mt-2" size="sm" onClick={handleAddNota} disabled={saving || !nota.trim()}>
            Salva nota
          </Button>
        </div>

        {cliente.rapportini.length > 0 && (
          <div>
            <h4 className="mb-2 font-medium">Ultimi rapportini</h4>
            <ul className="space-y-1 text-sm">
              {cliente.rapportini.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href={`/rapportini/modifica/${r.id}`} className="text-primary hover:underline">
                    {formatData(r.dataIntervento)} — {r.tipoIntervento} ({r.marca} {r.modello})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContattiTab() {
  const [clienti, setClienti] = useState<PlannerClienteListItem[]>([]);
  const [selected, setSelected] = useState<PlannerClienteDettaglio | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClienti = useCallback(async (q?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPlannerClienti(q);
      setClienti(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadClienti(search || undefined), 300);
    return () => clearTimeout(timer);
  }, [search, loadClienti]);

  const openCliente = async (id: string) => {
    try {
      const dettaglio = await api.getPlannerCliente(id);
      setSelected(dettaglio);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore');
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const dettaglio = await api.getPlannerCliente(selected.id);
    setSelected(dettaglio);
    await loadClienti(search || undefined);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            CRM Contatti
          </CardTitle>
          <CardDescription>
            Gestisci contatti, note e storico interventi per ogni cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Cerca per nome, città, telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {error && <ErrorBanner message={error} />}
      {loading && <PageLoader />}

      {selected && (
        <ClienteDettaglio cliente={selected} onUpdated={refreshSelected} onClose={() => setSelected(null)} />
      )}

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clienti.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openCliente(c.id)}
            >
              <CardContent className="py-4">
                <p className="font-medium">
                  {c.nome} {c.cognome}
                </p>
                <p className="text-sm text-muted-foreground">{c.citta}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{c.indirizzo}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="secondary">{c.totaleRapportini} rapportini</Badge>
                  {c.totaleContatti > 0 && <Badge variant="outline">{c.totaleContatti} contatti</Badge>}
                  {c.totaleNote > 0 && <Badge variant="outline">{c.totaleNote} note</Badge>}
                  {!c.haCoordinate && <Badge variant="destructive">Senza coordinate</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && clienti.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nessun cliente trovato. I clienti vengono creati automaticamente dai rapportini.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PlannerPanel() {
  return (
    <Tabs defaultValue="percorsi" className="space-y-4">
      <TabsList>
        <TabsTrigger value="percorsi">
          <Route className="mr-2 h-4 w-4" />
          Percorsi
        </TabsTrigger>
        <TabsTrigger value="contatti">
          <Users className="mr-2 h-4 w-4" />
          Contatti CRM
        </TabsTrigger>
      </TabsList>
      <TabsContent value="percorsi">
        <PercorsiTab />
      </TabsContent>
      <TabsContent value="contatti">
        <ContattiTab />
      </TabsContent>
    </Tabs>
  );
}
