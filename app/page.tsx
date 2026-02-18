'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Rapportino, AziendaSettings } from '@/types';
import { storage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Suspense, lazy } from 'react';
import RapportiniList from '@/components/RapportiniList';
import SidebarLayout from '@/components/SidebarLayout';
import InstallPWA from '@/components/InstallPWA';

// Dynamic import per componenti pesanti - migliora il bundle splitting
const RapportinoForm = lazy(() => import('@/components/RapportinoForm'));

export default function Home() {
  const router = useRouter();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false); // Previene doppie chiamate in React Strict Mode

  useEffect(() => {
    // Previene doppie chiamate in React Strict Mode
    if (hasLoadedRef.current) return;
    
    // Verifica autenticazione
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    hasLoadedRef.current = true;
    setIsAuthenticated(true);
    loadRapportini();
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Rimuoviamo router dalle dipendenze - non è necessario

  const loadRapportini = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRapportini();
      setRapportini(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dei rapportini');
      console.error('Error loading rapportini:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRapportino = async (rapportino: Rapportino) => {
    try {
      await api.createRapportino(rapportino);
      await loadRapportini();
      setShowForm(false);
    } catch (err: any) {
      alert(err.message || 'Errore nel salvataggio del rapportino');
    }
  };

  const handleDeleteRapportino = async (id: string) => {
    try {
      await api.deleteRapportino(id);
      await loadRapportini();
    } catch (err: any) {
      alert(err.message || 'Errore nell\'eliminazione del rapportino');
    }
  };

  const handleExportPDFs = async () => {
    if (rapportini.length === 0) {
      alert('Nessun rapportino da esportare');
      return;
    }
    try {
      // Dynamic import solo quando necessario per ridurre il bundle iniziale
      const { exportAllPDFs } = await import('@/lib/pdfGenerator');
      await exportAllPDFs(rapportini, settings);
    } catch (error: any) {
      console.error('Error exporting PDFs:', error);
      alert('Errore durante l\'esportazione dei PDF');
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null; // Mostra nulla mentre verifica l'autenticazione
  }

  return (
    <>
      <SidebarLayout
        settings={settings}
        pageTitle="Dashboard"
        pageSubtitle="Software di gestione specializzato per rapportini e attività operative"
        onLogout={handleLogout}
        onNewRapportino={() => setShowForm(true)}
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

        {showForm && (
          <Suspense fallback={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento form...</p>
            </div>
          }>
            <RapportinoForm
              onSave={handleSaveRapportino}
              onCancel={() => setShowForm(false)}
            />
          </Suspense>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento rapportini...</p>
          </div>
        ) : (
          <RapportiniList
            rapportini={rapportini}
            onDelete={handleDeleteRapportino}
            settings={settings}
          />
        )}

        <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              <p>
                <a 
                  href="https://bitora.it" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-semibold"
                >
                  Bitora Software di Gestione Specializzato
                </a>
                {' è un prodotto di '}
                <a 
                  href="https://bitora.it" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-semibold"
                >
                  Bitora.it
                </a>
              </p>
              <p className="text-xs mt-1">
                © {new Date().getFullYear()} Bitora.it - Tutti i diritti riservati
              </p>
            </div>
          </div>
        </footer>
      </SidebarLayout>

      <InstallPWA />
    </>
  );
}
