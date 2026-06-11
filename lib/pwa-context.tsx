'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { toast } from 'sonner';
import { countPendingRapportini } from '@/lib/offline-queue';
import { registerBackgroundSync, syncPendingRapportini } from '@/lib/offline-sync';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return (window.navigator as { standalone?: boolean }).standalone === true;
}

interface PWAContextType {
  canInstall: boolean;
  showIosInstallHint: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  install: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
  canInstall: false,
  showIosInstallHint: false,
  isInstalled: false,
  isOnline: true,
  pendingSyncCount: 0,
  isSyncing: false,
  install: async () => {},
  refreshPendingCount: async () => {},
  syncNow: async () => {},
});

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await countPendingRapportini();
      setPendingSyncCount(count);
    } catch {
      setPendingSyncCount(0);
    }
  }, []);

  const isSyncingRef = useRef(false);

  const syncNow = useCallback(async (options?: { silent?: boolean }) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const result = await syncPendingRapportini();
      await refreshPendingCount();
      if (!options?.silent) {
        if (result.synced > 0) {
          toast.success(
            result.synced === 1
              ? '1 rapportino sincronizzato'
              : `${result.synced} rapportini sincronizzati`
          );
        }
        if (result.failed > 0) {
          toast.error('Alcuni rapportini non sono stati sincronizzati');
        }
      }
    } catch (error) {
      if (!options?.silent && error instanceof Error && /autenticat/i.test(error.message)) {
        toast.error('Accedi per sincronizzare i rapportini in coda');
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const installed = isStandaloneMode();
    setIsInstalled(installed);
    setIsOnline(navigator.onLine);
    setShowIosInstallHint(isIosDevice() && !installed);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosInstallHint(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      void syncNowRef.current({ silent: true });
      void registerBackgroundSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_OFFLINE_RAPPORTINI') {
        void syncNowRef.current({ silent: true });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    void refreshPendingCount();
    if (navigator.onLine) {
      void syncNowRef.current({ silent: true });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [refreshPendingCount]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider
      value={{
        canInstall: !!deferredPrompt && !isInstalled,
        showIosInstallHint,
        isInstalled,
        isOnline,
        pendingSyncCount,
        isSyncing,
        install,
        refreshPendingCount,
        syncNow,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  return useContext(PWAContext);
}
