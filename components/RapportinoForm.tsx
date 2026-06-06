'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Rapportino, Cliente } from '@/types';
import { format } from 'date-fns';
import { auth } from '@/lib/auth';
import SignaturePad from '@/components/SignaturePad';
import RapportinoStepIndicator from '@/components/rapportino/RapportinoStepIndicator';
import { fetchWithAuth, parseResponseBody, getApiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/card';
import {
  getDefaultRapportinoFormValues,
  rapportinoFormValuesSchema,
  rapportinoStep1Schema,
  rapportinoStep2Schema,
  rapportinoStep3Schema,
  firstIssueMessage,
  type RapportinoFormValues,
} from '@/lib/validators/rapportino-form';
import { saveDraft, getDraft, deleteDraft, debounce } from '@/lib/drafts';

interface RapportinoFormProps {
  initialRapportino?: Rapportino;
  onSave: (rapportino: Rapportino) => void;
  onCancel: () => void;
}

const DEFAULT_TIPI_INTERVENTO = [
  'Manutenzione',
  'Riparazione',
  'Installazione',
  'Pulizia',
  'Controllo',
];

const NEW_RAPPORTINO_DRAFT_KEY = 'rapportino_new';

export default function RapportinoForm({ initialRapportino, onSave, onCancel }: RapportinoFormProps) {
  const [step, setStep] = useState(1);
  const [maxReachableStep, setMaxReachableStep] = useState(1);
  const draftIdRef = useRef(initialRapportino ? `edit_${initialRapportino.id}` : NEW_RAPPORTINO_DRAFT_KEY);
  const [pendingDraft, setPendingDraft] = useState<ReturnType<typeof getDraft> | null>(null);
  const [operatoreFirmaFromProfile, setOperatoreFirmaFromProfile] = useState(false);
  const { register, watch, setValue, getValues, reset, handleSubmit: submitWithRhf } = useForm<RapportinoFormValues>({
    defaultValues: getDefaultRapportinoFormValues(initialRapportino),
  });

  const operatore = watch('operatore');
  const cliente = watch('cliente');
  const intervento = watch('intervento');

  useEffect(() => {
    reset(getDefaultRapportinoFormValues(initialRapportino));
  }, [initialRapportino?.id, reset, initialRapportino]);

  // Carica dati operatore + firma salvata (profilo / API)
  useEffect(() => {
    if (initialRapportino) return;

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
  }, [initialRapportino, setValue, getValues]);
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
  const [tipiIntervento, setTipiIntervento] = useState<string[]>(DEFAULT_TIPI_INTERVENTO);
  const [showTipoInterventoInput, setShowTipoInterventoInput] = useState(false);
  const [newTipoIntervento, setNewTipoIntervento] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    if (initialRapportino) return;
    const existing = getDraft(NEW_RAPPORTINO_DRAFT_KEY);
    if (existing) setPendingDraft(existing);
  }, [initialRapportino]);

  const persistDraft = useMemo(
    () =>
      debounce(() => {
        if (initialRapportino) return;
        saveDraft(draftIdRef.current, getValues(), step);
      }, 2000),
    [initialRapportino, getValues, step]
  );

  useEffect(() => {
    if (initialRapportino) return;
    const sub = watch(() => persistDraft());
    return () => sub.unsubscribe();
  }, [watch, persistDraft, initialRapportino]);

  useEffect(() => {
    if (initialRapportino) return;
    saveDraft(draftIdRef.current, getValues(), step);
  }, [step, initialRapportino, getValues]);

  const goToStep = useCallback(
    (target: number) => {
      if (target < step || target <= maxReachableStep) {
        setStep(target);
      }
    },
    [step, maxReachableStep]
  );

  const resumeDraft = async () => {
    if (!pendingDraft) return;
    const draftData = { ...(pendingDraft.data as RapportinoFormValues) };
    const user = auth.getUser();

    if (user && !draftData.intervento?.firmaOperatore?.trim()) {
      let firma = user.firma || '';
      if (!firma) {
        try {
          const response = await fetchWithAuth(`/api/users/${user.id}`);
          const profile = await parseResponseBody<{ firma?: string | null }>(response);
          if (response.ok && profile?.firma) firma = profile.firma;
        } catch {
          /* ignore */
        }
      }
      if (firma) {
        draftData.intervento = { ...draftData.intervento, firmaOperatore: firma };
        setOperatoreFirmaFromProfile(true);
      }
    }

    reset(draftData);
    setStep(pendingDraft.step || 1);
    setMaxReachableStep(Math.max(pendingDraft.step || 1, maxReachableStep));
    setPendingDraft(null);
    toast.success('Bozza ripristinata');
  };

  const discardDraft = () => {
    deleteDraft(NEW_RAPPORTINO_DRAFT_KEY);
    setPendingDraft(null);
  };

  // Cerca clienti esistenti quando nome e cognome sono inseriti
  useEffect(() => {
    const searchClienti = async () => {
      const nome = cliente.nome.trim();
      const cognome = cliente.cognome.trim();
      const queryComposta = `${nome} ${cognome}`.trim();
      const hasSearchText = nome.length >= 2 || cognome.length >= 2 || queryComposta.length >= 3;

      if (step === 2 && hasSearchText) {
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

  // Carica marche al mount
  useEffect(() => {
    const loadMarche = async () => {
      try {
        const response = await fetchWithAuth('/api/marche');
        if (response.ok) {
          const data = await parseResponseBody<Array<{ id: string; nome: string }>>(response);
          if (Array.isArray(data)) {
            setMarche(data);
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento marche:', error);
      }
    };
    loadMarche();
  }, []);

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

  // Carica modelli quando cambia la marca
  useEffect(() => {
    const loadModelli = async () => {
      if (marcaId) {
        try {
          const response = await fetchWithAuth(`/api/modelli?marca_id=${marcaId}`);
          if (response.ok) {
            const data = await parseResponseBody<Array<{ id: string; nome: string; marca_id: string }>>(response);
            if (Array.isArray(data)) {
              setModelli(data);
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
  }, [marcaId, initialRapportino]);

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
      indirizzo: c.indirizzo,
      citta: c.citta,
      cap: c.cap,
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
    return false;
  };

  const onSaveValid = (values: RapportinoFormValues) => {
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
      return;
    }

    const rapportino: Rapportino = {
      id: initialRapportino?.id ?? `rapp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      operatore: fullCheck.data.operatore,
      cliente: fullCheck.data.cliente,
      intervento: {
        ...fullCheck.data.intervento,
        materialiUtilizzati: materialiFinali || undefined,
      },
      dataCreazione: initialRapportino?.dataCreazione ?? new Date().toISOString(),
    };

    deleteDraft(draftIdRef.current);
    onSave(rapportino);
  };

  const handleConfirmSave = () => {
    if (!validateStep()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    const toastId = toast.loading('Salvataggio rapportino…');
    submitWithRhf((values) => {
      try {
        onSaveValid(values);
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
    <Card className="rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-700 p-6 sm:p-8 mb-8 animate-fade-in-up bg-card/95 backdrop-blur-sm">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white mb-1 tracking-tight">{initialRapportino ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 font-medium">Compila tutti i campi obbligatori per creare un nuovo rapportino</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2.5 text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-2xl transition-all hover:text-surface-900 dark:hover:text-white"
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
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Hai una bozza salvata. Vuoi riprendere da dove avevi lasciato?
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
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6 bg-surface-50/50 dark:bg-surface-800/30 p-4 rounded-2xl border border-surface-100 dark:border-surface-700/50">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl shadow-inner">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Dati Operatore</h3>
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Qualifica <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('operatore.qualifica')}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                placeholder="Es. Tecnico specializzato"
                required
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6 bg-surface-50/50 dark:bg-surface-800/30 p-4 rounded-2xl border border-surface-100 dark:border-surface-700/50">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl shadow-inner">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Dati Cliente</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 font-medium">Inserisci le informazioni del cliente per cui viene eseguito l&apos;intervento</p>
            </div>
          </div>
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                required
              />
            </div>
            
            {/* Lista clienti esistenti */}
            {showClientiList && clientiEsistenti.length > 0 && (
              <div className="md:col-span-2 relative z-10 clienti-list-container">
                <div className="bg-white/90 dark:bg-surface-800/90 backdrop-blur-xl border border-primary-300 dark:border-primary-700 rounded-2xl shadow-xl mt-2 max-h-64 overflow-y-auto">
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
                        className="w-full text-left p-4 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors"
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Indirizzo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.indirizzo}
                onChange={(e) => setValue('cliente.indirizzo', e.target.value)}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Città <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.citta}
                onChange={(e) => setValue('cliente.citta', e.target.value)}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                CAP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.cap}
                onChange={(e) => setValue('cliente.cap', e.target.value)}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                required
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
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
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6 bg-surface-50/50 dark:bg-surface-800/30 p-4 rounded-2xl border border-surface-100 dark:border-surface-700/50">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl shadow-inner">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Dati Intervento</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 font-medium">Inserisci i dettagli dell&apos;intervento eseguito</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={intervento.data}
                onChange={(e) => setValue('intervento.data', e.target.value)}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Ora <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={intervento.ora}
                onChange={(e) => setValue('intervento.ora', e.target.value)}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Tipo Stufa <span className="text-red-500">*</span>
              </label>
              <select
                value={intervento.tipoStufa}
                onChange={(e) => setValue('intervento.tipoStufa', e.target.value as 'pellet' | 'legno')}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 backdrop-blur-sm transition-all"
                required
              >
                <option value="pellet" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-white">Pellet</option>
                <option value="legno" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-white">Legno</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Marca <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {!showMarcaInput ? (
                  <>
                    <select
                      value={marcaId}
                      onChange={async (e) => {
                        const selectedId = e.target.value;
                        if (selectedId === 'new') {
                          setShowMarcaInput(true);
                          setMarcaId('');
                        } else {
                          setMarcaId(selectedId);
                          const selectedMarca = marche.find(m => m.id === selectedId);
                          setValue('intervento.marca', selectedMarca?.nome || '');
                        }
                      }}
                      className="flex-1 px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 backdrop-blur-sm transition-all"
                      required
                    >
                      <option value="">Seleziona marca...</option>
                      {marche.map((marca) => (
                        <option key={marca.id} value={marca.id} className="bg-white dark:bg-surface-800">
                          {marca.nome}
                        </option>
                      ))}
                      <option value="new" className="bg-white dark:bg-surface-800 font-bold">
                        + Nuova marca
                      </option>
                    </select>
                  </>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={intervento.marca}
                      onChange={(e) => setValue('intervento.marca', e.target.value)}
                      placeholder="Inserisci nuova marca"
                      className="flex-1 px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (intervento.marca.trim()) {
                          try {
                            const response = await fetchWithAuth('/api/marche', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ nome: intervento.marca.trim() }),
                            });
                            const data = await parseResponseBody<{ id?: string; nome?: string; error?: string }>(response);

                            if (!response.ok) {
                              toast.error(getApiErrorMessage(data, 'Errore nella creazione della marca'));
                              return;
                            }

                            if (response.ok) {
                              const newMarca = data as { id: string; nome: string } | null;
                              if (newMarca) {
                                setMarche([...marche, newMarca]);
                                setMarcaId(newMarca.id);
                                setValue('intervento.marca', newMarca.nome);
                                setShowMarcaInput(false);
                              }
                            }
                          } catch (error) {
                            console.error('Errore creazione marca:', error);
                            toast.error('Errore nella creazione della marca');
                          }
                        }
                      }}
                      className="px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 font-bold shadow-sm transition-all"
                    >
                      Salva
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMarcaInput(false);
                        setValue('intervento.marca', '');
                      }}
                      className="px-4 py-3 bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-2xl hover:bg-surface-300 dark:hover:bg-surface-600 font-bold transition-all"
                    >
                      Annulla
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Modello <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {!showModelloInput ? (
                  <>
                    <select
                      value={modelloId}
                      onChange={async (e) => {
                        const selectedId = e.target.value;
                        if (selectedId === 'new') {
                          setShowModelloInput(true);
                          setModelloId('');
                        } else {
                          setModelloId(selectedId);
                          const selectedModello = modelli.find(m => m.id === selectedId);
                          setValue('intervento.modello', selectedModello?.nome || '');
                        }
                      }}
                      disabled={!marcaId}
                      className="flex-1 px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all"
                      required
                    >
                      <option value="">{marcaId ? 'Seleziona modello...' : 'Seleziona prima una marca'}</option>
                      {modelli.map((modello) => (
                        <option key={modello.id} value={modello.id} className="bg-white dark:bg-surface-800">
                          {modello.nome}
                        </option>
                      ))}
                      {marcaId && (
                        <option value="new" className="bg-white dark:bg-surface-800 font-bold">
                          + Nuovo modello
                        </option>
                      )}
                    </select>
                  </>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={intervento.modello}
                      onChange={(e) => setValue('intervento.modello', e.target.value)}
                      placeholder={marcaId ? 'Inserisci nuovo modello' : 'Modello (marca non in catalogo)'}
                      className="flex-1 px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                      required
                    />
                    {marcaId && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (intervento.modello.trim() && marcaId) {
                          try {
                            const response = await fetchWithAuth('/api/modelli', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ nome: intervento.modello.trim(), marca_id: marcaId }),
                            });
                            const data = await parseResponseBody<{ id?: string; nome?: string; marca_id?: string; error?: string }>(response);

                            if (!response.ok) {
                              toast.error(getApiErrorMessage(data, 'Errore nella creazione del modello'));
                              return;
                            }

                            if (response.ok) {
                              const newModello = data as { id: string; nome: string; marca_id: string } | null;
                              if (newModello) {
                                setModelli([...modelli, newModello]);
                                setModelloId(newModello.id);
                                setValue('intervento.modello', newModello.nome);
                                setShowModelloInput(false);
                              }
                            }
                          } catch (error) {
                            console.error('Errore creazione modello:', error);
                            toast.error('Errore nella creazione del modello');
                          }
                        }
                      }}
                      className="px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 font-bold shadow-sm transition-all"
                    >
                      Salva
                    </button>
                    )}
                    {marcaId && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowModelloInput(false);
                        setValue('intervento.modello', '');
                      }}
                      className="px-4 py-3 bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-2xl hover:bg-surface-300 dark:hover:bg-surface-600 font-bold transition-all"
                    >
                      Annulla
                    </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Numero di Serie
              </label>
              <input
                type="text"
                value={intervento.numeroSerie}
                onChange={(e) => setValue('intervento.numeroSerie', e.target.value)}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Tipo Intervento <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <select
                  value={intervento.tipoIntervento}
                  onChange={(e) => setValue('intervento.tipoIntervento', e.target.value)}
                  className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 backdrop-blur-sm transition-all"
                  required
                >
                  {tipiIntervento.map((tipo) => (
                    <option key={tipo} value={tipo} className="bg-white dark:bg-surface-800 text-surface-900 dark:text-white">
                      {tipo}
                    </option>
                  ))}
                </select>

                {!showTipoInterventoInput ? (
                  <button
                    type="button"
                    onClick={() => setShowTipoInterventoInput(true)}
                    className="w-full px-4 py-3 text-sm font-bold border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-2xl text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50 hover:border-primary-400 dark:hover:border-primary-600 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                  >
                    + Aggiungi tipologia di intervento
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newTipoIntervento}
                      onChange={(e) => setNewTipoIntervento(e.target.value)}
                      placeholder="Nuova tipologia (es. Collaudo)"
                      className="flex-1 px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nuovaTipologia = newTipoIntervento.trim();
                        if (!nuovaTipologia) return;

                        const esisteGia = tipiIntervento.some(
                          (tipo) => tipo.toLowerCase() === nuovaTipologia.toLowerCase()
                        );

                        if (!esisteGia) {
                          setTipiIntervento((prev) => [...prev, nuovaTipologia]);
                        }

                        setValue('intervento.tipoIntervento', nuovaTipologia);
                        setNewTipoIntervento('');
                        setShowTipoInterventoInput(false);
                      }}
                      className="px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 font-bold shadow-sm transition-all"
                    >
                      Salva
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTipoInterventoInput(false);
                        setNewTipoIntervento('');
                      }}
                      className="px-4 py-3 bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-2xl hover:bg-surface-300 dark:hover:bg-surface-600 font-bold transition-all"
                    >
                      Annulla
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Descrizione <span className="text-red-500">*</span>
              </label>
              <textarea
                value={intervento.descrizione}
                onChange={(e) => setValue('intervento.descrizione', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 placeholder-surface-400 dark:placeholder-surface-500 backdrop-blur-sm transition-all resize-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Materiali Utilizzati
              </label>
              <div className="space-y-3">
                {/* Combobox multi-select per materiali */}
                <div className="relative">
                  <div className="min-h-[100px] max-h-[200px] overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-2xl p-2 bg-white/50 dark:bg-surface-800/50 backdrop-blur-sm">
                    {materiali.length > 0 ? (
                      <div className="space-y-1">
                        {materiali.map((materiale) => (
                          <label
                            key={materiale.id}
                            className="flex items-center gap-3 p-3 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-xl cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMateriali.includes(materiale.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMateriali([...selectedMateriali, materiale.id]);
                                } else {
                                  setSelectedMateriali(selectedMateriali.filter(id => id !== materiale.id));
                                }
                              }}
                              className="w-5 h-5 text-primary-600 border-surface-300 dark:border-surface-600 rounded focus:ring-primary-500 bg-white/50 dark:bg-surface-800/50"
                            />
                            <span className="text-sm text-surface-900 dark:text-white">
                              {materiale.nome}
                              {materiale.descrizione && (
                                <span className="text-xs text-surface-500 dark:text-surface-400 ml-2">
                                  - {materiale.descrizione}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-surface-500 dark:text-surface-400 text-center py-4">
                        {modelloId ? 'Nessun materiale disponibile per questo modello' : 'Seleziona prima un modello'}
                      </p>
                    )}
                  </div>
                  
                  {/* Pulsante per aggiungere nuovo materiale */}
                  {modelloId && (
                    <div className="mt-2">
                      {!showMaterialeInput ? (
                        <button
                          type="button"
                          onClick={() => setShowMaterialeInput(true)}
                          className="w-full px-4 py-3 text-sm border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-2xl text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                        >
                          + Aggiungi nuovo materiale
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={newMaterialeNome}
                            onChange={(e) => setNewMaterialeNome(e.target.value)}
                            placeholder="Nome materiale"
                            className="flex-1 px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 backdrop-blur-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (newMaterialeNome.trim() && modelloId) {
                                  try {
                                    const response = await fetchWithAuth('/api/materiali', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ 
                                        nome: newMaterialeNome.trim(), 
                                        modello_id: modelloId 
                                      }),
                                    });
                                    const data = await parseResponseBody<{ id?: string; nome?: string; descrizione?: string; modello_id?: string; error?: string }>(response);

                                    if (!response.ok) {
                                      toast.error(getApiErrorMessage(data, 'Errore nella creazione del materiale'));
                                      return;
                                    }

                                    if (response.ok) {
                                      const newMateriale = data as { id: string; nome: string; descrizione?: string; modello_id: string } | null;
                                      if (newMateriale) {
                                        setMateriali([...materiali, newMateriale]);
                                        setSelectedMateriali([...selectedMateriali, newMateriale.id]);
                                        setNewMaterialeNome('');
                                        setShowMaterialeInput(false);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Errore creazione materiale:', error);
                                    toast.error('Errore nella creazione del materiale');
                                  }
                                }
                              }}
                              className="w-full px-4 py-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 shadow-glow-emerald transition-all font-medium"
                            >
                              Salva
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowMaterialeInput(false);
                                setNewMaterialeNome('');
                              }}
                              className="w-full px-4 py-3 bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-2xl hover:bg-surface-300 dark:hover:bg-surface-600 transition-all font-medium"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Input manuale per materiali aggiuntivi */}
                <div>
                  <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">
                    Materiali aggiuntivi (opzionale)
                  </label>
                  <textarea
                    value={intervento.materialiUtilizzati || ''}
                    onChange={(e) => setValue('intervento.materialiUtilizzati', e.target.value)}
                    placeholder="Inserisci materiali aggiuntivi non presenti nella lista..."
                    rows={2}
                    className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 backdrop-blur-sm placeholder-surface-400 dark:placeholder-surface-500 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-surface-700 dark:text-surface-300 mb-1.5">
                Note Aggiuntive (opzionale)
              </label>
              <textarea
                value={intervento.note}
                onChange={(e) => setValue('intervento.note', e.target.value)}
                placeholder="Inserisci eventuali note aggiuntive..."
                rows={3}
                className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-surface-900 dark:text-white bg-white/50 dark:bg-surface-800/50 backdrop-blur-sm placeholder-surface-400 dark:placeholder-surface-500"
              />
            </div>

            <div className="md:col-span-2 mt-4 pb-28 sm:pb-0">
              <div className="relative z-10 rounded-3xl border border-surface-200 dark:border-surface-700 bg-white/30 dark:bg-surface-800/30 backdrop-blur-md p-6">
                <h4 className="text-base font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Processo firme digitali
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SignaturePad
                    label="Firma Operatore"
                    value={intervento.firmaOperatore}
                    required
                    helperText={
                      operatoreFirmaFromProfile && intervento.firmaOperatore
                        ? 'Firma del profilo caricata automaticamente. Puoi modificarla se necessario.'
                        : undefined
                    }
                    onChange={(firmaOperatore) => {
                      setOperatoreFirmaFromProfile(false);
                      setValue('intervento.firmaOperatore', firmaOperatore);
                    }}
                  />
                  <SignaturePad
                    label="Firma Cliente"
                    value={intervento.firmaCliente}
                    required
                    onChange={(firmaCliente) => setValue('intervento.firmaCliente', firmaCliente)}
                  />
                </div>
                <p className="mt-4 text-xs text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Entrambe le firme sono obbligatorie per concludere e salvare il rapportino.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-24 sm:h-0" aria-hidden />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-200 bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-surface-700 sm:static sm:mt-10 sm:border-t sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-4xl flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-surface-200 px-8 py-4 font-medium text-surface-700 transition-all hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800/50 sm:w-auto"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Indietro
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-8 py-4 font-medium text-white shadow-glow-primary transition-all hover:bg-primary-600 sm:w-auto"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 font-medium text-white shadow-glow-emerald transition-all hover:bg-emerald-600 sm:w-auto"
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
