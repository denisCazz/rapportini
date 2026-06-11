import { api } from '@/lib/api';
import {
  listPendingRapportini,
  pendingImageToFile,
  removePendingRapportino,
  updatePendingRapportino,
  type PendingRapportino,
} from '@/lib/offline-queue';

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error) {
    return /failed to fetch|network|load failed|offline|non raggiungibile|503/i.test(error.message);
  }
  return false;
}

function isAuthFailure(error: unknown): boolean {
  return error instanceof Error && /non autenticato|401|403|login/i.test(error.message);
}

async function syncSingleEntry(entry: PendingRapportino): Promise<void> {
  const result = await api.createRapportino(entry.rapportino);

  if (entry.images.length > 0) {
    const files = entry.images.map(pendingImageToFile);
    await api.uploadRapportinoImmagini(result.id, files);
  }

  if (entry.interventoId) {
    try {
      await api.completaInterventoPianificato(entry.interventoId);
    } catch {
      // Il rapportino è stato creato; il completamento può essere ritentato manualmente
    }
  }
}

export async function syncPendingRapportini(): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const remaining = await listPendingRapportini();
    return { synced: 0, failed: 0, remaining: remaining.length };
  }

  const pending = await listPendingRapportini();
  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      await syncSingleEntry(entry);
      await removePendingRapportino(entry.localId);
      synced += 1;
    } catch (error) {
      if (isAuthFailure(error)) {
        throw error;
      }

      if (isNetworkFailure(error)) {
        break;
      }

      failed += 1;
      await updatePendingRapportino({
        ...entry,
        attempts: entry.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Errore di sincronizzazione',
      });
    }
  }

  const remaining = await listPendingRapportini();
  return { synced, failed, remaining: remaining.length };
}

export async function registerBackgroundSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }).sync.register('sync-rapportini');
    }
  } catch {
    // Background Sync non supportato (es. Safari iOS)
  }
}
