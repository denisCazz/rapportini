'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rapportino, AziendaSettings } from '@/types';
import { storage } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { exportAllPDFs } from '@/lib/pdfGenerator';
import RapportinoForm from '@/components/RapportinoForm';
import RapportiniList from '@/components/RapportiniList';
import SettingsModal from '@/components/SettingsModal';
import Header from '@/components/Header';

export default function Home() {
  const router = useRouter();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verifica autenticazione
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    setIsAuthenticated(true);
    setRapportini(storage.getRapportini());
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    
    // Applica dark mode se attiva
    if (loadedSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [router]);

  const handleSaveRapportino = (rapportino: Rapportino) => {
    storage.saveRapportino(rapportino);
    setRapportini(storage.getRapportini());
    setShowForm(false);
  };

  const handleDeleteRapportino = (id: string) => {
    storage.deleteRapportino(id);
    setRapportini(storage.getRapportini());
  };

  const handleSaveSettings = (newSettings: AziendaSettings) => {
    storage.saveSettings(newSettings);
    setSettings(newSettings);
    setShowSettings(false);
    
    // Applica dark mode se attiva
    if (newSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleExport = async () => {
    if (rapportini.length === 0) {
      alert('Nessun rapportino da esportare');
      return;
    }
    await exportAllPDFs(rapportini, settings);
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null; // Mostra nulla mentre verifica l'autenticazione
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header 
        settings={settings} 
        onSettingsClick={() => setShowSettings(true)}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Bitora - Gestione Rapportini
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Sistema per la gestione degli interventi su stufe a pellet e legno
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-md"
            >
              + Nuovo Rapportino
            </button>
            <button
              onClick={handleExport}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              📤 Esporta Tutti i PDF
            </button>
          </div>
        </div>

        {showForm && (
          <RapportinoForm
            onSave={handleSaveRapportino}
            onCancel={() => setShowForm(false)}
          />
        )}

        <RapportiniList
          rapportini={rapportini}
          onDelete={handleDeleteRapportino}
          settings={settings}
        />

        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </main>
      
      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
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
        </div>
      </footer>
    </div>
  );
}
