'use client';

import { Rapportino, AziendaSettings } from '@/types';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { downloadPDF } from '@/lib/pdfGenerator';
import CondizioniGaranziaSection from '@/components/rapportino/CondizioniGaranziaSection';
import {
  CONTROLLO_GARANZIA_FIELDS,
  formatCodiceErrore,
  formatSiNoNc,
  formatTipologiaInstallazione,
  formatTipologiaIntervento,
} from '@/lib/rapportino-constants';

interface RapportinoDetailProps {
  rapportino: Rapportino;
  settings: AziendaSettings;
  onClose: () => void;
  onEdit?: () => void;
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-surface-500 dark:text-surface-400 sm:text-sm print:text-base">{label}</p>
      <p className="font-bold text-surface-900 dark:text-white print:text-lg">{value}</p>
    </div>
  );
}

export default function RapportinoDetail({ rapportino, settings, onClose, onEdit }: RapportinoDetailProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const { intervento, cliente } = rapportino;
  const indirizzoCliente = [cliente.via, cliente.numeroCivico].filter(Boolean).join(' ') || cliente.indirizzo;
  const localitaCliente = [cliente.citta, cliente.provincia, cliente.cap].filter(Boolean).join(' ');

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-start justify-center overflow-y-auto bg-black/50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="saas-card my-4 w-full max-w-4xl sm:my-8 print:my-0 print:max-w-full print:rounded-none print:bg-white print:shadow-none">
        <div className="p-5 sm:p-8 print:p-8">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-surface-200 pb-4 dark:border-surface-700 sm:mb-8 sm:flex-row sm:items-center sm:pb-6 print:border-surface-800">
            <div className="flex flex-1 items-center gap-3 sm:gap-4">
              {settings.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo} alt={settings.nomeAzienda || 'Logo'} className="h-12 w-auto object-contain sm:h-16 print:h-20" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logo.png" alt={settings.nomeAzienda || 'Logo'} className="h-12 w-auto object-contain sm:h-16 print:h-20" />
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-2xl print:text-3xl">
                  {settings.nomeAzienda || 'EVA CALÒR'}
                </h1>
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400 sm:text-sm print:text-base">
                  Rapportino e Attivazione Garanzie
                </p>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 print:hidden sm:w-auto">
              {onEdit && (
                <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted sm:flex-none">
                  Modifica
                </button>
              )}
              <button onClick={() => downloadPDF(rapportino, settings)} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:flex-none">
                Stampa
              </button>
              <button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted sm:flex-none">
                Chiudi
              </button>
            </div>
          </div>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white sm:mb-5 sm:text-xl print:text-2xl">Tipologia intervento</h2>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-surface-200/80 bg-surface-100/85 p-4 dark:border-surface-700/70 dark:bg-surface-800/75 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <DetailField label="Tipologia" value={formatTipologiaIntervento(intervento.tipologiaIntervento || intervento.tipoIntervento)} />
              <DetailField label="Data richiesta" value={intervento.dataRichiesta ? format(new Date(intervento.dataRichiesta), 'dd/MM/yyyy') : undefined} />
              <DetailField label="Data intervento" value={`${format(new Date(intervento.data), 'dd/MM/yyyy')} - ${intervento.ora}`} />
            </div>
          </section>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white sm:mb-5 sm:text-xl print:text-2xl">Dati operatore (C.A.T.)</h2>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-surface-200/80 bg-surface-100/85 p-4 dark:border-surface-700/70 dark:bg-surface-800/75 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <DetailField label="Nome e cognome" value={`${rapportino.operatore.nome} ${rapportino.operatore.cognome}`} />
              <DetailField label="Qualifica" value={rapportino.operatore.qualifica} />
              <DetailField label="Telefono" value={rapportino.operatore.telefono} />
              <DetailField label="Email" value={rapportino.operatore.email} />
            </div>
          </section>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white sm:mb-5 sm:text-xl print:text-2xl">Dati cliente</h2>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-surface-200/80 bg-surface-100/85 p-4 dark:border-surface-700/70 dark:bg-surface-800/75 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <DetailField label="Cognome" value={cliente.cognome} />
              <DetailField label="Nome" value={cliente.nome} />
              <DetailField label="Via" value={indirizzoCliente} />
              <DetailField label="Località" value={localitaCliente} />
              <DetailField label="Telefono" value={cliente.telefono} />
            </div>
          </section>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white sm:mb-5 sm:text-xl print:text-2xl">Dati apparecchio</h2>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-surface-200/80 bg-surface-100/85 p-4 dark:border-surface-700/70 dark:bg-surface-800/75 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <DetailField label="Tipo stufa" value={intervento.tipoStufa === 'pellet' ? 'Pellet' : 'Legno'} />
              <DetailField label="Marca" value={intervento.marca} />
              <DetailField label="Modello" value={intervento.modello} />
              <DetailField label="Matricola" value={intervento.numeroSerie} />
              <DetailField label="Data acquisto" value={intervento.dataAcquisto ? format(new Date(intervento.dataAcquisto), 'dd/MM/yyyy') : undefined} />
              <DetailField label="Rivenditore" value={intervento.rivenditore} />
            </div>
          </section>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white sm:mb-5 sm:text-xl print:text-2xl">Relazione intervento</h2>
            <div className="space-y-4 rounded-2xl border border-surface-200/80 bg-surface-100/85 p-4 dark:border-surface-700/70 dark:bg-surface-800/75 sm:p-6">
              {intervento.codiceErrore && (
                <DetailField label="Codice errore" value={formatCodiceErrore(intervento.codiceErrore)} />
              )}
              <DetailField label="Motivo della chiamata" value={intervento.motivoChiamata || intervento.descrizione} />
              <DetailField label="Verifiche" value={intervento.verifiche} />
              <DetailField label="Installazione eseguita da" value={intervento.installazioneEseguitaDa} />
              {intervento.materialiUtilizzati && <DetailField label="Materiali utilizzati" value={intervento.materialiUtilizzati} />}
              {intervento.note && <DetailField label="Note" value={intervento.note} />}
            </div>
          </section>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white sm:mb-5 sm:text-xl print:text-2xl">Controllo per avvio garanzia</h2>
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-surface-200/80 bg-surface-100/85 p-4 dark:border-surface-700/70 dark:bg-surface-800/75 sm:p-6">
              {CONTROLLO_GARANZIA_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1 border-b border-surface-200/60 pb-3 last:border-0 last:pb-0 dark:border-surface-700/60 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-300">{field.label}</p>
                  <p className="font-bold text-surface-900 dark:text-white">{formatSiNoNc(intervento.controlloGaranzia?.[field.key])}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <CondizioniGaranziaSection
              checked={Boolean(intervento.presaVisioneCondizioniGaranzia)}
              onChange={() => {}}
              readOnly
            />
          </section>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white sm:mb-5 sm:text-xl print:text-2xl">Tipologia di installazione</h2>
            <div className="space-y-4 rounded-2xl border border-surface-200/80 bg-surface-100/85 p-4 dark:border-surface-700/70 dark:bg-surface-800/75 sm:p-6">
              <DetailField label="Tipologia" value={formatTipologiaInstallazione(intervento.tipologiaInstallazione)} />
              <DetailField label="Note di installazione" value={intervento.noteInstallazione} />
            </div>
          </section>

          <section className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700 sm:mb-8 sm:pb-8">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white sm:mb-5 sm:text-xl print:text-2xl">Prossimo intervento</h2>
            <div className="rounded-2xl border border-surface-200/80 bg-surface-100/85 p-4 dark:border-surface-700/70 dark:bg-surface-800/75 sm:p-6">
              <DetailField
                label="Termine previsto manutenzione"
                value={intervento.prossimoIntervento ? format(new Date(intervento.prossimoIntervento), 'dd/MM/yyyy') : undefined}
              />
            </div>
          </section>

          <section className="mt-6 border-t border-surface-200 pt-4 dark:border-surface-700 sm:mt-8 sm:pt-6 print:border-surface-800">
            <h2 className="mb-4 text-lg font-bold text-surface-900 dark:text-white">Firme</h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[
                { label: 'Firma cliente privacy', value: intervento.firmaClientePrivacy },
                { label: 'Firma cliente', value: intervento.firmaCliente },
                { label: 'Firma C.A.T.', value: intervento.firmaOperatore },
              ].map((firma) => (
                <div key={firma.label}>
                  <p className="mb-3 text-sm font-medium text-surface-500 dark:text-surface-400">{firma.label}</p>
                  <div className="flex h-20 items-end border-b-2 border-surface-300 dark:border-surface-600">
                    {firma.value ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firma.value} alt={firma.label} className="max-h-16 w-auto object-contain" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-surface-500 dark:text-surface-400">
              Rapportino creato il {format(new Date(rapportino.dataCreazione), 'dd/MM/yyyy HH:mm')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
