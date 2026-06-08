'use client';

import { toast } from 'sonner';
import FormSectionHeader from '@/components/rapportino/FormSectionHeader';
import CondizioniGaranziaSection from '@/components/rapportino/CondizioniGaranziaSection';
import SiNoNcField from '@/components/rapportino/SiNoNcField';
import {
  CODICI_ERRORE,
  CONTROLLO_GARANZIA_FIELDS,
  getCodiceErroreDescrizione,
  TIPOLOGIA_INSTALLAZIONE_LABELS,
  TIPOLOGIA_INSTALLAZIONE_VALUES,
} from '@/lib/rapportino-constants';
import { fetchWithAuth, getApiErrorMessage, parseResponseBody } from '@/lib/api';
import type { RapportinoFormValues } from '@/lib/validators/rapportino-form';
import type { ControlloGaranziaKey, SiNoNc } from '@/lib/rapportino-constants';
import type { UseFormSetValue } from 'react-hook-form';

interface Props {
  intervento: RapportinoFormValues['intervento'];
  setValue: UseFormSetValue<RapportinoFormValues>;
  marche: Array<{ id: string; nome: string }>;
  modelli: Array<{ id: string; nome: string; marca_id: string }>;
  materiali: Array<{ id: string; nome: string; descrizione?: string; modello_id: string }>;
  marcaId: string;
  modelloId: string;
  showMarcaInput: boolean;
  showModelloInput: boolean;
  selectedMateriali: string[];
  showMaterialeInput: boolean;
  newMaterialeNome: string;
  setMarcaId: (id: string) => void;
  setModelloId: (id: string) => void;
  setShowMarcaInput: (v: boolean) => void;
  setShowModelloInput: (v: boolean) => void;
  setMarche: (v: Array<{ id: string; nome: string }>) => void;
  setModelli: (v: Array<{ id: string; nome: string; marca_id: string }>) => void;
  setMateriali: (v: Array<{ id: string; nome: string; descrizione?: string; modello_id: string }>) => void;
  setSelectedMateriali: (v: string[]) => void;
  setShowMaterialeInput: (v: boolean) => void;
  setNewMaterialeNome: (v: string) => void;
}

