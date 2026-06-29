'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Rapportino, AziendaSettings } from '@/types';
import { storage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import RapportiniList from '@/components/RapportiniList';
import SidebarLayout from '@/components/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Flame, Trees, FileText, Plus, Search } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartGradients, ChartTooltip } from '@/components/charts/chartTheme';

const RECENT_LIMIT = 10;

const glassCardClass =
  'border-white/40 bg-card/60 ring-white/20 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-300 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-white/[0.06] dark:ring-white/10';

export default function Home() {
  const router = useRouter();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [summary, setSummary] = useState({ total: 0, pellet: 0, legno: 0 });
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    hasLoadedRef.current = true;
    setIsAuthenticated(true);
    loadRapportini();
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    api.getSettings().then((apiSettings) => setSettings((prev) => ({ ...prev, ...apiSettings }))).catch(() => {});
  }, []);

  const loadRapportini = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, kpiData] = await Promise.all([
        api.getRapportini({ limit: RECENT_LIMIT }),
        api.getRapportiniSummary(),
      ]);
      setRapportini(data);
      setSummary(kpiData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei rapportini');
      console.error('Error loading rapportini:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRapportino = async (id: string) => {
    try {
      await api.deleteRapportino(id);
      toast.success('Rapportino eliminato');
      loadRapportini();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'eliminazione del rapportino');
    }
  };

  const handleExportPDFs = async () => {
    if (rapportini.length === 0) {
      toast.error('Nessun rapportino da esportare');
      return;
    }
    try {
      const { exportAllPDFs } = await import('@/lib/pdfGenerator');
      const allRapportini = await api.getRapportini();
      await exportAllPDFs(allRapportini, settings);
      toast.success('Esportazione completata');
    } catch (error: unknown) {
      console.error('Error exporting PDFs:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'esportazione dei PDF');
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  const canCreateRapportini = auth.canCreateRapportini();
  const canEditRapportini = canCreateRapportini || auth.isAdmin();

  const kpi = summary;

  const pieData = useMemo(
    () => [
      { name: 'Pellet', value: kpi.pellet, fill: 'url(#grad-pellet)', dot: '#f97316' },
      { name: 'Legna', value: kpi.legno, fill: 'url(#grad-legno)', dot: '#b45309' },
    ],
    [kpi.pellet, kpi.legno]
  );

  const pelletShare = kpi.total > 0 ? Math.round((kpi.pellet / kpi.total) * 100) : 0;
  const legnoShare = kpi.total > 0 ? Math.round((kpi.legno / kpi.total) * 100) : 0;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <SidebarLayout
        settings={settings}
        pageTitle="Dashboard"
        onLogout={handleLogout}
        onExportPDF={handleExportPDFs}
      >
        {error && <ErrorBanner message={error} onRetry={loadRapportini} />}

        {loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-9 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="mx-auto h-[200px] w-full max-w-xs rounded-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {canCreateRapportini && (
              <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-primary/20 via-primary/5 to-white/10 p-6 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:from-primary/25 dark:via-white/[0.04] dark:to-white/[0.02] sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
                <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Azione rapida</p>
                    <h2 className="mt-1 font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">Nuovo rapportino</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Compila e invia un nuovo rapportino di intervento in pochi passaggi.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                    <Link
                      href="/rapportini/nuovo"
                      className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'w-full justify-center gap-2 sm:w-auto')}
                    >
                      <Plus className="h-5 w-5" />
                      Nuovo rapportino
                    </Link>
                    <Link
                      href="/rapportini"
                      className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full justify-center gap-2 sm:w-auto')}
                    >
                      <Search className="h-4 w-4" />
                      Cerca rapportini
                    </Link>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className={glassCardClass}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rapportini totali</CardTitle>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary-600 ring-1 ring-inset ring-primary/20">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold tracking-tight text-foreground">{kpi.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Tutti i rapportini registrati</p>
                </CardContent>
              </Card>
              <Card className={glassCardClass}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pellet</CardTitle>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 ring-1 ring-inset ring-orange-500/20">
                    <Flame className="h-4 w-4" aria-hidden />
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold tracking-tight">{kpi.pellet}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pelletShare}% del totale</p>
                </CardContent>
              </Card>
              <Card className={glassCardClass}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Legna</CardTitle>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-800/10 text-amber-800 ring-1 ring-inset ring-amber-800/20 dark:text-amber-600">
                    <Trees className="h-4 w-4" aria-hidden />
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold tracking-tight">{kpi.legno}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{legnoShare}% del totale</p>
                </CardContent>
              </Card>
            </div>
            <Card className={glassCardClass}>
              <CardHeader className="pb-0">
                <CardTitle className="font-heading text-base font-semibold text-foreground">Distribuzione tipologia</CardTitle>
                <p className="text-sm text-muted-foreground">Pellet e legna sul totale dei rapportini</p>
              </CardHeader>
              <CardContent className="pt-4">
                {kpi.total === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">Nessun dato da mostrare</p>
                ) : (
                  <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="relative mx-auto h-[220px] w-full max-w-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartGradients />
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={64}
                            outerRadius={92}
                            paddingAngle={3}
                            cornerRadius={8}
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-heading text-3xl font-bold tracking-tight text-foreground">{kpi.total}</span>
                        <span className="text-xs font-medium text-muted-foreground">totale</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {pieData.map((entry) => {
                        const share = kpi.total > 0 ? Math.round((entry.value / kpi.total) * 100) : 0;
                        return (
                          <div key={entry.name} className="rounded-xl border border-white/40 bg-white/40 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.dot }} />
                                {entry.name}
                              </span>
                              <span className="font-heading text-sm font-bold text-foreground">{entry.value}</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                              <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: entry.dot }} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{share}% del totale</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="saas-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Rapportini recenti</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Ultimi {rapportini.length} rapportini registrati</p>
              </div>
              <Link
                href="/rapportini"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 bg-white/40 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Cerca tutti i rapportini
              </Link>
            </div>
            <div className="saas-card overflow-hidden">
              <RapportiniList
                rapportini={rapportini}
                onDelete={handleDeleteRapportino}
                onEdit={canEditRapportini ? (r) => router.push(`/rapportini/modifica/${r.id}`) : undefined}
                settings={settings}
                showCreateAction={canCreateRapportini}
              />
            </div>
          </div>
        )}

        <footer className="mt-16 border-t border-surface-200 py-6 dark:border-surface-800">
          <div className="flex flex-col items-center gap-2 text-center text-sm text-surface-500 dark:text-surface-400 sm:flex-row sm:justify-between">
            <p className="text-xs font-medium">© {new Date().getFullYear()} {settings.nomeAzienda || 'EVA CALÒR'}</p>
            <Link href="/privacy" className="text-xs text-primary-600 hover:underline dark:text-primary-400">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </SidebarLayout>
    </>
  );
}
