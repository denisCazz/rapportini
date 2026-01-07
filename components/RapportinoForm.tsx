'use client';

import { useState, useEffect } from 'react';
import { Rapportino, Operatore, Cliente, Intervento } from '@/types';
import { format } from 'date-fns';
import { auth } from '@/lib/auth';

interface RapportinoFormProps {
  onSave: (rapportino: Rapportino) => void;
  onCancel: () => void;
}

export default function RapportinoForm({ onSave, onCancel }: RapportinoFormProps) {
  const [step, setStep] = useState(1);
  const [operatore, setOperatore] = useState<Operatore>({
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    qualifica: '',
  });
  
  // Carica i dati operatore dall'utente loggato
  useEffect(() => {
    const user = auth.getUser();
    if (user) {
      setOperatore({
        nome: user.nome || '',
        cognome: user.cognome || '',
        telefono: user.telefono || '',
        email: user.email || '',
        qualifica: user.qualifica || '',
      });
    }
  }, []);
  const [cliente, setCliente] = useState<Cliente>({
    nome: '',
    cognome: '',
    ragioneSociale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    telefono: '',
    email: '',
    partitaIva: '',
    codiceFiscale: '',
  });
  const [intervento, setIntervento] = useState<Intervento>({
    data: format(new Date(), 'yyyy-MM-dd'),
    ora: format(new Date(), 'HH:mm'),
    tipoStufa: 'pellet',
    marca: '',
    modello: '',
    numeroSerie: '',
    tipoIntervento: '',
    descrizione: '',
    materialiUtilizzati: '',
    note: '',
  });
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

  // Cerca clienti esistenti quando nome e cognome sono inseriti
  useEffect(() => {
    const searchClienti = async () => {
      if (step === 2 && cliente.nome.trim().length >= 2 && cliente.cognome.trim().length >= 2) {
        setIsSearchingClienti(true);
        try {
          const response = await fetch(
            `/api/clienti/search?nome=${encodeURIComponent(cliente.nome.trim())}&cognome=${encodeURIComponent(cliente.cognome.trim())}`
          );
          if (response.ok) {
            const data = await response.json();
            setClientiEsistenti(data);
            setShowClientiList(data.length > 0);
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
        const response = await fetch('/api/marche');
        if (response.ok) {
          const data = await response.json();
          setMarche(data);
        }
      } catch (error) {
        console.error('Errore nel caricamento marche:', error);
      }
    };
    loadMarche();
  }, []);

  // Carica modelli quando cambia la marca
  useEffect(() => {
    const loadModelli = async () => {
      if (marcaId) {
        try {
          const response = await fetch(`/api/modelli?marca_id=${marcaId}`);
          if (response.ok) {
            const data = await response.json();
            setModelli(data);
          }
        } catch (error) {
          console.error('Errore nel caricamento modelli:', error);
        }
      } else {
        setModelli([]);
        setModelloId('');
        setIntervento(prev => ({ ...prev, modello: '' }));
        setMateriali([]);
        setSelectedMateriali([]);
      }
    };
    loadModelli();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcaId]);

  // Carica materiali quando cambia il modello
  useEffect(() => {
    const loadMateriali = async () => {
      if (modelloId) {
        try {
          const response = await fetch(`/api/materiali?modello_id=${modelloId}`);
          if (response.ok) {
            const data = await response.json();
            setMateriali(data);
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

  const handleSelectCliente = (clienteSelezionato: Cliente) => {
    setCliente({
      ...clienteSelezionato,
      // Mantieni i campi già compilati se non vuoti
      ragioneSociale: clienteSelezionato.ragioneSociale || cliente.ragioneSociale,
      email: clienteSelezionato.email || cliente.email,
      partitaIva: clienteSelezionato.partitaIva || cliente.partitaIva,
      codiceFiscale: clienteSelezionato.codiceFiscale || cliente.codiceFiscale,
    });
    setShowClientiList(false);
    setClientiEsistenti([]);
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      return !!(operatore.nome && operatore.cognome && operatore.telefono && operatore.qualifica);
    }
    if (step === 2) {
      return !!(cliente.nome && cliente.cognome && cliente.indirizzo && cliente.citta && cliente.cap && cliente.telefono);
    }
    if (step === 3) {
      return !!(intervento.marca && intervento.modello && intervento.tipoIntervento && intervento.descrizione);
    }
    return false;
  };

  const handleSubmit = () => {
    if (!validateStep()) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    // Combina materiali selezionati con materiali manuali
    const materialiSelezionati = selectedMateriali
      .map(id => {
        const materiale = materiali.find(m => m.id === id);
        return materiale ? materiale.nome : null;
      })
      .filter(Boolean)
      .join(', ');
    
    const materialiFinali = [
      materialiSelezionati,
      intervento.materialiUtilizzati || ''
    ].filter(Boolean).join('; ');

    const rapportino: Rapportino = {
      id: `rapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operatore,
      cliente,
      intervento: {
        ...intervento,
        materialiUtilizzati: materialiFinali || undefined,
      },
      dataCreazione: new Date().toISOString(),
    };

    onSave(rapportino);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 mb-8 animate-slideUp">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Nuovo Rapportino</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Compila tutti i campi obbligatori per creare un nuovo rapportino</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Chiudi"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  s < step
                    ? 'bg-primary-600 text-white shadow-lg'
                    : s === step
                    ? 'bg-primary-600 text-white shadow-lg ring-4 ring-primary-200 dark:ring-primary-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {s < step ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span className={step === 1 ? 'font-semibold text-primary-600 dark:text-primary-400' : ''}>1. Operatore</span>
          <span>•</span>
          <span className={step === 2 ? 'font-semibold text-primary-600 dark:text-primary-400' : ''}>2. Cliente</span>
          <span>•</span>
          <span className={step === 3 ? 'font-semibold text-primary-600 dark:text-primary-400' : ''}>3. Intervento</span>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dati Operatore</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inserisci le informazioni dell&apos;operatore che esegue l&apos;intervento</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={operatore.nome}
                onChange={(e) => setOperatore({ ...operatore, nome: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Cognome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={operatore.cognome}
                onChange={(e) => setOperatore({ ...operatore, cognome: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Telefono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={operatore.telefono}
                onChange={(e) => setOperatore({ ...operatore, telefono: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Email
              </label>
              <input
                type="email"
                value={operatore.email}
                onChange={(e) => setOperatore({ ...operatore, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Qualifica <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={operatore.qualifica}
                onChange={(e) => setOperatore({ ...operatore, qualifica: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Es. Tecnico specializzato"
                required
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dati Cliente</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inserisci le informazioni del cliente per cui viene eseguito l&apos;intervento</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.nome}
                onChange={(e) => {
                  setCliente({ ...cliente, nome: e.target.value });
                  setShowClientiList(true);
                }}
                onFocus={() => {
                  if (clientiEsistenti.length > 0) {
                    setShowClientiList(true);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
              {isSearchingClienti && (
                <div className="absolute right-3 top-9">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Cognome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.cognome}
                onChange={(e) => {
                  setCliente({ ...cliente, cognome: e.target.value });
                  setShowClientiList(true);
                }}
                onFocus={() => {
                  if (clientiEsistenti.length > 0) {
                    setShowClientiList(true);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            
            {/* Lista clienti esistenti */}
            {showClientiList && clientiEsistenti.length > 0 && (
              <div className="md:col-span-2 relative z-10 clienti-list-container">
                <div className="bg-white dark:bg-gray-800 border-2 border-primary-300 dark:border-primary-700 rounded-lg shadow-xl mt-2 max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Trovati {clientiEsistenti.length} cliente{clientiEsistenti.length > 1 ? 'i' : ''} esistente{clientiEsistenti.length > 1 ? 'i' : ''} - Seleziona per precompilare i dati
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {clientiEsistenti.map((clienteEsistente) => (
                      <button
                        key={clienteEsistente.nome + clienteEsistente.cognome + clienteEsistente.telefono}
                        type="button"
                        onClick={() => handleSelectCliente(clienteEsistente)}
                        className="w-full text-left p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {clienteEsistente.nome} {clienteEsistente.cognome}
                              {clienteEsistente.ragioneSociale && (
                                <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                                  • {clienteEsistente.ragioneSociale}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {clienteEsistente.indirizzo}, {clienteEsistente.citta} ({clienteEsistente.cap})
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
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
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowClientiList(false);
                        setClientiEsistenti([]);
                      }}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Continua con nuovo cliente
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Ragione Sociale
              </label>
              <input
                type="text"
                value={cliente.ragioneSociale}
                onChange={(e) => setCliente({ ...cliente, ragioneSociale: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Indirizzo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.indirizzo}
                onChange={(e) => setCliente({ ...cliente, indirizzo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Città <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.citta}
                onChange={(e) => setCliente({ ...cliente, citta: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                CAP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.cap}
                onChange={(e) => setCliente({ ...cliente, cap: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Telefono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={cliente.telefono}
                onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Email
              </label>
              <input
                type="email"
                value={cliente.email}
                onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Partita IVA
              </label>
              <input
                type="text"
                value={cliente.partitaIva}
                onChange={(e) => setCliente({ ...cliente, partitaIva: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Codice Fiscale
              </label>
              <input
                type="text"
                value={cliente.codiceFiscale}
                onChange={(e) => setCliente({ ...cliente, codiceFiscale: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dati Intervento</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inserisci i dettagli dell&apos;intervento eseguito</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={intervento.data}
                onChange={(e) => setIntervento({ ...intervento, data: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Ora <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={intervento.ora}
                onChange={(e) => setIntervento({ ...intervento, ora: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Tipo Stufa <span className="text-red-500">*</span>
              </label>
              <select
                value={intervento.tipoStufa}
                onChange={(e) => setIntervento({ ...intervento, tipoStufa: e.target.value as 'pellet' | 'legno' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                required
              >
                <option value="pellet" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Pellet</option>
                <option value="legno" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Legno</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
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
                          setIntervento({ ...intervento, marca: selectedMarca?.nome || '' });
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      required
                    >
                      <option value="">Seleziona marca...</option>
                      {marche.map((marca) => (
                        <option key={marca.id} value={marca.id} className="bg-white dark:bg-gray-700">
                          {marca.nome}
                        </option>
                      ))}
                      <option value="new" className="bg-white dark:bg-gray-700 font-semibold">
                        + Nuova marca
                      </option>
                    </select>
                  </>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={intervento.marca}
                      onChange={(e) => setIntervento({ ...intervento, marca: e.target.value })}
                      placeholder="Inserisci nuova marca"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      required
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (intervento.marca.trim()) {
                          try {
                            const response = await fetch('/api/marche', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ nome: intervento.marca.trim() }),
                            });
                            if (response.ok) {
                              const newMarca = await response.json();
                              setMarche([...marche, newMarca]);
                              setMarcaId(newMarca.id);
                            }
                          } catch (error) {
                            console.error('Errore creazione marca:', error);
                          }
                        }
                        setShowMarcaInput(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Salva
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMarcaInput(false);
                        setIntervento({ ...intervento, marca: '' });
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Annulla
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
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
                          setIntervento({ ...intervento, modello: selectedModello?.nome || '' });
                        }
                      }}
                      disabled={!marcaId}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">{marcaId ? 'Seleziona modello...' : 'Seleziona prima una marca'}</option>
                      {modelli.map((modello) => (
                        <option key={modello.id} value={modello.id} className="bg-white dark:bg-gray-700">
                          {modello.nome}
                        </option>
                      ))}
                      {marcaId && (
                        <option value="new" className="bg-white dark:bg-gray-700 font-semibold">
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
                      onChange={(e) => setIntervento({ ...intervento, modello: e.target.value })}
                      placeholder="Inserisci nuovo modello"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      required
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (intervento.modello.trim() && marcaId) {
                          try {
                            const response = await fetch('/api/modelli', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ nome: intervento.modello.trim(), marca_id: marcaId }),
                            });
                            if (response.ok) {
                              const newModello = await response.json();
                              setModelli([...modelli, newModello]);
                              setModelloId(newModello.id);
                            }
                          } catch (error) {
                            console.error('Errore creazione modello:', error);
                          }
                        }
                        setShowModelloInput(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Salva
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModelloInput(false);
                        setIntervento({ ...intervento, modello: '' });
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Annulla
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Numero di Serie
              </label>
              <input
                type="text"
                value={intervento.numeroSerie}
                onChange={(e) => setIntervento({ ...intervento, numeroSerie: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Tipo Intervento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={intervento.tipoIntervento}
                onChange={(e) => setIntervento({ ...intervento, tipoIntervento: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Es. Manutenzione, Riparazione, Installazione"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Descrizione <span className="text-red-500">*</span>
              </label>
              <textarea
                value={intervento.descrizione}
                onChange={(e) => setIntervento({ ...intervento, descrizione: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Materiali Utilizzati
              </label>
              <div className="space-y-2">
                {/* Combobox multi-select per materiali */}
                <div className="relative">
                  <div className="min-h-[100px] max-h-[200px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700">
                    {materiali.length > 0 ? (
                      <div className="space-y-1">
                        {materiali.map((materiale) => (
                          <label
                            key={materiale.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer"
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
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {materiale.nome}
                              {materiale.descrizione && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                  - {materiale.descrizione}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
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
                          className="w-full px-4 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          + Aggiungi nuovo materiale
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMaterialeNome}
                            onChange={(e) => setNewMaterialeNome(e.target.value)}
                            placeholder="Nome materiale"
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (newMaterialeNome.trim() && modelloId) {
                                try {
                                  const response = await fetch('/api/materiali', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      nome: newMaterialeNome.trim(), 
                                      modello_id: modelloId 
                                    }),
                                  });
                                  if (response.ok) {
                                    const newMateriale = await response.json();
                                    setMateriali([...materiali, newMateriale]);
                                    setSelectedMateriali([...selectedMateriali, newMateriale.id]);
                                    setNewMaterialeNome('');
                                    setShowMaterialeInput(false);
                                  }
                                } catch (error) {
                                  console.error('Errore creazione materiale:', error);
                                }
                              }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMaterialeInput(false);
                              setNewMaterialeNome('');
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                          >
                            Annulla
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Input manuale per materiali aggiuntivi */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Materiali aggiuntivi (opzionale)
                  </label>
                  <textarea
                    value={intervento.materialiUtilizzati || ''}
                    onChange={(e) => setIntervento({ ...intervento, materialiUtilizzati: e.target.value })}
                    placeholder="Inserisci materiali aggiuntivi non presenti nella lista..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Note Aggiuntive
              </label>
              <textarea
                value={intervento.note}
                onChange={(e) => setIntervento({ ...intervento, note: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Indietro
          </button>
          {step < 3 ? (
            <button
              onClick={() => validateStep() && setStep(step + 1)}
              disabled={!validateStep()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Avanti
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!validateStep()}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Salva Rapportino
            </button>
          )}
      </div>
    </div>
  );
}
