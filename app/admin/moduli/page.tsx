'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import SidebarLayout from '@/components/SidebarLayout';
import PageLoader from '@/components/ui/PageLoader';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AziendaSettings } from '@/types';
import { ModuleCode } from '@/lib/modules';

interface ModuloCatalogo {
  id: string;
  code: ModuleCode;
  nome: string;
  descrizione: string | null;
}

interface TecnicoModuli {
  id: string;
  nome: string;
  cognome: string;
  username: string;
  attivo: boolean;
  moduli: Array<{
    code: ModuleCode;
    nome: string;
    attivo: boolean;
  }>;
}

interface AdminModulesResponse {
  data?: {
    moduli: ModuloCatalogo[];
    tecnici: TecnicoModuli[];
  };
  error?: string;
}

export default function AdminModuliPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [moduli, setModuli] = useState<ModuloCatalogo[]>([]);
  const [tecnici, setTecnici] = useState<TecnicoModuli[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!auth.isAdmin()) {
      router.push('/');
      return;
    }
    if (!auth.canManageModulesAdmin()) {
      router.push('/admin');
      return;
    }
    hasLoadedRef.current = true;
    setSettings(storage.getSettings());
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/admin/modules');
      const data = await parseResponseBody<AdminModulesResponse>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel caricamento');
      }
      setModuli(data?.data?.moduli || []);
      setTecnici(data?.data?.tecnici || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (utenteId: string, moduleCode: ModuleCode, attivo: boolean) => {
    const key = `${utenteId}:${moduleCode}`;
    setSavingKey(key);

    try {
      const response = await fetchWithAuth('/api/admin/modules', {
        method: 'PUT',
        body: JSON.stringify({
          utente_id: utenteId,
          module_code: moduleCode,
          attivo,
        }),
      });
      const data = await parseResponseBody<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel salvataggio');
      }

      setTecnici((prev) =>
        prev.map((tecnico) =>
          tecnico.id === utenteId
            ? {
                ...tecnico,
                moduli: tecnico.moduli.map((modulo) =>
                  modulo.code === moduleCode ? { ...modulo, attivo } : modulo
                ),
              }
            : tecnico
        )
      );
      toast.success(attivo ? 'Modulo attivato' : 'Modulo disattivato');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setSavingKey(null);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Moduli a pagamento"
      pageSubtitle="Attiva o disattiva i moduli per ogni tecnico"
      onLogout={handleLogout}
    >
      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadData} />
      ) : tecnici.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessun tecnico</CardTitle>
            <CardDescription>
              Crea almeno un operatore dalla gestione utenti per assegnare i moduli.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {tecnici.map((tecnico) => (
            <Card key={tecnico.id}>
              <CardHeader>
                <CardTitle>
                  {tecnico.nome} {tecnico.cognome}
                </CardTitle>
                <CardDescription>
                  @{tecnico.username}
                  {!tecnico.attivo && ' · Account disattivato'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Modulo</th>
                        <th className="pb-2 font-medium">Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tecnico.moduli.map((modulo) => {
                        const key = `${tecnico.id}:${modulo.code}`;
                        const isSaving = savingKey === key;
                        return (
                          <tr key={modulo.code} className="border-b border-border last:border-0">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-foreground">{modulo.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {moduli.find((m) => m.code === modulo.code)?.descrizione}
                              </p>
                            </td>
                            <td className="py-3">
                              <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={modulo.attivo}
                                  disabled={isSaving || !tecnico.attivo}
                                  onChange={(e) =>
                                    handleToggle(tecnico.id, modulo.code, e.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-border"
                                />
                                <span className={modulo.attivo ? 'text-primary' : 'text-muted-foreground'}>
                                  {isSaving ? 'Salvataggio...' : modulo.attivo ? 'Attivo' : 'Non attivo'}
                                </span>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SidebarLayout>
  );
}
