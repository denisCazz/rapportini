'use client';

import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import Header from '@/components/Header';
import RapportinoDetail from '@/components/RapportinoDetail';
import { AziendaSettings, Rapportino } from '@/types';
import { exportStatistiche } from '@/lib/exportData';

// Lazy load dei grafici per migliorare il caricamento iniziale
const StatisticsCharts = lazy(() => import('@/components/StatisticsCharts'));

interface ClienteStatistiche {
  cliente: {
    id: string;
    nome: string;
    cognome: string;
    ragioneSociale: string;
    indirizzo: string;
    citta: string;
    cap: string;
    telefono: string;
    email: string;
  };
  rapportini: Array<{
    id: string;
    dataIntervento: string;
    tipoStufa: string;
    tipoIntervento: string;
  }>;
  statistiche: {
    totale: number;
    pellet: number;
    legno: number;
    ultimoIntervento: string | null;
    primoIntervento: string | null;
    tipiIntervento: Record<string, number>;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [statistiche, setStatistiche] = useState<ClienteStatistiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const [loadingRapportino, setLoadingRapportino] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const hasLoadedRef = useRef(false); // Previene doppie chiamate in React Strict Mode

  useEffect(() => {
    // Previene doppie chiamate in React Strict Mode
    if (hasLoadedRef.current) return;
    
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    // Verifica che l'utente sia admin
    if (!auth.isAdmin()) {
      router.push('/');
      return;
    }
    
    hasLoadedRef.current = true;
    setIsAuthenticated(true);
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    
    const isDark = loadedSettings.darkMode || false;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Rimuoviamo router dalle dipendenze - non è necessario

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStatistics();
      setStatistiche(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento delle statistiche');
      console.error('Error loading statistics:', err);
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
    } catch (err: any) {
      console.error('Error loading rapportino:', err);
      alert(err.message || 'Errore nel caricamento del rapportino');
    } finally {
      setLoadingRapportino(false);
    }
  };

  const filteredStatistiche = statistiche.filter((stat) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      stat.cliente.nome.toLowerCase().includes(searchLower) ||
      stat.cliente.cognome.toLowerCase().includes(searchLower) ||
      stat.cliente.ragioneSociale.toLowerCase().includes(searchLower) ||
      stat.cliente.citta.toLowerCase().includes(searchLower) ||
      stat.cliente.telefono.includes(searchTerm)
    );
  });

