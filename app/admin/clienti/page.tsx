'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Users,
  FileText,
  MapPin,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Flame,
  TreePine,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBanner from '@/components/ui/ErrorBanner';
import RapportinoDetail from '@/components/RapportinoDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AziendaSettings,
  ClienteAdminEntry,
  ClientiAdminSummary,
  Rapportino,
} from '@/types';
import { exportClientiAdmin } from '@/lib/exportData';

type SortField = 'nome' | 'citta' | 'rapportini' | 'ultimoIntervento';
type SortDirection = 'asc' | 'desc';

export default function AdminClientiPage() {
  const router = useRouter();
  const [clienti, setClienti] = useState<ClienteAdminEntry[]>([]);
  const [summary, setSummary] = useState<ClientiAdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCitta, setFilterCitta] = useState('');
  const [filterProvincia, setFilterProvincia] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const [loadingRapportino, setLoadingRapportino] = useState(false);
  const [sortField, setSortField] = useState<SortField>('rapportini');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;

    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!auth.isAdmin()) {
      router.push('/');
      return;
    }

    hasLoadedRef.current = true;
    setIsAuthenticated(true);
    setSettings(storage.getSettings());
    api.getSettings().then((apiSettings) => {
      setSettings((prev) => ({ ...prev, ...apiSettings }));
    }).catch(() => {});

    loadClienti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClienti = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getClientiAdmin();
      setClienti(data.clienti);
      setSummary(data.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei clienti');
      console.error('Error loading clienti:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  const handleRapportinoClick = async (rapportinoId: string) => {
    try {
      setLoadingRapportino(true);
      const rapportino = await api.getRapportino(rapportinoId);
      setSelectedRapportino(rapportino);
    } catch (err: unknown) {
      console.error('Error loading rapportino:', err);
      toast.error(err instanceof Error ? err.message : 'Errore nel caricamento del rapportino');
    } finally {
      setLoadingRapportino(false);
    }
  };

  const cittaOptions = useMemo(() => {
    const set = new Set(clienti.map((c) => c.cliente.citta).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [clienti]);

  const provinciaOptions = useMemo(() => {
    const set = new Set(clienti.map((c) => c.cliente.provincia).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [clienti]);

  const filteredClienti = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return clienti
      .filter((entry) => {
        const { cliente } = entry;
        const matchesSearch =
          !searchTerm ||
          cliente.nome.toLowerCase().includes(searchLower) ||
          cliente.cognome.toLowerCase().includes(searchLower) ||
          cliente.ragioneSociale.toLowerCase().includes(searchLower) ||
          cliente.citta.toLowerCase().includes(searchLower) ||
          cliente.telefono.includes(searchTerm) ||
          cliente.email.toLowerCase().includes(searchLower);

        const matchesCitta = !filterCitta || cliente.citta === filterCitta;
        const matchesProvincia = !filterProvincia || cliente.provincia === filterProvincia;

        return matchesSearch && matchesCitta && matchesProvincia;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'nome':
            cmp = `${a.cliente.cognome} ${a.cliente.nome}`.localeCompare(
              `${b.cliente.cognome} ${b.cliente.nome}`,
              'it'
            );
            break;
          case 'citta':
            cmp = a.cliente.citta.localeCompare(b.cliente.citta, 'it');
            break;
          case 'rapportini':
            cmp = a.statistiche.totale - b.statistiche.totale;
            break;
          case 'ultimoIntervento': {
            const dateA = a.statistiche.ultimoIntervento || '';
            const dateB = b.statistiche.ultimoIntervento || '';
            cmp = dateA.localeCompare(dateB);
            break;
          }
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [clienti, searchTerm, filterCitta, filterProvincia, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'rapportini' || field === 'ultimoIntervento' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Clienti"
      pageSubtitle="Anagrafica e statistiche dai rapportini compilati dagli operatori"
      onLogout={handleLogout}
      topActions={
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Esporta
          </Button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="saas-card absolute right-0 z-20 mt-2 w-48 overflow-hidden">
                <button
                  onClick={() => {
                    exportClientiAdmin(filteredClienti, { format: 'xlsx' });
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors"
                >
                  Esporta Excel (.xlsx)
                </button>
                <button
                  onClick={() => {
                    exportClientiAdmin(filteredClienti, { format: 'csv' });
                    setShowExportMenu(false);
                  }}
                  className="w-full border-t border-border px-4 py-3 text-left text-sm hover:bg-muted transition-colors"
                >
                  Esporta CSV
                </button>
              </div>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        {!loading && summary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="saas-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clienti totali</p>
                  <p className="mt-1 font-heading text-3xl font-bold tracking-tight">{summary.totaleClienti}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.clientiConInterventoAnno} attivi nel {new Date().getFullYear()}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-primary ring-1 ring-inset ring-primary/20">
                  <Users className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="saas-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rapportini totali</p>
                  <p className="mt-1 font-heading text-3xl font-bold tracking-tight">{summary.totaleRapportini}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Media {summary.mediaRapportiniPerCliente} per cliente
                  </p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
                  <FileText className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="saas-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stufe pellet / legno</p>
                  <p className="mt-1 font-heading text-3xl font-bold tracking-tight">
                    <span className="text-orange-600">{summary.totalePellet}</span>
                    <span className="mx-1 text-muted-foreground">/</span>
                    <span className="text-amber-700">{summary.totaleLegno}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600 ring-1 ring-inset ring-orange-500/20 dark:text-orange-400">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div className="rounded-lg bg-amber-800/10 p-2 text-amber-800 ring-1 ring-inset ring-amber-800/20 dark:text-amber-500">
                    <TreePine className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="saas-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Città principali</p>
                  <div className="mt-2 space-y-1">
                    {summary.cittaPrincipali.slice(0, 3).map(({ citta, count }) => (
                      <div key={citta} className="flex items-center justify-between gap-4 text-sm">
                        <span className="truncate text-foreground">{citta}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                    {summary.cittaPrincipali.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nessun dato</p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-primary ring-1 ring-inset ring-primary/20">
                  <MapPin className="h-7 w-7" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtri */}
        <div className="saas-card p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca per nome, città, telefono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filterCitta}
              onChange={(e) => setFilterCitta(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring"
            >
              <option value="">Tutte le città</option>
              {cittaOptions.map((citta) => (
                <option key={citta} value={citta}>{citta}</option>
              ))}
            </select>
            <select
              value={filterProvincia}
              onChange={(e) => setFilterProvincia(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring"
            >
              <option value="">Tutte le province</option>
              {provinciaOptions.map((provincia) => (
                <option key={provincia} value={provincia}>{provincia}</option>
              ))}
            </select>
          </div>
          {!loading && (
            <p className="mt-3 text-sm text-muted-foreground">
              {filteredClienti.length} di {clienti.length} clienti
            </p>
          )}
        </div>

        {error && <ErrorBanner message={error} onRetry={loadClienti} />}

        {loading ? (
          <div className="saas-card p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredClienti.length === 0 ? (
          <div className="saas-card p-12 text-center">
            <Users className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">
              {searchTerm || filterCitta || filterProvincia
                ? 'Nessun cliente trovato'
                : 'Nessun cliente registrato'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm || filterCitta || filterProvincia
                ? 'Prova a modificare i filtri di ricerca'
                : 'I clienti vengono creati automaticamente quando gli operatori compilano i rapportini'}
            </p>
          </div>
        ) : (
          <div className="saas-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort('nome')}
                  >
                    Cliente <SortIcon field="nome" />
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Contatti</TableHead>
                  <TableHead
                    className="cursor-pointer select-none hidden md:table-cell"
                    onClick={() => toggleSort('citta')}
                  >
                    Località <SortIcon field="citta" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-center"
                    onClick={() => toggleSort('rapportini')}
                  >
                    Rapportini <SortIcon field="rapportini" />
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Stufe</TableHead>
                  <TableHead
                    className="cursor-pointer select-none hidden xl:table-cell"
                    onClick={() => toggleSort('ultimoIntervento')}
                  >
                    Ultimo intervento <SortIcon field="ultimoIntervento" />
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClienti.map((entry) => {
                  const isExpanded = expandedClient === entry.cliente.id;
                  return (
                    <Fragment key={entry.cliente.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedClient(isExpanded ? null : entry.cliente.id)
                        }
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {entry.cliente.nome} {entry.cliente.cognome}
                            </p>
                            {entry.cliente.ragioneSociale && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Building2 className="h-3 w-3" />
                                {entry.cliente.ragioneSociale}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="space-y-1 text-sm">
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {entry.cliente.telefono}
                            </p>
                            {entry.cliente.email && (
                              <p className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                {entry.cliente.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p>{entry.cliente.citta}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.cliente.cap}
                            {entry.cliente.provincia ? ` (${entry.cliente.provincia})` : ''}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default">{entry.statistiche.totale}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex justify-center gap-1.5">
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              {entry.statistiche.pellet} pellet
                            </Badge>
                            <Badge variant="outline" className="text-amber-700 border-amber-200">
                              {entry.statistiche.legno} legno
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {entry.statistiche.ultimoIntervento
                            ? format(
                                new Date(entry.statistiche.ultimoIntervento),
                                'dd MMM yyyy',
                                { locale: it }
                              )
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-0">
                            <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div>
                                  <h4 className="text-sm font-semibold mb-3">Anagrafica</h4>
                                  <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">Indirizzo</dt>
                                      <dd className="text-right">
                                        {entry.cliente.indirizzo}
                                        {entry.cliente.via && ` (${entry.cliente.via} ${entry.cliente.numeroCivico})`}
                                      </dd>
                                    </div>
                                    {entry.cliente.partitaIva && (
                                      <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">P. IVA</dt>
                                        <dd>{entry.cliente.partitaIva}</dd>
                                      </div>
                                    )}
                                    {entry.cliente.codiceFiscale && (
                                      <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Cod. Fiscale</dt>
                                        <dd>{entry.cliente.codiceFiscale}</dd>
                                      </div>
                                    )}
                                    {entry.statistiche.primoIntervento && (
                                      <div className="flex justify-between gap-4">
                                        <dt className="text-muted-foreground">Primo intervento</dt>
                                        <dd>
                                          {format(
                                            new Date(entry.statistiche.primoIntervento),
                                            'dd MMMM yyyy',
                                            { locale: it }
                                          )}
                                        </dd>
                                      </div>
                                    )}
                                  </dl>
                                </div>

                                <div>
                                  <h4 className="text-sm font-semibold mb-3">Operatori</h4>
                                  {entry.operatori.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nessun operatore</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {entry.operatori.map((op) => (
                                        <div
                                          key={op.id}
                                          className="flex items-center justify-between text-sm"
                                        >
                                          <span>{op.nome} {op.cognome}</span>
                                          <Badge variant="secondary">{op.count} rapportini</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="text-sm font-semibold mb-3">Tipi di intervento</h4>
                                  {Object.keys(entry.statistiche.tipiIntervento).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nessun dato</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {Object.entries(entry.statistiche.tipiIntervento).map(
                                        ([tipo, count]) => (
                                          <div
                                            key={tipo}
                                            className="flex items-center justify-between text-sm"
                                          >
                                            <span className="text-muted-foreground">{tipo}</span>
                                            <Badge variant="outline">{count}</Badge>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold mb-3">
                                  Storico rapportini ({entry.rapportini.length})
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {entry.rapportini.map((rapportino) => (
                                    <button
                                      key={rapportino.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRapportinoClick(rapportino.id);
                                      }}
                                      className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 text-left text-sm hover:bg-muted transition-colors"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={
                                            rapportino.tipoStufa === 'pellet'
                                              ? 'text-orange-600 border-orange-200'
                                              : 'text-amber-700 border-amber-200'
                                          }
                                        >
                                          {rapportino.tipoStufa === 'pellet' ? 'Pellet' : 'Legno'}
                                        </Badge>
                                        <span className="font-medium">
                                          {format(
                                            new Date(rapportino.dataIntervento),
                                            'dd/MM/yyyy',
                                            { locale: it }
                                          )}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {rapportino.tipoIntervento}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {rapportino.marca} {rapportino.modello}
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                        {rapportino.operatore.nome} {rapportino.operatore.cognome}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedRapportino && (
        <RapportinoDetail
          rapportino={selectedRapportino}
          settings={settings}
          onClose={() => setSelectedRapportino(null)}
        />
      )}

      {loadingRapportino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p>Caricamento dettagli...</p>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
