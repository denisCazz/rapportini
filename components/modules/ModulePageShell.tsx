'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { useSettings } from '@/lib/useSettings';
import { useUserModules } from '@/lib/useUserModules';
import SidebarLayout from '@/components/SidebarLayout';
import ActivateModulePlaceholder from '@/components/modules/ActivateModulePlaceholder';
import PageLoader from '@/components/ui/PageLoader';
import { PaidModuleDefinition } from '@/lib/modules';

interface ModulePageShellProps {
  modulo: PaidModuleDefinition;
  children: React.ReactNode;
}

export default function ModulePageShell({ modulo, children }: ModulePageShellProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const { loading, isModuleActive, reload, stripeEnabled } = useUserModules();
  const hasLoadedRef = useRef(false);
  const checkoutHandledRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    hasLoadedRef.current = true;
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined' || checkoutHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    checkoutHandledRef.current = true;

    if (checkout === 'success') {
      toast.success('Modulo attivato! Il primo mese è gratuito.');
      reload();
    } else if (checkout === 'cancel') {
      toast.message('Attivazione annullata');
    }

    router.replace(modulo.href);
  }, [modulo.href, reload, router]);

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  const isPlatformAdmin = auth.isPlatformAdmin();
  const isCatAdmin = auth.isCatAdmin();
  const canAccess = isPlatformAdmin || isModuleActive(modulo.code);

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
        <ActivateModulePlaceholder
          modulo={modulo}
          stripeEnabled={stripeEnabled}
          isCatAdmin={isCatAdmin}
          onActivated={reload}
        />
      )}
    </SidebarLayout>
  );
}
