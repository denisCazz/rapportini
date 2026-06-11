'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Rapportino, Cliente } from '@/types';
import { format } from 'date-fns';
import { auth } from '@/lib/auth';
import RapportinoStepIndicator from '@/components/rapportino/RapportinoStepIndicator';
import RapportinoStepTipologia from '@/components/rapportino/steps/RapportinoStepTipologia';
import RapportinoStepIntervento from '@/components/rapportino/steps/RapportinoStepIntervento';
import RapportinoStepFirme from '@/components/rapportino/steps/RapportinoStepFirme';
import RapportinoImageUpload, { type PendingImage } from '@/components/rapportino/RapportinoImageUpload';
import type { RapportinoImmagine } from '@/types';
import FormSectionHeader from '@/components/rapportino/FormSectionHeader';
import { api, fetchWithAuth, parseResponseBody, getApiErrorMessage } from '@/lib/api';
import { buildClienteIndirizzo } from '@/lib/rapportino-db';
import { Card } from '@/components/ui/card';
import {
  getDefaultRapportinoFormValues,
  rapportinoFormValuesSchema,
  rapportinoStep1Schema,
  rapportinoStep2Schema,
  rapportinoStep3Schema,
  rapportinoStep4Schema,
  rapportinoStep5Schema,
  RAPPORTINO_FORM_STEPS,
  firstIssueMessage,
  type RapportinoFormValues,
} from '@/lib/validators/rapportino-form';
import {
  saveDraft,
  getDraft,
  deleteDraft,
  debounce,
  parseRapportinoDraftPayload,
  type RapportinoDraftUiState,
} from '@/lib/drafts';
import {
  getCachedMarche,
  getCachedModelli,
  setCachedMarche,
  setCachedModelli,
} from '@/lib/catalog-cache';
import { usePWA } from '@/lib/pwa-context';

interface RapportinoFormProps {
  initialRapportino?: Rapportino;
  prefillInterventoId?: string;
  onSave: (
    rapportino: Rapportino,
    options?: { pendingImages?: File[] }
  ) => void | Promise<void | 'offline' | 'online'>;
  onCancel: () => void;
}

const NEW_RAPPORTINO_DRAFT_KEY = 'rapportino_new';
const TOTAL_STEPS = RAPPORTINO_FORM_STEPS;

/** Altezza footer fisso mobile: 2 pulsanti impilati + padding + safe area */
const MOBILE_FOOTER_OFFSET = 'calc(11rem + env(safe-area-inset-bottom, 0px))';

function syncMarcaModelloFromNames(
  marcaNome: string | undefined,
  modelloNome: string | undefined,
  marche: Array<{ id: string; nome: string }>,
  modelli: Array<{ id: string; nome: string; marca_id: string }>
): RapportinoDraftUiState {
  const ui: RapportinoDraftUiState = {};
  if (!marcaNome?.trim()) return ui;

  const foundMarca = marche.find((m) => m.nome.toLowerCase() === marcaNome.trim().toLowerCase());
  if (foundMarca) {
    ui.marcaId = foundMarca.id;
    ui.showMarcaInput = false;
    if (modelloNome?.trim()) {
      const foundModello = modelli.find(
        (m) => m.marca_id === foundMarca.id && m.nome.toLowerCase() === modelloNome.trim().toLowerCase()
      );
      if (foundModello) {
        ui.modelloId = foundModello.id;
        ui.showModelloInput = false;
      } else {
        ui.showModelloInput = true;
      }
    }
  } else {
    ui.showMarcaInput = true;
    if (modelloNome?.trim()) ui.showModelloInput = true;
  }
  return ui;
}

