'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { AziendaSettings } from '@/types';

export default function UtentePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    setSettings(storage.getSettings());
    setIsAuthenticated(true);
  }, [router]);

  const user = auth.getUser();

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
        </div>
      </div>
    </SidebarLayout>
  );
}
