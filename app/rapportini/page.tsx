'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Rapportino, AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { api, RapportiniFilters as ApiFilters } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import RapportiniList from '@/components/RapportiniList';
import RapportiniFilters, { FilterValues } from '@/components/RapportiniFilters';

export default function RapportiniSearchPage() {
  const router = useRouter();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [filters, setFilters] = useState<FilterValues>({});
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
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    api.getSettings().then((s) => setSettings((prev) => ({ ...prev, ...s }))).catch(() => {});
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) {
      loadRapportini(filters);
    }
  }, [filters]);

  const loadRapportini = async (f: FilterValues) => {
    try {
      setLoading(true);
      setError(null);
      const apiFilters: ApiFilters = {
        ...f,
        limit: 50,
      };
      const data = await api.getRapportini(apiFilters);
      setRapportini(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteRapportino(id);
      toast.success('Rapportino eliminato');
      loadRapportini(filters);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'eliminazione');
    }
  };

  const handleEdit = (r: Rapportino) => {
    router.push(`/rapportini/modifica/${r.id}`);
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  const isOperatore = auth.getUser()?.ruolo === 'operatore';

  if (!hasLoadedRef.current && !auth.isAuthenticated()) {
    return null;
  }

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Rapportini"
      pageSubtitle="Cerca e gestisci i rapportini"
      onLogout={handleLogout}
    >
      <RapportiniFilters onFilterChange={handleFilterChange} initialFilters={filters} />

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button onClick={() => loadRapportini(filters)} className="ml-auto text-red-600 dark:text-red-400 hover:underline text-sm">
              Riprova
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento rapportini...</p>
        </div>
      ) : (
        <RapportiniList
          rapportini={rapportini}
          onDelete={handleDelete}
          onEdit={isOperatore ? handleEdit : undefined}
          settings={settings}
        />
      )}
    </SidebarLayout>
  );
}
