'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
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
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);

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
      const sessionId = params.get('session_id');
      const finalize = async () => {
        setConfirmingCheckout(true);
        try {
          const res = await fetchWithAuth('/api/modules/checkout/confirm', {
            method: 'POST',
            body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
          });
          const data = await parseResponseBody<{ error?: string }>(res);
          if (!res.ok) {
            toast.error(data?.error || 'Conferma pagamento fallita');
            router.replace(modulo.href);
            return;
          }
          toast.success('Modulo attivato! Il primo mese è gratuito.');
          await reload();
          router.replace(modulo.href);
        } catch {
          toast.error('Errore conferma pagamento');
          router.replace(modulo.href);
        } finally {
          setConfirmingCheckout(false);
        }
      };
      void finalize();
    } else if (checkout === 'cancel') {
      toast.message('Attivazione annullata');
      router.replace(modulo.href);
    }
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
      {loading || confirmingCheckout ? (
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
