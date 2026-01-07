'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Rapportino, AziendaSettings } from '@/types';
import { storage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { exportAllPDFs } from '@/lib/pdfGenerator';
import RapportinoForm from '@/components/RapportinoForm';
import RapportiniList from '@/components/RapportiniList';
import Header from '@/components/Header';

export default function Home() {
  const router = useRouter();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verifica autenticazione
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    setIsAuthenticated(true);
    loadRapportini();
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    
    // Carica dark mode
    const isDark = loadedSettings.darkMode || false;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

  }, [router]);

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

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    const updatedSettings = { ...settings, darkMode: newDarkMode };
    storage.saveSettings(updatedSettings);
    setSettings(updatedSettings);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleExportPDFs = async () => {
    if (rapportini.length === 0) {
      alert('Nessun rapportino da esportare');
      return;
    }
    await exportAllPDFs(rapportini, settings);
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null; // Mostra nulla mentre verifica l'autenticazione
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header 
        settings={settings} 
        onLogout={handleLogout}
        onNewRapportino={() => setShowForm(true)}
        onExportPDF={handleExportPDFs}
      />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
            </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gestione rapportini di intervento su stufe a pellet e legno
          </p>
        </div>

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
          <RapportinoForm
            onSave={handleSaveRapportino}
            onCancel={() => setShowForm(false)}
          />
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

      </main>
      
      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              <a 
                href="https://bitora.it" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Bitora.it
              </a>
              {' - Un prodotto di '}
              <span className="font-semibold">Denis Cazzulo</span>
            </p>
            
            {/* Toggle Dark Mode */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Modalità Scura</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Modalità Chiara</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