export default function RapportinoStepIntervento({
  intervento,
  setValue,
  marche,
  modelli,
  materiali,
  marcaId,
  modelloId,
  showMarcaInput,
  showModelloInput,
  selectedMateriali,
  showMaterialeInput,
  newMaterialeNome,
  setMarcaId,
  setModelloId,
  setShowMarcaInput,
  setShowModelloInput,
  setMarche,
  setModelli,
  setMateriali,
  setSelectedMateriali,
  setShowMaterialeInput,
  setNewMaterialeNome,
}: Props) {
  const setControllo = (key: ControlloGaranziaKey, value: SiNoNc) => {
    setValue(`intervento.controlloGaranzia.${key}`, value);
  };

  return (
    <div className="space-y-8">
      <section>
        <FormSectionHeader
          iconClassName="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          title="Dati apparecchio"
          description="Inserisci marca, modello, matricola e dati di acquisto"
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
              Tipo stufa <span className="text-red-500">*</span>
            </label>
            <select
              value={intervento.tipoStufa}
              onChange={(e) => setValue('intervento.tipoStufa', e.target.value as 'pellet' | 'legno')}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="pellet">Pellet</option>
              <option value="legno">Legno</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
              Marca <span className="text-red-500">*</span>
            </label>
            {!showMarcaInput ? (
              <select
                value={marcaId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId === 'new') {
                    setShowMarcaInput(true);
                    setMarcaId('');
                  } else {
                    setMarcaId(selectedId);
                    const selectedMarca = marche.find((m) => m.id === selectedId);
                    setValue('intervento.marca', selectedMarca?.nome || '');
                  }
                }}
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleziona marca...</option>
                {marche.map((marca) => (
                  <option key={marca.id} value={marca.id}>{marca.nome}</option>
                ))}
                <option value="new">+ Nuova marca</option>
              </select>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={intervento.marca}
                  onChange={(e) => setValue('intervento.marca', e.target.value)}
                  placeholder="Inserisci nuova marca"
                  className="flex-1 rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!intervento.marca.trim()) return;
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
                      const newMarca = data as { id: string; nome: string };
                      setMarche([...marche, newMarca]);
                      setMarcaId(newMarca.id);
                      setValue('intervento.marca', newMarca.nome);
                      setShowMarcaInput(false);
                    } catch {
                      toast.error('Errore nella creazione della marca');
                    }
                  }}
                  className="rounded-md bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700"
                >
                  Salva
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
              Modello <span className="text-red-500">*</span>
            </label>
            {!showModelloInput ? (
              <select
                value={modelloId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId === 'new') {
                    setShowModelloInput(true);
                    setModelloId('');
                  } else {
                    setModelloId(selectedId);
                    const selectedModello = modelli.find((m) => m.id === selectedId);
                    setValue('intervento.modello', selectedModello?.nome || '');
                  }
                }}
                disabled={!marcaId}
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">{marcaId ? 'Seleziona modello...' : 'Seleziona prima una marca'}</option>
                {modelli.map((modello) => (
                  <option key={modello.id} value={modello.id}>{modello.nome}</option>
                ))}
                {marcaId && <option value="new">+ Nuovo modello</option>}
              </select>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={intervento.modello}
                  onChange={(e) => setValue('intervento.modello', e.target.value)}
                  placeholder="Inserisci nuovo modello"
                  className="flex-1 rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!intervento.modello.trim()) return;
                    if (!marcaId) {
                      toast.error('Salva prima la marca per aggiungere un nuovo modello');
                      return;
                    }
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
                      const newModello = data as { id: string; nome: string; marca_id: string };
                      setModelli([...modelli, newModello]);
                      setModelloId(newModello.id);
                      setValue('intervento.modello', newModello.nome);
                      setShowModelloInput(false);
                      toast.success('Modello salvato nel catalogo');
                    } catch {
                      toast.error('Errore nella creazione del modello');
                    }
                  }}
                  className="rounded-md bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700"
                >
                  Salva
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">Matricola</label>
            <input
              type="text"
              value={intervento.numeroSerie || ''}
              onChange={(e) => setValue('intervento.numeroSerie', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">Data acquisto</label>
            <input
              type="date"
              value={intervento.dataAcquisto || ''}
              onChange={(e) => setValue('intervento.dataAcquisto', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">Rivenditore</label>
            <input
              type="text"
              value={intervento.rivenditore || ''}
              onChange={(e) => setValue('intervento.rivenditore', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      <section>
        <FormSectionHeader
          iconClassName="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
          title="Relazione intervento"
          description="Descrivi il motivo della chiamata e le verifiche effettuate"
        />
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
              Codice errore
            </label>
            <select
              value={intervento.codiceErrore || ''}
              onChange={(e) => setValue('intervento.codiceErrore', e.target.value || undefined)}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleziona codice errore...</option>
              {CODICI_ERRORE.map((errore) => (
                <option key={errore.codice} value={errore.codice}>
                  {errore.codice} — {errore.descrizione}
                </option>
              ))}
            </select>
            {intervento.codiceErrore && (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{intervento.codiceErrore}</span>
                {' — '}
                {getCodiceErroreDescrizione(intervento.codiceErrore)}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
              Motivo della chiamata <span className="text-red-500">*</span>
            </label>
            <textarea
              value={intervento.motivoChiamata || ''}
              onChange={(e) => setValue('intervento.motivoChiamata', e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">Verifiche</label>
            <textarea
              value={intervento.verifiche || ''}
              onChange={(e) => setValue('intervento.verifiche', e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">Installazione eseguita da</label>
            <input
              type="text"
              value={intervento.installazioneEseguitaDa || ''}
              onChange={(e) => setValue('intervento.installazioneEseguitaDa', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      <section>
        <FormSectionHeader
          iconClassName="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          title="Controllo per avvio garanzia"
          description="Indica Sì, No o N.C. per ogni controllo effettuato"
        />
        <div className="grid grid-cols-1 gap-4">
          {CONTROLLO_GARANZIA_FIELDS.map((field) => (
            <SiNoNcField
              key={field.key}
              name={`controllo-${field.key}`}
              label={field.label}
              value={intervento.controlloGaranzia?.[field.key]}
              onChange={(value) => setControllo(field.key, value)}
            />
          ))}
        </div>
      </section>

      <section>
        <CondizioniGaranziaSection
          checked={Boolean(intervento.presaVisioneCondizioniGaranzia)}
          onChange={(checked) => setValue('intervento.presaVisioneCondizioniGaranzia', checked)}
        />
      </section>

      <section>
        <FormSectionHeader
          iconClassName="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          title="Tipologia di installazione"
          description="Seleziona il tipo di scarico e aggiungi eventuali note"
        />
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
              Tipologia installazione
            </label>
            <select
              value={intervento.tipologiaInstallazione || ''}
              onChange={(e) =>
                setValue(
                  'intervento.tipologiaInstallazione',
                  e.target.value ? (e.target.value as typeof intervento.tipologiaInstallazione) : undefined
                )
              }
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleziona tipologia...</option>
              {TIPOLOGIA_INSTALLAZIONE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {TIPOLOGIA_INSTALLAZIONE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">Note di installazione</label>
            <textarea
              value={intervento.noteInstallazione || ''}
              onChange={(e) => setValue('intervento.noteInstallazione', e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      {modelloId && materiali.length > 0 && (
        <section className="rounded-md border border-input p-4">
          <p className="mb-3 text-sm font-bold text-surface-700 dark:text-surface-300">Materiali utilizzati (opzionale)</p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {materiali.map((materiale) => (
              <label key={materiale.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted">
                <input
                  type="checkbox"
                  checked={selectedMateriali.includes(materiale.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMateriali([...selectedMateriali, materiale.id]);
                    } else {
                      setSelectedMateriali(selectedMateriali.filter((id) => id !== materiale.id));
                    }
                  }}
                  className="h-4 w-4 rounded border-input text-primary"
                />
                <span className="text-sm">{materiale.nome}</span>
              </label>
            ))}
          </div>
          {!showMaterialeInput ? (
            <button
              type="button"
              onClick={() => setShowMaterialeInput(true)}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              + Aggiungi materiale
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newMaterialeNome}
                onChange={(e) => setNewMaterialeNome(e.target.value)}
                placeholder="Nome materiale"
                className="flex-1 rounded-md border border-input px-3 py-2"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!newMaterialeNome.trim() || !modelloId) return;
                  try {
                    const response = await fetchWithAuth('/api/materiali', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ nome: newMaterialeNome.trim(), modello_id: modelloId }),
                    });
                    const data = await parseResponseBody<{ id: string; nome: string; modello_id: string }>(response);
                    if (response.ok && data) {
                      setMateriali([...materiali, data]);
                      setSelectedMateriali([...selectedMateriali, data.id]);
                      setNewMaterialeNome('');
                      setShowMaterialeInput(false);
                    }
                  } catch {
                    toast.error('Errore creazione materiale');
                  }
                }}
                className="rounded-md bg-emerald-500 px-3 py-2 text-white"
              >
                Salva
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
