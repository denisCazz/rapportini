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
import { Flame, Trees, FileText } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const RECENT_LIMIT = 10;

export default function Home() {
  const router = useRouter();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
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
      const data = await api.getRapportini({ limit: RECENT_LIMIT });
      setRapportini(data);
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

  const isOperatore = auth.getUser()?.ruolo === 'operatore';

  const kpi = useMemo(() => {
    const pellet = rapportini.filter((r) => r.intervento.tipoStufa === 'pellet').length;
    const legno = rapportini.filter((r) => r.intervento.tipoStufa === 'legno').length;
    return { total: rapportini.length, pellet, legno };
  }, [rapportini]);

  const pieData = useMemo(
    () => [
      { name: 'Pellet', value: kpi.pellet, fill: '#ea580c' },
      { name: 'Legna', value: kpi.legno, fill: '#92400e' },
    ],
    [kpi.pellet, kpi.legno]
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <SidebarLayout
        settings={settings}
        pageTitle="Dashboard"
        pageSubtitle="Software di gestione specializzato per rapportini e attività operative"
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
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rapportini (lista)</CardTitle>
                  <FileText className="h-4 w-4 text-primary-600" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold text-foreground">{kpi.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ultimi {RECENT_LIMIT} caricati</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pellet</CardTitle>
                  <Flame className="h-4 w-4 text-orange-500" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold">{kpi.pellet}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Legna</CardTitle>
                  <Trees className="h-4 w-4 text-amber-800 dark:text-amber-600" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold">{kpi.legno}</p>
                </CardContent>
              </Card>
            </div>
            <Card className="border-border">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Distribuzione tipologia</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px] pt-2">
                {kpi.total === 0 ? (
                  <p className="text-sm text-muted-foreground pt-10 text-center">Nessun dato da mostrare</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={2}>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--card))',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <div className="saas-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Rapportini recenti</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Ultimi {rapportini.length} rapportini registrati</p>
              </div>
              <Link
                href="/rapportini"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
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
                onEdit={isOperatore ? (r) => router.push(`/rapportini/modifica/${r.id}`) : undefined}
                settings={settings}
                showCreateAction={isOperatore}
              />
            </div>
          </div>
        )}

        <footer className="mt-16 py-8 border-t border-surface-200 dark:border-surface-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-surface-500 dark:text-surface-400 text-center sm:text-left">
              <p>
                <a href="https://bitora.it" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-bold">
                  Bitora Software di Gestione Specializzato
                </a>
                {' è un prodotto di '}
                <a href="https://bitora.it" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-bold">
                  Bitora.it
                </a>
              </p>
              <p className="text-xs mt-2 font-medium">© {new Date().getFullYear()} Bitora.it - Tutti i diritti riservati</p>
              <Link href="/privacy" className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block font-medium">Privacy Policy</Link>
            </div>
          </div>
        </footer>
      </SidebarLayout>
    </>
  );
}