  const totalRapportini = statistiche.reduce((sum, s) => sum + s.statistiche.totale, 0);
  const totalClienti = statistiche.length;
  const totalPellet = statistiche.reduce((sum, s) => sum + s.statistiche.pellet, 0);
  const totalLegno = statistiche.reduce((sum, s) => sum + s.statistiche.legno, 0);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header 
        settings={settings}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Pannello Admin - Statistiche
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Visualizza i rapportini raggruppati per cliente con statistiche dettagliate
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Gestione Utenti
            </Link>
            <div className="relative">
              <button
                onClick={() => {
                  const dropdown = document.getElementById('export-dropdown');
                  dropdown?.classList.toggle('hidden');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Esporta
              </button>
              <div id="export-dropdown" className="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <button
                  onClick={() => {
                    exportStatistiche(statistiche, { format: 'xlsx' });
                    document.getElementById('export-dropdown')?.classList.add('hidden');
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  Esporta Excel (.xlsx)
                </button>
                <button
                  onClick={() => {
                    exportStatistiche(statistiche, { format: 'csv' });
                    document.getElementById('export-dropdown')?.classList.add('hidden');
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                >
                  Esporta CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiche Generali */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totale Clienti</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalClienti}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-3">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totale Rapportini</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalRapportini}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stufe Pellet</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{totalPellet}</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full p-3">
                <span className="text-2xl">🔥</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stufe Legno</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">{totalLegno}</p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full p-3">
                <span className="text-2xl">🪵</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grafici Statistiche */}
        {!loading && statistiche.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <svg className={`w-5 h-5 transition-transform ${showCharts ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showCharts ? 'Nascondi Grafici' : 'Mostra Grafici'}
            </button>
            {showCharts && (
              <Suspense fallback={
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento grafici...</p>
                </div>
              }>
                <StatisticsCharts data={statistiche} />
              </Suspense>
            )}
          </div>
        )}

        {/* Barra di ricerca */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca cliente per nome, cognome, città o telefono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-800 shadow-md"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={loadStatistics}
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
            <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento statistiche...</p>
          </div>
        ) : filteredStatistiche.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <svg
              className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'Nessun cliente trovato' : 'Nessun dato disponibile'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm ? 'Prova con un altro termine di ricerca' : 'Crea il primo rapportino per vedere le statistiche'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStatistiche.map((stat) => (
              <div
                key={stat.cliente.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl"
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedClient(expandedClient === stat.cliente.id ? null : stat.cliente.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {stat.cliente.nome} {stat.cliente.cognome}
                        </h3>
                        {stat.cliente.ragioneSociale && (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                            {stat.cliente.ragioneSociale}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {stat.cliente.indirizzo}, {stat.cliente.citta} ({stat.cliente.cap})
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {stat.cliente.telefono}
                        </div>
                        {stat.cliente.email && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {stat.cliente.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {stat.statistiche.totale}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Rapportini</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full text-sm font-medium">
                          🔥 {stat.statistiche.pellet}
                        </div>
                        <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium">
                          🪵 {stat.statistiche.legno}
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <svg
                          className={`w-6 h-6 transition-transform ${expandedClient === stat.cliente.id ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {expandedClient === stat.cliente.id && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Statistiche Dettagliate</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Primo Intervento:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {stat.statistiche.primoIntervento
                                ? format(new Date(stat.statistiche.primoIntervento), 'dd MMMM yyyy', { locale: it })
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Ultimo Intervento:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {stat.statistiche.ultimoIntervento
                                ? format(new Date(stat.statistiche.ultimoIntervento), 'dd MMMM yyyy', { locale: it })
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tipi di Intervento</h4>
                        <div className="space-y-2">
                          {Object.entries(stat.statistiche.tipiIntervento).map(([tipo, count]) => (
                            <div key={tipo} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{tipo}</span>
                              <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded text-sm font-medium">
                                {count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Storico Rapportini ({stat.rapportini.length})
                      </h4>
                      {stat.rapportini.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Nessun rapportino disponibile
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {stat.rapportini
                            .sort((a, b) => {
                              // Ordina per data (più recenti prima), poi per tipo intervento
                              const dateDiff = new Date(b.dataIntervento).getTime() - new Date(a.dataIntervento).getTime();
                              if (dateDiff !== 0) return dateDiff;
                              return a.tipoIntervento.localeCompare(b.tipoIntervento);
                            })
                            .map((rapportino) => (
                            <div
                              key={rapportino.id}
                              onClick={() => handleRapportinoClick(rapportino.id)}
                              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <div className="flex items-center gap-3 flex-wrap">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    rapportino.tipoStufa === 'pellet'
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                  }`}
                                >
                                  {rapportino.tipoStufa === 'pellet' ? '🔥 Pellet' : '🪵 Legno'}
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {format(new Date(rapportino.dataIntervento), 'dd/MM/yyyy', { locale: it })}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {rapportino.tipoIntervento}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                  (ID: {rapportino.id.substring(0, 8)}...)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal dettagli rapportino */}
      {selectedRapportino && (
        <RapportinoDetail
          rapportino={selectedRapportino}
          settings={settings}
          onClose={() => setSelectedRapportino(null)}
        />
      )}

      {/* Loading overlay quando carica il rapportino */}
      {loadingRapportino && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-900 dark:text-white">Caricamento dettagli...</p>
          </div>
        </div>
      )}

      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              <p>
                <a 
                  href="https://bitora.it" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-semibold"
                >
                  Bitora Software Gestionale Stufe
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
            
            {/* Toggle Dark Mode */}
            <button
              onClick={() => {
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
              }}
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

