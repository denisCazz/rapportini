// Sistema di salvataggio bozze automatico
// Salva le bozze in localStorage per recuperarle in caso di chiusura accidentale

const DRAFTS_KEY = 'rapportino_drafts';
const DELETED_KEY = 'rapportino_deleted';
const MAX_DELETED_ITEMS = 10;
const DELETED_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 ore

export interface Draft {
  id: string;
  data: any;
  timestamp: number;
  step: number;
}

export interface DeletedItem {
  id: string;
  data: any;
  deletedAt: number;
}

// Salva una bozza
export function saveDraft(draftId: string, data: any, step: number = 0): void {
  if (typeof window === 'undefined') return;
  
  try {
    const drafts = getDrafts();
    const draft: Draft = {
      id: draftId,
      data,
      timestamp: Date.now(),
      step,
    };
    
    // Aggiorna o aggiungi la bozza
    const existingIndex = drafts.findIndex(d => d.id === draftId);
    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }
    
    // Mantieni solo le ultime 5 bozze
    const sortedDrafts = drafts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(sortedDrafts));
  } catch (error) {
    console.error('Errore nel salvataggio della bozza:', error);
  }
}

// Ottieni tutte le bozze
export function getDrafts(): Draft[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const draftsJson = localStorage.getItem(DRAFTS_KEY);
    return draftsJson ? JSON.parse(draftsJson) : [];
  } catch {
    return [];
  }
}

// Ottieni una bozza specifica
export function getDraft(draftId: string): Draft | null {
  const drafts = getDrafts();
  return drafts.find(d => d.id === draftId) || null;
}

// Elimina una bozza
export function deleteDraft(draftId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const drafts = getDrafts().filter(d => d.id !== draftId);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Errore nell\'eliminazione della bozza:', error);
  }
}

// Elimina tutte le bozze
export function clearDrafts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRAFTS_KEY);
}

// ============================================
// UNDO ELIMINAZIONI
// ============================================

// Salva un elemento eliminato per possibile ripristino
export function saveDeletedItem(id: string, data: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    const deleted = getDeletedItems();
    const item: DeletedItem = {
      id,
      data,
      deletedAt: Date.now(),
    };
    
    // Aggiungi in cima
    deleted.unshift(item);
    
    // Mantieni solo gli ultimi N elementi e rimuovi quelli scaduti
    const now = Date.now();
    const validItems = deleted
      .filter(d => now - d.deletedAt < DELETED_EXPIRY_MS)
      .slice(0, MAX_DELETED_ITEMS);
    
    localStorage.setItem(DELETED_KEY, JSON.stringify(validItems));
  } catch (error) {
    console.error('Errore nel salvataggio dell\'elemento eliminato:', error);
  }
}

// Ottieni tutti gli elementi eliminati
export function getDeletedItems(): DeletedItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const deletedJson = localStorage.getItem(DELETED_KEY);
    const items: DeletedItem[] = deletedJson ? JSON.parse(deletedJson) : [];
    
    // Filtra elementi scaduti
    const now = Date.now();
    return items.filter(d => now - d.deletedAt < DELETED_EXPIRY_MS);
  } catch {
    return [];
  }
}

// Ottieni l'ultimo elemento eliminato
export function getLastDeletedItem(): DeletedItem | null {
  const items = getDeletedItems();
  return items.length > 0 ? items[0] : null;
}

// Rimuovi un elemento dalla lista degli eliminati (dopo il ripristino)
export function removeDeletedItem(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const deleted = getDeletedItems().filter(d => d.id !== id);
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
  } catch (error) {
    console.error('Errore nella rimozione dell\'elemento eliminato:', error);
  }
}

// Pulisci tutti gli elementi eliminati
export function clearDeletedItems(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DELETED_KEY);
}

// ============================================
// HOOK HELPERS
// ============================================

// Debounce per salvataggio automatico
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Genera un ID univoco per le bozze
export function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
