'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [exportingData, setExportingData] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

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
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Diritti privacy (GDPR)</h3>
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setExportingData(true);
                    const data = await api.exportMyData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dati-personali-${user?.username}-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Dati esportati');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Errore esportazione');
                  } finally {
                    setExportingData(false);
                  }
                }}
                disabled={exportingData}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm"
              >
                {exportingData ? 'Esportazione...' : 'Esporta i miei dati'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="px-4 py-2 bg-red-600/10 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-600/20 text-sm"
              >
                Elimina account
              </button>
              <Link
                href="/privacy"
                target="_blank"
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
              >
                Privacy Policy →
              </Link>
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

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Elimina account</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Questa azione disattiverà il tuo account. I dati saranno cancellati secondo la policy di retention. Se hai rapportini creati, contatta l&apos;admin per riassegnarli prima.
            </p>
            <input
              type="password"
              placeholder="Password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-2"
            />
            <input
              type="text"
              placeholder='Scrivi ELIMINA per confermare'
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setDeleteModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">
                Annulla
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirm !== 'ELIMINA') {
                    toast.error('Scrivi ELIMINA per confermare');
                    return;
                  }
                  try {
                    setDeleting(true);
                    await api.deleteMyAccount(deletePassword);
                    toast.success('Account disattivato');
                    await auth.logout();
                    router.push('/login');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Errore');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
