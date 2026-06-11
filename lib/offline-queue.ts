import type { Rapportino } from '@/types';

const DB_NAME = 'bitora-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-rapportini';

export interface PendingRapportinoImage {
  name: string;
  type: string;
  data: ArrayBuffer;
}

export interface PendingRapportino {
  localId: string;
  rapportino: Rapportino;
  images: PendingRapportinoImage[];
  interventoId?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface EnqueueRapportinoOptions {
  pendingImages?: File[];
  interventoId?: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponibile'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Errore apertura IndexedDB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
    };
  });
}

async function fileToPendingImage(file: File): Promise<PendingRapportinoImage> {
  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    data: await file.arrayBuffer(),
  };
}

export function createLocalRapportinoId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function enqueueRapportino(
  rapportino: Rapportino,
  options?: EnqueueRapportinoOptions
): Promise<PendingRapportino> {
  const images = options?.pendingImages?.length
    ? await Promise.all(options.pendingImages.map(fileToPendingImage))
    : [];

  const entry: PendingRapportino = {
    localId: createLocalRapportinoId(),
    rapportino: {
      ...rapportino,
      id: rapportino.id.startsWith('rapp_') || rapportino.id.startsWith('offline_')
        ? createLocalRapportinoId()
        : rapportino.id,
    },
    images,
    interventoId: options?.interventoId,
    createdAt: Date.now(),
    attempts: 0,
  };

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Errore scrittura coda offline'));
    };
    tx.objectStore(STORE_NAME).put(entry);
  });

  return entry;
}

export async function listPendingRapportini(): Promise<PendingRapportino[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const items = (request.result as PendingRapportino[]).sort((a, b) => a.createdAt - b.createdAt);
      resolve(items);
    };
    request.onerror = () => reject(request.error ?? new Error('Errore lettura coda offline'));
    tx.oncomplete = () => db.close();
  });
}

export async function countPendingRapportini(): Promise<number> {
  const items = await listPendingRapportini();
  return items.length;
}

export async function updatePendingRapportino(entry: PendingRapportino): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Errore aggiornamento coda offline'));
    };
    tx.objectStore(STORE_NAME).put(entry);
  });
}

export async function removePendingRapportino(localId: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Errore rimozione coda offline'));
    };
    tx.objectStore(STORE_NAME).delete(localId);
  });
}

export function pendingImageToFile(image: PendingRapportinoImage): File {
  return new File([image.data], image.name, { type: image.type });
}
