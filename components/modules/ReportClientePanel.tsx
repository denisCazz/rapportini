'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import PageLoader from '@/components/ui/PageLoader';
import { FileText, Mail, Send } from 'lucide-react';
import { Rapportino } from '@/types';

type TipoDoc = 'rapportino' | 'preventivo';

interface Invio {
  id: string;
  tipo: TipoDoc;
  rapportinoId: string | null;
  preventivoId: string | null;
  email: string;
  stato: string;
  inviatoAt: string | null;
}

interface PreventivoLite {
  id: string;
  numero: string;
  titolo: string | null;
  cliente: string;
  clienteEmail?: string | null;
  totale: number;
}

export default function ReportClientePanel() {
  const [tipo, setTipo] = useState<TipoDoc>('rapportino');
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [preventivi, setPreventivi] = useState<PreventivoLite[]>([]);
  const [preventiviAvailable, setPreventiviAvailable] = useState(false);
  const [invii, setInvii] = useState<Invio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rapps, invRes, prevRes] = await Promise.all([
        api.getRapportini({ limit: 20 }),
        fetchWithAuth('/api/moduli/report-cliente'),
        fetchWithAuth('/api/moduli/preventivi').catch(() => null),
      ]);
      setRapportini(rapps);
      const invData = await parseResponseBody<{ data?: Invio[] }>(invRes);
      setInvii(invData?.data ?? []);
      if (prevRes && prevRes.ok) {
        const prevData = await parseResponseBody<{ data?: PreventivoLite[] }>(prevRes);
        setPreventivi(prevData?.data ?? []);
        setPreventiviAvailable(true);
      }
    } catch {
      toast.error('Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelectedId('');
    setEmail('');
  }, [tipo]);

  useEffect(() => {
    if (tipo === 'rapportino') {
      const r = rapportini.find((x) => x.id === selectedId);
      if (r?.cliente.email) setEmail(r.cliente.email);
    } else {
      const p = preventivi.find((x) => x.id === selectedId);
      if (p?.clienteEmail) setEmail(p.clienteEmail);
    }
  }, [selectedId, tipo, rapportini, preventivi]);

  const handleSend = async () => {
    if (!selectedId) {
      toast.error(`Seleziona un ${tipo}`);
      return;
    }
    setSending(true);
    try {
      const res = await fetchWithAuth('/api/moduli/report-cliente', {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          rapportinoId: tipo === 'rapportino' ? selectedId : undefined,
          preventivoId: tipo === 'preventivo' ? selectedId : undefined,
          email: email || undefined,
        }),
      });
      const data = await parseResponseBody<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || 'Invio fallito');
      toast.success('Documento inviato al cliente');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore invio');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5" aria-hidden />
            Invia documentazione
          </CardTitle>
          <CardDescription>Invia un rapportino o un preventivo via email al cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo di documento</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tipo === 'rapportino' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setTipo('rapportino')}
              >
                <FileText className="h-4 w-4" aria-hidden />
                Rapportino
              </Button>
              <Button
                type="button"
                variant={tipo === 'preventivo' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setTipo('preventivo')}
                disabled={!preventiviAvailable}
              >
                <FileText className="h-4 w-4" aria-hidden />
                Preventivo
              </Button>
            </div>
            {!preventiviAvailable && (
              <p className="text-xs text-muted-foreground">
                Attiva il modulo Preventivi per inviare anche i preventivi.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{tipo === 'rapportino' ? 'Rapportino' : 'Preventivo'}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Seleziona...</option>
              {tipo === 'rapportino'
                ? rapportini.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.cliente.nome} {r.cliente.cognome} — {r.intervento.data}
                    </option>
                  ))
                : preventivi.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.numero}
                      {p.titolo ? ` — ${p.titolo}` : ''}
                      {p.cliente ? ` · ${p.cliente}` : ''} (€{p.totale.toFixed(2)})
                    </option>
                  ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Email cliente</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.it" />
          </div>
          <Button className="gap-2" onClick={handleSend} disabled={sending}>
            <Mail className="h-4 w-4" aria-hidden />
            {sending ? 'Invio...' : 'Invia al cliente'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Storico invii</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invii.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun invio registrato.</p>
          ) : (
            invii.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{inv.email}</p>
                  <p className="text-muted-foreground">
                    {inv.stato} — {inv.inviatoAt ? new Date(inv.inviatoAt).toLocaleString('it-IT') : '—'}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 capitalize">
                  {inv.tipo}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
