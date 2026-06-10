'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import { ModuleCode } from '@/lib/modules';

export interface UserModuleStatus {
  code: ModuleCode;
  nome: string;
  descrizione: string;
  href: string;
  attivo: boolean;
}

export function useUserModules() {
  const [modules, setModules] = useState<UserModuleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/modules/me');
      const data = await parseResponseBody<{ data?: UserModuleStatus[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel caricamento dei moduli');
      }
      setModules(data?.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const isModuleActive = useCallback(
    (code: ModuleCode) => modules.find((m) => m.code === code)?.attivo ?? false,
    [modules]
  );

  return { modules, loading, error, isModuleActive, reload: loadModules };
}