export default function RapportinoForm({
  initialRapportino,
  prefillInterventoId,
  onSave,
  onCancel,
}: RapportinoFormProps) {
  const [step, setStep] = useState(1);
  const [maxReachableStep, setMaxReachableStep] = useState(1);
  const draftIdRef = useRef(initialRapportino ? `edit_${initialRapportino.id}` : NEW_RAPPORTINO_DRAFT_KEY);
  const clientiListRef = useRef<HTMLDivElement | null>(null);
  const [pendingDraft, setPendingDraft] = useState<ReturnType<typeof getDraft> | null>(() => {
    if (initialRapportino || prefillInterventoId || typeof window === 'undefined') return null;
    return getDraft(NEW_RAPPORTINO_DRAFT_KEY);
  });
  const [draftResolved, setDraftResolved] = useState(() => {
    if (initialRapportino || prefillInterventoId) return true;
    if (typeof window === 'undefined') return true;
    return !getDraft(NEW_RAPPORTINO_DRAFT_KEY);
  });
  const [operatoreFirmaFromProfile, setOperatoreFirmaFromProfile] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [existingImages, setExistingImages] = useState<RapportinoImmagine[]>([]);
  const { register, watch, setValue, getValues, reset, handleSubmit: submitWithRhf } = useForm<RapportinoFormValues>({
    defaultValues: getDefaultRapportinoFormValues(initialRapportino),
  });

  const operatore = watch('operatore');
  const cliente = watch('cliente');
  const intervento = watch('intervento');

  useEffect(() => {
    reset(getDefaultRapportinoFormValues(initialRapportino));
  }, [initialRapportino?.id, reset, initialRapportino]);

  useEffect(() => {
    if (!initialRapportino?.id) {
      setExistingImages([]);
      return;
    }
    let cancelled = false;
    api.getRapportinoImmagini(initialRapportino.id).then((imgs) => {
      if (!cancelled) setExistingImages(imgs);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [initialRapportino?.id]);

  // Carica dati operatore + firma salvata (profilo / API) — solo se non c'è bozza in sospeso
  useEffect(() => {
    if (initialRapportino || !draftResolved) return;

    let cancelled = false;

    const applyOperatoreFirma = (firma: string) => {
      if (!firma || cancelled) return;
      const current = getValues('intervento.firmaOperatore');
      if (!current?.trim()) {
        setValue('intervento.firmaOperatore', firma, { shouldDirty: false });
        setOperatoreFirmaFromProfile(true);
      }
    };

    const load = async () => {
      const user = auth.getUser();
      if (!user) return;

      setValue('operatore', {
        nome: user.nome || '',
        cognome: user.cognome || '',
        telefono: user.telefono || '',
        email: user.email || '',
        qualifica: user.qualifica || '',
      });

      if (user.firma) {
        applyOperatoreFirma(user.firma);
      }

      try {
        const response = await fetchWithAuth(`/api/users/${user.id}`);
        const profile = await parseResponseBody<{
          firma?: string | null;
          nome?: string;
          cognome?: string;
          telefono?: string | null;
          email?: string | null;
          qualifica?: string | null;
        }>(response);
        if (cancelled || !response.ok || !profile) return;

        if (profile.firma) {
          applyOperatoreFirma(profile.firma);
          auth.updateUser({ ...user, firma: profile.firma });
        }
      } catch {
        // Profilo locale sufficiente se API non disponibile
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialRapportino, draftResolved, setValue, getValues]);

  // Precarica dati da intervento pianificato (cliente, data, motivo)
  useEffect(() => {
    if (!prefillInterventoId || initialRapportino) return;

    deleteDraft(NEW_RAPPORTINO_DRAFT_KEY);
    setPendingDraft(null);
    setDraftResolved(true);

    let cancelled = false;

    const loadPrefill = async () => {
      try {
        const { prefill, titolo } = await api.getInterventoPianificatoPrefill(prefillInterventoId);
        if (cancelled) return;

        if (prefill.cliente) {
          for (const [key, value] of Object.entries(prefill.cliente)) {
            setValue(`cliente.${key}` as `cliente.${keyof RapportinoFormValues['cliente'] & string}`, value, {
              shouldDirty: false,
            });
          }
        }

        if (prefill.intervento) {
          for (const [key, value] of Object.entries(prefill.intervento)) {
            setValue(`intervento.${key}` as `intervento.${keyof RapportinoFormValues['intervento'] & string}`, value, {
              shouldDirty: false,
            });
          }
        }

        toast.success(`Dati precaricati da "${titolo}"`);
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Errore nel precaricamento');
        }
      }
    };

    void loadPrefill();
    return () => {
      cancelled = true;
    };
  }, [prefillInterventoId, initialRapportino, setValue]);
  const [clientiEsistenti, setClientiEsistenti] = useState<Cliente[]>([]);
  const [showClientiList, setShowClientiList] = useState(false);
  const [isSearchingClienti, setIsSearchingClienti] = useState(false);
  
  // Stati per marche, modelli e materiali
  const [marche, setMarche] = useState<Array<{ id: string; nome: string }>>([]);
  const [modelli, setModelli] = useState<Array<{ id: string; nome: string; marca_id: string }>>([]);
  const [materiali, setMateriali] = useState<Array<{ id: string; nome: string; descrizione?: string; modello_id: string }>>([]);
  const [selectedMateriali, setSelectedMateriali] = useState<string[]>([]);
  const [marcaId, setMarcaId] = useState<string>('');
  const [modelloId, setModelloId] = useState<string>('');
  const [showMarcaInput, setShowMarcaInput] = useState(false);
  const [showModelloInput, setShowModelloInput] = useState(false);
  const [showMaterialeInput, setShowMaterialeInput] = useState(false);
  const [newMaterialeNome, setNewMaterialeNome] = useState('');
  const { isOnline } = usePWA();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const buildDraftPayload = useCallback(
    () => ({
      form: getValues(),
      ui: {
        marcaId: marcaId || undefined,
        modelloId: modelloId || undefined,
        selectedMateriali,
        showMarcaInput,
        showModelloInput,
      } satisfies RapportinoDraftUiState,
    }),
    [getValues, marcaId, modelloId, selectedMateriali, showMarcaInput, showModelloInput]
  );

  const persistDraft = useMemo(
    () =>
      debounce(() => {
        if (initialRapportino || !draftResolved) return;
        saveDraft(draftIdRef.current, buildDraftPayload(), step);
      }, 2000),
    [initialRapportino, draftResolved, buildDraftPayload, step]
  );

  useEffect(() => {
    if (initialRapportino || !draftResolved) return;
    const sub = watch(() => persistDraft());
    return () => sub.unsubscribe();
  }, [watch, persistDraft, initialRapportino, draftResolved]);

  useEffect(() => {
    if (initialRapportino || !draftResolved) return;
    saveDraft(draftIdRef.current, buildDraftPayload(), step);
  }, [step, initialRapportino, draftResolved, buildDraftPayload]);

  const goToStep = useCallback(
    (target: number) => {
      if (target < step || target <= maxReachableStep) {
        setStep(target);
      }
    },
    [step, maxReachableStep]
  );

  const applyDraftUiState = useCallback((ui?: RapportinoDraftUiState) => {
    if (!ui) return;
    if (ui.marcaId) setMarcaId(ui.marcaId);
    if (ui.modelloId) setModelloId(ui.modelloId);
    if (ui.selectedMateriali) setSelectedMateriali(ui.selectedMateriali);
    if (ui.showMarcaInput != null) setShowMarcaInput(ui.showMarcaInput);
    if (ui.showModelloInput != null) setShowModelloInput(ui.showModelloInput);
  }, []);

  const resumeDraft = async () => {
    if (!pendingDraft) return;

    const { form: rawForm, ui } = parseRapportinoDraftPayload(pendingDraft.data);
    const defaults = getDefaultRapportinoFormValues();
    const draftData: RapportinoFormValues = {
      operatore: { ...defaults.operatore, ...(rawForm.operatore as RapportinoFormValues['operatore'] | undefined) },
      cliente: { ...defaults.cliente, ...(rawForm.cliente as RapportinoFormValues['cliente'] | undefined) },
      intervento: { ...defaults.intervento, ...(rawForm.intervento as RapportinoFormValues['intervento'] | undefined) },
    };

    const draftStep = Math.min(Math.max(pendingDraft.step || 1, 1), TOTAL_STEPS);

    reset(draftData);
    setStep(draftStep);
    setMaxReachableStep(draftStep);
    applyDraftUiState(ui);

    // Bozze vecchie senza ui: ripristina marca/modello dai nomi salvati
    if (!ui?.marcaId && draftData.intervento.marca && marche.length > 0) {
      const synced = syncMarcaModelloFromNames(
        draftData.intervento.marca,
        draftData.intervento.modello,
        marche,
        modelli
      );
      applyDraftUiState(synced);
    }

    setOperatoreFirmaFromProfile(false);
    setPendingDraft(null);
    setDraftResolved(true);
    toast.success(`Bozza ripristinata — step ${draftStep} di ${TOTAL_STEPS}`);
  };

  const discardDraft = () => {
    deleteDraft(NEW_RAPPORTINO_DRAFT_KEY);
    setPendingDraft(null);
    setDraftResolved(true);
    reset(getDefaultRapportinoFormValues());
    setStep(1);
    setMaxReachableStep(1);
    setMarcaId('');
    setModelloId('');
    setSelectedMateriali([]);
    setShowMarcaInput(false);
    setShowModelloInput(false);
    toast.message('Bozza scartata');
  };

  // Cerca clienti esistenti quando nome e cognome sono inseriti
  useEffect(() => {
    const searchClienti = async () => {
      const nome = cliente.nome.trim();
      const cognome = cliente.cognome.trim();
      const queryComposta = `${nome} ${cognome}`.trim();
      const hasSearchText = nome.length >= 2 || cognome.length >= 2 || queryComposta.length >= 3;

      if (step === 3 && hasSearchText) {
        setIsSearchingClienti(true);
        try {
          const response = await fetchWithAuth(
            `/api/clienti/search?nome=${encodeURIComponent(nome)}&cognome=${encodeURIComponent(cognome)}&q=${encodeURIComponent(queryComposta)}`
          );
          if (response.ok) {
            const data = await parseResponseBody<Cliente[]>(response);
            if (Array.isArray(data)) {
              setClientiEsistenti(data);
              setShowClientiList(data.length > 0);
            }
          } else {
            setClientiEsistenti([]);
            setShowClientiList(false);
          }
        } catch (error) {
          console.error('Errore nella ricerca clienti:', error);
        } finally {
          setIsSearchingClienti(false);
        }
      } else {
        setClientiEsistenti([]);
        setShowClientiList(false);
      }
    };

    const timeoutId = setTimeout(searchClienti, 500); // Debounce di 500ms
    return () => clearTimeout(timeoutId);
  }, [cliente.nome, cliente.cognome, step]);

  // Chiudi la lista quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showClientiList && !target.closest('.clienti-list-container')) {
        setShowClientiList(false);
      }
    };

    if (showClientiList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showClientiList]);

  useEffect(() => {
    if (showClientiList && clientiEsistenti.length > 0) {
      requestAnimationFrame(() => {
        clientiListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [showClientiList, clientiEsistenti.length]);

  // Offline: input testuale diretto per marca/modello (senza catalogo API)
  useEffect(() => {
    if (!isOnline && !initialRapportino) {
      setShowMarcaInput(true);
      setShowModelloInput(true);
    }
  }, [isOnline, initialRapportino]);

  // Carica marche (cache locale prima, poi API se online)
  useEffect(() => {
    const cached = getCachedMarche();
    if (cached.length > 0) {
      setMarche(cached);
    }

    if (!isOnline) return;

    const loadMarche = async () => {
      try {
        const response = await fetchWithAuth('/api/marche');
        if (response.ok) {
          const data = await parseResponseBody<Array<{ id: string; nome: string }>>(response);
          if (Array.isArray(data)) {
            setMarche(data);
            setCachedMarche(data);
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento marche:', error);
      }
    };
    loadMarche();
  }, [isOnline]);

  // Dopo ripristino bozza: allinea marca/modello quando il catalogo è caricato
  useEffect(() => {
    if (!draftResolved || initialRapportino || pendingDraft || marcaId) return;
    const marcaNome = getValues('intervento.marca')?.trim();
    const modelloNome = getValues('intervento.modello')?.trim();
    if (!marcaNome || marche.length === 0) return;
    const synced = syncMarcaModelloFromNames(marcaNome, modelloNome, marche, modelli);
    if (synced.marcaId || synced.showMarcaInput) applyDraftUiState(synced);
  }, [
    draftResolved,
    initialRapportino,
    pendingDraft,
    marcaId,
    marche,
    modelli,
    getValues,
    applyDraftUiState,
  ]);

  // In modifica: preseleziona marca quando marche è caricata
  useEffect(() => {
    if (!initialRapportino?.intervento?.marca || marche.length === 0) return;
    const marcaNome = initialRapportino.intervento.marca.trim();
    const found = marche.find((m) => m.nome.toLowerCase() === marcaNome.toLowerCase());
    if (found) {
      setMarcaId(found.id);
      setShowMarcaInput(false);
    } else {
      setMarcaId('');
      setShowMarcaInput(true);
      if (initialRapportino.intervento.modello) setShowModelloInput(true);
    }
  }, [initialRapportino?.intervento?.marca, initialRapportino?.intervento?.modello, marche]);

  // In modifica: preseleziona modello quando modelli è caricato
  useEffect(() => {
    if (!initialRapportino?.intervento?.modello || !marcaId) return;
    if (modelli.length === 0) {
      setShowModelloInput(true);
      return;
    }
    const modelloNome = initialRapportino.intervento.modello.trim();
    const found = modelli.find((m) => m.nome.toLowerCase() === modelloNome.toLowerCase());
    if (found) {
      setModelloId(found.id);
      setShowModelloInput(false);
    } else {
      setShowModelloInput(true);
    }
  }, [initialRapportino?.intervento?.modello, modelli, marcaId]);

  // Carica modelli quando cambia la marca (cache locale + API se online)
  useEffect(() => {
    const loadModelli = async () => {
      if (marcaId) {
        const cached = getCachedModelli(marcaId);
        if (cached.length > 0) {
          setModelli(cached);
        }

        if (!isOnline) return;

        try {
          const response = await fetchWithAuth(`/api/modelli?marca_id=${marcaId}`);
          if (response.ok) {
            const data = await parseResponseBody<Array<{ id: string; nome: string; marca_id: string }>>(response);
            if (Array.isArray(data)) {
              setModelli(data);
              setCachedModelli(marcaId, data);
            }
          }
        } catch (error) {
          console.error('Errore nel caricamento modelli:', error);
        }
      } else {
        setModelli([]);
        setModelloId('');
        if (!initialRapportino) {
          setValue('intervento.modello', '');
        }
        setMateriali([]);
        setSelectedMateriali([]);
      }
    };
    loadModelli();
  }, [marcaId, initialRapportino, isOnline]);

  // Carica materiali quando cambia il modello
  useEffect(() => {
    const loadMateriali = async () => {
      if (modelloId) {
        try {
          const response = await fetchWithAuth(`/api/materiali?modello_id=${modelloId}`);
          if (response.ok) {
            const data = await parseResponseBody<Array<{ id: string; nome: string; descrizione?: string; modello_id: string }>>(response);
            if (Array.isArray(data)) {
              setMateriali(data);
            }
          }
        } catch (error) {
          console.error('Errore nel caricamento materiali:', error);
        }
      } else {
        setMateriali([]);
        setSelectedMateriali([]);
      }
    };
    loadMateriali();
  }, [modelloId]);

  const handleSelectCliente = (c: Cliente) => {
    setValue('cliente', {
      nome: c.nome,
      cognome: c.cognome,
      ragioneSociale: (c.ragioneSociale as string | undefined) || cliente.ragioneSociale || '',
      via: c.via || c.indirizzo || '',
      numeroCivico: c.numeroCivico || '',
      indirizzo: c.indirizzo,
      citta: c.citta,
      cap: c.cap,
      provincia: c.provincia || '',
      telefono: c.telefono,
      email: (c.email as string | undefined) || cliente.email || '',
      partitaIva: (c.partitaIva as string | undefined) || cliente.partitaIva || '',
      codiceFiscale: (c.codiceFiscale as string | undefined) || cliente.codiceFiscale || '',
    });
    setShowClientiList(false);
    setClientiEsistenti([]);
  };

  const validateStep = (): boolean => {
    const v = getValues();
    if (step === 1) {
      const r = rapportinoStep1Schema.safeParse(v);
      if (!r.success) toast.error(firstIssueMessage(r.error));
      return r.success;
    }
    if (step === 2) {
      const r = rapportinoStep2Schema.safeParse(v);
      if (!r.success) toast.error(firstIssueMessage(r.error));
      return r.success;
    }
    if (step === 3) {
      const r = rapportinoStep3Schema.safeParse(v);
      if (!r.success) toast.error(firstIssueMessage(r.error));
      return r.success;
    }
    if (step === 4) {
      const r = rapportinoStep4Schema.safeParse(v);
      if (!r.success) toast.error(firstIssueMessage(r.error));
      return r.success;
    }
    if (step === 5) {
      const r = rapportinoStep5Schema.safeParse(v);
      if (!r.success) toast.error(firstIssueMessage(r.error));
      return r.success;
    }
    return false;
  };

  const onSaveValid = async (values: RapportinoFormValues): Promise<'offline' | 'online' | false> => {
    const materialiSelezionati = selectedMateriali
      .map((id) => {
        const materiale = materiali.find((m) => m.id === id);
        return materiale ? materiale.nome : null;
      })
      .filter(Boolean)
      .join(', ');

    const materialiFinali = [materialiSelezionati, values.intervento.materialiUtilizzati || '']
      .filter(Boolean)
      .join('; ');

    const fullCheck = rapportinoFormValuesSchema.safeParse({
      ...values,
      intervento: {
        ...values.intervento,
        materialiUtilizzati: materialiFinali || values.intervento.materialiUtilizzati,
      },
    });
    if (!fullCheck.success) {
      toast.error(firstIssueMessage(fullCheck.error));
      return false;
    }

    const clienteSalvato = {
      ...fullCheck.data.cliente,
      indirizzo: buildClienteIndirizzo(fullCheck.data.cliente),
    };

    const rapportino: Rapportino = {
      id: initialRapportino?.id ?? `rapp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      operatore: fullCheck.data.operatore,
      cliente: clienteSalvato,
      intervento: {
        ...fullCheck.data.intervento,
        descrizione:
          fullCheck.data.intervento.motivoChiamata ||
          fullCheck.data.intervento.descrizione ||
          '',
        materialiUtilizzati: materialiFinali || undefined,
      },
      dataCreazione: initialRapportino?.dataCreazione ?? new Date().toISOString(),
    };

    deleteDraft(draftIdRef.current);
    const files = pendingImages.map((p) => p.file);
    const result = await onSave(rapportino, files.length ? { pendingImages: files } : undefined);
    return result === 'offline' ? 'offline' : 'online';
  };

  const handleConfirmSave = () => {
    if (!validateStep()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    const toastId = toast.loading('Salvataggio rapportino…');
    submitWithRhf(async (values) => {
      try {
        const result = await onSaveValid(values);
        if (result === false) {
          toast.dismiss(toastId);
          return;
        }
        if (result === 'offline') {
          toast.success('Rapportino salvato in locale. Verrà inviato alla riconnessione.', { id: toastId });
          return;
        }
        toast.success('Rapportino salvato', { id: toastId });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Errore nel salvataggio', { id: toastId });
      }
    })();
  };

  const handleNextStep = () => {
    if (!validateStep()) return;
    const next = step + 1;
    setStep(next);
    setMaxReachableStep((prev) => Math.max(prev, next));
  };

  return (
    <Card className="mb-8 p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-3 mb-5 sm:mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-3xl font-bold text-surface-900 dark:text-white mb-1 tracking-tight">{initialRapportino ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 font-medium">Compila tutti i campi obbligatori per creare un nuovo rapportino</p>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 flex items-center justify-center min-w-11 min-h-11 p-2.5 text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-all hover:text-surface-900 dark:hover:text-white"
            aria-label="Chiudi"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <RapportinoStepIndicator
          step={step}
          maxReachableStep={maxReachableStep}
          onStepClick={goToStep}
        />
      </div>

      {!initialRapportino && pendingDraft && (
        <div className="mb-6 flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Hai una bozza salvata allo step {pendingDraft.step || 1} di {TOTAL_STEPS}. Vuoi riprendere da dove avevi lasciato?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resumeDraft}
              className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white hover:bg-primary-600"
            >
              Riprendi
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 dark:border-amber-700 dark:text-amber-100"
            >
              Scarta
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6 pb-2 sm:pb-0">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-6 bg-surface-50/50 dark:bg-surface-800/30 p-3 sm:p-4 rounded-md border border-surface-100 dark:border-surface-700/50">
            <div className="shrink-0 p-2.5 sm:p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl shadow-inner">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white">Dati Operatore</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 font-medium">Inserisci le informazioni dell&apos;operatore che esegue l&apos;intervento</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('operatore.nome')}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Cognome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('operatore.cognome')}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Telefono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('operatore.telefono')}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                {...register('operatore.email')}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Qualifica <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('operatore.qualifica')}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground scroll-mb-[calc(11rem+env(safe-area-inset-bottom,0px))]"
                placeholder="Es. Tecnico specializzato"
                required
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <RapportinoStepTipologia intervento={intervento} setValue={setValue} />
      )}

      {step === 3 && (
        <div className="space-y-6">
          <FormSectionHeader
            iconClassName="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="Dati Cliente"
            description="Inserisci le informazioni del cliente per cui viene eseguito l'intervento"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.nome}
                onChange={(e) => {
                  setValue('cliente.nome', e.target.value);
                  setShowClientiList(true);
                }}
                onFocus={() => {
                  if (clientiEsistenti.length > 0) {
                    setShowClientiList(true);
                  }
                }}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
                required
              />
              {isSearchingClienti && (
                <div className="absolute right-4 top-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Cognome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.cognome}
                onChange={(e) => {
                  setValue('cliente.cognome', e.target.value);
                  setShowClientiList(true);
                }}
                onFocus={() => {
                  if (clientiEsistenti.length > 0) {
                    setShowClientiList(true);
                  }
                }}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
                required
              />
            </div>
            
            {/* Lista clienti esistenti */}
            {showClientiList && clientiEsistenti.length > 0 && (
              <div ref={clientiListRef} className="md:col-span-2 relative z-10 clienti-list-container">
                <div className="mt-2 max-h-48 overflow-y-auto overscroll-contain rounded-md border border-border bg-card shadow-md sm:max-h-64">
                  <div className="p-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
                    <p className="text-xs font-bold text-surface-700 dark:text-surface-300 flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Trovati {clientiEsistenti.length} cliente{clientiEsistenti.length > 1 ? 'i' : ''} esistente{clientiEsistenti.length > 1 ? 'i' : ''} - Seleziona per precompilare i dati
                    </p>
                  </div>
                  <div className="divide-y divide-surface-100 dark:divide-surface-700">
                    {clientiEsistenti.map((clienteEsistente) => (
                      <button
                        key={clienteEsistente.nome + clienteEsistente.cognome + clienteEsistente.telefono}
                        type="button"
                        onClick={() => handleSelectCliente(clienteEsistente)}
                        className="w-full text-left p-4 min-h-11 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-surface-900 dark:text-white">
                              {clienteEsistente.nome} {clienteEsistente.cognome}
                              {clienteEsistente.ragioneSociale && (
                                <span className="text-sm font-medium text-surface-500 dark:text-surface-400 ml-2">
                                  • {clienteEsistente.ragioneSociale}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 font-medium">
                              {clienteEsistente.indirizzo}, {clienteEsistente.citta} ({clienteEsistente.cap})
                            </p>
                            <p className="text-sm text-surface-500 dark:text-surface-500 mt-1 font-medium">
                              📞 {clienteEsistente.telefono}
                              {clienteEsistente.email && ` • ✉️ ${clienteEsistente.email}`}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowClientiList(false);
                        setClientiEsistenti([]);
                      }}
                      className="text-xs font-bold text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
                    >
                      Continua con nuovo cliente
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Ragione Sociale
              </label>
              <input
                type="text"
                value={cliente.ragioneSociale}
                onChange={(e) => setValue('cliente.ragioneSociale', e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Via <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.via || ''}
                onChange={(e) => setValue('cliente.via', e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Numero civico
              </label>
              <input
                type="text"
                value={cliente.numeroCivico || ''}
                onChange={(e) => setValue('cliente.numeroCivico', e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Località <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.citta}
                onChange={(e) => setValue('cliente.citta', e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Provincia
              </label>
              <input
                type="text"
                value={cliente.provincia || ''}
                onChange={(e) => setValue('cliente.provincia', e.target.value)}
                maxLength={2}
                placeholder="Es. MI"
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Telefono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={cliente.telefono}
                onChange={(e) => setValue('cliente.telefono', e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={cliente.email}
                onChange={(e) => setValue('cliente.email', e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Partita IVA
              </label>
              <input
                type="text"
                value={cliente.partitaIva}
                onChange={(e) => setValue('cliente.partitaIva', e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Codice Fiscale
              </label>
              <input
                type="text"
                value={cliente.codiceFiscale}
                onChange={(e) => setValue('cliente.codiceFiscale', e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground bg-background placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <>
          <RapportinoStepIntervento
            intervento={intervento}
            setValue={setValue}
            marche={marche}
            modelli={modelli}
            materiali={materiali}
            marcaId={marcaId}
            modelloId={modelloId}
            showMarcaInput={showMarcaInput}
            showModelloInput={showModelloInput}
            selectedMateriali={selectedMateriali}
            showMaterialeInput={showMaterialeInput}
            newMaterialeNome={newMaterialeNome}
            setMarcaId={setMarcaId}
            setModelloId={setModelloId}
            setShowMarcaInput={setShowMarcaInput}
            setShowModelloInput={setShowModelloInput}
            setMarche={setMarche}
            setModelli={setModelli}
            setMateriali={setMateriali}
            setSelectedMateriali={setSelectedMateriali}
            setShowMaterialeInput={setShowMaterialeInput}
            setNewMaterialeNome={setNewMaterialeNome}
          />
          <div className="mt-6">
            <RapportinoImageUpload
              rapportinoId={initialRapportino?.id}
              pendingImages={pendingImages}
              onPendingImagesChange={setPendingImages}
              existingImages={existingImages}
              onExistingImagesChange={setExistingImages}
            />
          </div>
        </>
      )}

      {step === 5 && (
        <RapportinoStepFirme
          intervento={intervento}
          operatoreFirmaFromProfile={operatoreFirmaFromProfile}
          setOperatoreFirmaFromProfile={setOperatoreFirmaFromProfile}
          setValue={setValue}
        />
      )}


      <div
        className="sm:hidden"
        style={{ height: MOBILE_FOOTER_OFFSET }}
        aria-hidden
      />

      <div className="fixed bottom-0 left-0 right-0 z-[45] border-t border-surface-200 bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-surface-700 sm:static sm:z-auto sm:mt-10 sm:border-t sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-4xl flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-surface-200 px-8 py-4 font-medium text-surface-700 transition-all hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800/50 sm:w-auto"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Indietro
          </button>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-8 py-4 font-medium text-white  transition-all hover:bg-primary-600 sm:w-auto"
            >
              Avanti
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmSave}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-8 py-4 font-medium text-white  transition-all hover:bg-emerald-600 sm:w-auto"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Salva Rapportino
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
