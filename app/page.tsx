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
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={loadRapportini}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline text-sm"
              >
                Riprova
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-lg font-medium text-surface-600 dark:text-surface-300">Caricamento rapportini in corso...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-primary-200/50 dark:border-primary-900/40 bg-gradient-to-br from-card to-primary-50/30 dark:from-card dark:to-primary-950/20">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 dark:bg-surface-900/50 p-6 rounded-3xl border border-surface-200 dark:border-surface-800 backdrop-blur-sm shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Rapportini recenti</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 font-medium mt-1">Ultimi {rapportini.length} rapportini registrati</p>
              </div>
              <Link
                href="/rapportini"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-surface-800 text-surface-900 dark:text-white border border-surface-200 dark:border-surface-700 rounded-2xl hover:bg-surface-50 dark:hover:bg-surface-700 transition-all text-sm font-bold shadow-sm group"
              >
                <svg className="w-5 h-5 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Cerca tutti i rapportini
              </Link>
            </div>
            <div className="glass-card rounded-3xl overflow-hidden">
              <RapportiniList
                rapportini={rapportini}
                onDelete={handleDeleteRapportino}
                onEdit={isOperatore ? (r) => router.push(`/rapportini/modifica/${r.id}`) : undefined}
                settings={settings}
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
