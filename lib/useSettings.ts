'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from './auth';
import { api } from './api';
import { storage } from './storage';
import type { AziendaSettings } from '@/types';

export function useSettings() {
  const [settings, setSettings] = useState<AziendaSettings>(() => storage.getSettings());

  const loadSettings = useCallback(async () => {
    const local = storage.getSettings();
    if (!auth.isAuthenticated()) {
      setSettings(local);
      return;
    }
    try {
      const apiSettings = await api.getSettings();
      const merged: AziendaSettings = {
        ...local,
        nomeAzienda: apiSettings.nomeAzienda ?? local.nomeAzienda,
        logo: apiSettings.logo ?? local.logo,
        indirizzo: apiSettings.indirizzo ?? local.indirizzo,
        partitaIva: apiSettings.partitaIva ?? local.partitaIva,
      };
      setSettings(merged);
    } catch {
      setSettings(local);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback((newSettings: Partial<AziendaSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (newSettings.darkMode !== undefined) {
      storage.saveSettings(updated);
    }
  }, [settings]);

  return { settings, setSettings: saveSettings, loadSettings };
}
