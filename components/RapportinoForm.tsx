'use client';

import { useState, useEffect } from 'react';
import { Rapportino, Operatore, Cliente, Intervento } from '@/types';
import { format } from 'date-fns';
import { DEFAULT_OPERATORE } from '@/lib/auth';

interface RapportinoFormProps {
  onSave: (rapportino: Rapportino) => void;
  onCancel: () => void;
}

export default function RapportinoForm({ onSave, onCancel }: RapportinoFormProps) {
  const [step, setStep] = useState(1);
  const [operatore, setOperatore] = useState<Operatore>({
    nome: DEFAULT_OPERATORE.nome,
    cognome: DEFAULT_OPERATORE.cognome,
    telefono: DEFAULT_OPERATORE.telefono,
    email: DEFAULT_OPERATORE.email,
    qualifica: DEFAULT_OPERATORE.qualifica,
  });
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

    const rapportino: Rapportino = {
      id: `rapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operatore,
      cliente,
      intervento,
      dataCreazione: new Date().toISOString(),
    };

    onSave(rapportino);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nuovo Rapportino</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex-1 h-2 rounded-full ${
                  s <= step ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  s < step
                    ? 'bg-primary-600 text-white'
                    : s === step
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Dati Operatore</h3>
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
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Dati Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cliente.nome}
                onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
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
                value={cliente.cognome}
                onChange={(e) => setCliente({ ...cliente, cognome: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
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
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Dati Intervento</h3>
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
              <input
                type="text"
                value={intervento.marca}
                onChange={(e) => setIntervento({ ...intervento, marca: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Modello <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={intervento.modello}
                onChange={(e) => setIntervento({ ...intervento, modello: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
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
              <textarea
                value={intervento.materialiUtilizzati}
                onChange={(e) => setIntervento({ ...intervento, materialiUtilizzati: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
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

      <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
          >
            Indietro
          </button>
          {step < 3 ? (
            <button
              onClick={() => validateStep() && setStep(step + 1)}
              disabled={!validateStep()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Avanti
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!validateStep()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Salva Rapportino
            </button>
          )}
      </div>
    </div>
  );
}
