'use client';

import { usePWA } from '@/lib/pwa-context';
import { Button } from '@/components/ui/button';
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';

export default function OfflineStatusBanner() {
  const { isOnline, pendingSyncCount, isSyncing, syncNow } = usePWA();

  if (isOnline && pendingSyncCount === 0) {
    return null;
  }

  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm">
          {!isOnline ? (
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Wifi className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <p>
            {!isOnline
              ? 'Sei offline. I nuovi rapportini verranno salvati in locale e inviati alla riconnessione.'
              : `${pendingSyncCount} rapportin${pendingSyncCount === 1 ? 'o' : 'i'} in attesa di sincronizzazione.`}
          </p>
        </div>
        {isOnline && pendingSyncCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-300 bg-white/80 hover:bg-white dark:border-amber-800 dark:bg-amber-950/60"
            onClick={() => void syncNow()}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden />
            {isSyncing ? 'Sincronizzazione…' : 'Sincronizza ora'}
          </Button>
        )}
      </div>
    </div>
  );
}
