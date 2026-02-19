'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import SignaturePad from '@/components/SignaturePad';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';
import { AziendaSettings } from '@/types';

export default function UtentePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firma, setFirma] = useState('');
  const [savingFirma, setSavingFirma] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    setSettings(storage.getSettings());
    setIsAuthenticated(true);
  }, [router]);

  const user = auth.getUser();

  useEffect(() => {
    if (user?.firma) {
      setFirma(user.firma);
    }
  }, [user?.firma]);

  const handleSaveFirma = async () => {
    if (!user) return;

    try {
      setSavingFirma(true);
      await api.updateUser(user.id, { firma });
      auth.updateUser({ ...user, firma });
      toast.success('Firma salvata con successo');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore nel salvataggio firma';
      toast.error(message);
    } finally {
      setSavingFirma(false);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Profilo Utente"
      pageSubtitle="Dati dell'operatore attualmente autenticato"
      onLogout={handleLogout}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center text-lg font-bold shadow-lg shadow-indigo-900/30">
              {user.nome?.charAt(0)}{user.cognome?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.nome} {user.cognome}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{user.ruolo}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Username</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{user.username}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{user.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Telefono</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{user.telefono || '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Qualifica</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{user.qualifica || '-'}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Firma operatore</h3>
            <SignaturePad
              label="Firma personale"
              value={firma}
              onChange={setFirma}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveFirma}
                disabled={savingFirma}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {savingFirma ? 'Salvataggio...' : 'Salva firma'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
