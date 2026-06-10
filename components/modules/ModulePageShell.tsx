'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { useUserModules } from '@/lib/useUserModules';
import SidebarLayout from '@/components/SidebarLayout';
import ActivateModulePlaceholder from '@/components/modules/ActivateModulePlaceholder';
import PageLoader from '@/components/ui/PageLoader';
import { PaidModuleDefinition } from '@/lib/modules';
import { AziendaSettings } from '@/types';

interface ModulePageShellProps {
  modulo: PaidModuleDefinition;
  children: React.ReactNode;
}

export default function ModulePageShell({ modulo, children }: ModulePageShellProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<AziendaSettings>({});
  const { loading, isModuleActive } = useUserModules();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    hasLoadedRef.current = true;
    setSettings(storage.getSettings());
  }, [router]);

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  const isAdmin = auth.isAdmin();
  const canAccess = isAdmin || isModuleActive(modulo.code);

  return (
    <SidebarLayout
      settings={settings}
      pageTitle={modulo.nome}
      pageSubtitle={modulo.descrizione}
      onLogout={handleLogout}
    >
      {loading ? (
        <PageLoader />
      ) : canAccess ? (
        children
      ) : (
        <ActivateModulePlaceholder modulo={modulo} />
      )}
    </SidebarLayout>
  );
}
