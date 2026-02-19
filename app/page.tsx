'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Rapportino, AziendaSettings } from '@/types';
import { storage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import RapportiniList from '@/components/RapportiniList';
import SidebarLayout from '@/components/SidebarLayout';
import InstallPWA from '@/components/InstallPWA';

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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento rapportini...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rapportini recenti</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ultimi {rapportini.length} rapportini</p>
              </div>
              <Link
                href="/rapportini"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Cerca tutti i rapportini
              </Link>
            </div>
            <RapportiniList
              rapportini={rapportini}
              onDelete={handleDeleteRapportino}
              onEdit={isOperatore ? (r) => router.push(`/rapportini/modifica/${r.id}`) : undefined}
              settings={settings}
            />
          </>
        )}

        <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              <p>
                <a href="https://bitora.it" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-semibold">
                  Bitora Software di Gestione Specializzato
                </a>
                {' è un prodotto di '}
                <a href="https://bitora.it" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-semibold">
                  Bitora.it
                </a>
              </p>
              <p className="text-xs mt-1">© {new Date().getFullYear()} Bitora.it - Tutti i diritti riservati</p>
            </div>
          </div>
        </footer>
      </SidebarLayout>

      <InstallPWA />
    </>
  );
}
