import { Rapportino, AziendaSettings } from '@/types';

const STORAGE_KEY_RAPPORTINI = 'rapportini_stufe';
const STORAGE_KEY_SETTINGS = 'azienda_settings';

export const storage = {
  // Rapportini
  getRapportini: (): Rapportino[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY_RAPPORTINI);
    return data ? JSON.parse(data) : [];
  },

  saveRapportino: (rapportino: Rapportino): void => {
    if (typeof window === 'undefined') return;
    const rapportini = storage.getRapportini();
    rapportini.push(rapportino);
    localStorage.setItem(STORAGE_KEY_RAPPORTINI, JSON.stringify(rapportini));
  },

  deleteRapportino: (id: string): void => {
    if (typeof window === 'undefined') return;
    const rapportini = storage.getRapportini();
    const filtered = rapportini.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY_RAPPORTINI, JSON.stringify(filtered));
  },

  exportRapportini: (): string => {
    const rapportini = storage.getRapportini();
    return JSON.stringify(rapportini, null, 2);
  },

  importRapportini: (data: string): boolean => {
    try {
      const rapportini = JSON.parse(data);
      if (Array.isArray(rapportini)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_RAPPORTINI, JSON.stringify(rapportini));
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Settings
  getSettings: (): AziendaSettings => {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return data ? JSON.parse(data) : {};
  },

  saveSettings: (settings: AziendaSettings): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  },
};
