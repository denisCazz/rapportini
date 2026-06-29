'use client';

import { Rapportino, RapportinoImmagine, AziendaSettings } from '@/types';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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
      <p className="mb-1 text-xs font-medium text-muted-foreground sm:text-sm print:text-base">{label}</p>
      <p className="font-bold text-foreground print:text-lg">{value}</p>
    </div>
  );
}

export default function RapportinoDetail({ rapportino, settings, onClose, onEdit }: RapportinoDetailProps) {
  const [immagini, setImmagini] = useState<RapportinoImmagine[]>(rapportino.immagini ?? []);

  useEffect(() => {
    if (rapportino.immagini?.length) {
      setImmagini(rapportino.immagini);
      return;
    }
    api.getRapportinoImmagini(rapportino.id).then(setImmagini).catch(() => {});
  }, [rapportino.id, rapportino.immagini]);

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
          <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-border pb-4 dark:border-border sm:mb-8 sm:flex-row sm:items-center sm:pb-6 print:border-border">
            <div className="flex flex-1 items-center gap-3 sm:gap-4">
              {settings.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo} alt={settings.nomeAzienda || 'Logo'} className="h-12 w-auto object-contain sm:h-16 print:h-20" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logo.png" alt={settings.nomeAzienda || 'Logo'} className="h-12 w-auto object-contain sm:h-16 print:h-20" />
              )}
              <div>
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl print:text-3xl">
                  {settings.nomeAzienda || 'EVA CALÒR'}
                </h1>
                <p className="text-xs font-medium text-muted-foreground sm:text-sm print:text-base">
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

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">Tipologia intervento</h2>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <DetailField label="Tipologia" value={formatTipologiaIntervento(intervento.tipologiaIntervento || intervento.tipoIntervento)} />
              <DetailField label="Data richiesta" value={intervento.dataRichiesta ? format(new Date(intervento.dataRichiesta), 'dd/MM/yyyy') : undefined} />
              <DetailField label="Data intervento" value={`${format(new Date(intervento.data), 'dd/MM/yyyy')} - ${intervento.ora}`} />
            </div>
          </section>

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">Dati operatore (C.A.T.)</h2>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <DetailField label="Nome e cognome" value={`${rapportino.operatore.nome} ${rapportino.operatore.cognome}`} />
              <DetailField label="Qualifica" value={rapportino.operatore.qualifica} />
              <DetailField label="Telefono" value={rapportino.operatore.telefono} />
              <DetailField label="Email" value={rapportino.operatore.email} />
            </div>
          </section>

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">Dati cliente</h2>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <DetailField label="Cognome" value={cliente.cognome} />
              <DetailField label="Nome" value={cliente.nome} />
              <DetailField label="Via" value={indirizzoCliente} />
              <DetailField label="Località" value={localitaCliente} />
              <DetailField label="Telefono" value={cliente.telefono} />
            </div>
          </section>

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">Dati apparecchio</h2>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <DetailField label="Tipo stufa" value={intervento.tipoStufa === 'pellet' ? 'Pellet' : 'Legno'} />
              <DetailField label="Marca" value={intervento.marca} />
              <DetailField label="Modello" value={intervento.modello} />
              <DetailField label="Matricola" value={intervento.numeroSerie} />
              <DetailField label="Data acquisto" value={intervento.dataAcquisto ? format(new Date(intervento.dataAcquisto), 'dd/MM/yyyy') : undefined} />
              <DetailField label="Rivenditore" value={intervento.rivenditore} />
            </div>
          </section>

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">Relazione intervento</h2>
            <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-6">
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

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">Controllo per avvio garanzia</h2>
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-muted/40 p-4 sm:p-6">
              {CONTROLLO_GARANZIA_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0 dark:border-border sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-foreground">{field.label}</p>
                  <p className="font-bold text-foreground">{formatSiNoNc(intervento.controlloGaranzia?.[field.key])}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <CondizioniGaranziaSection
              checked={Boolean(intervento.presaVisioneCondizioniGaranzia)}
              onChange={() => {}}
              readOnly
            />
          </section>

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">Tipologia di installazione</h2>
            <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-6">
              <DetailField label="Tipologia" value={formatTipologiaInstallazione(intervento.tipologiaInstallazione)} />
              <DetailField label="Note di installazione" value={intervento.noteInstallazione} />
            </div>
          </section>

          <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">Prossimo intervento</h2>
            <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-6">
              <DetailField
                label="Termine previsto manutenzione"
                value={intervento.prossimoIntervento ? format(new Date(intervento.prossimoIntervento), 'dd/MM/yyyy') : undefined}
              />
            </div>
          </section>

          {immagini.length > 0 && (
            <section className="mb-6 border-b border-border pb-6 dark:border-border sm:mb-8 sm:pb-8 print:break-inside-avoid">
              <h2 className="mb-4 font-heading text-lg font-bold text-foreground sm:mb-5 sm:text-xl print:text-2xl">
                Foto intervento
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {immagini.map((img) => (
                  <a
                    key={img.id}
                    href={img.url || `/api/rapportini/${rapportino.id}/immagini/${img.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square overflow-hidden rounded-lg border border-border dark:border-border print:break-inside-avoid"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url || `/api/rapportini/${rapportino.id}/immagini/${img.id}`}
                      alt={img.caption || 'Foto intervento'}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6 border-t border-border pt-4 dark:border-border sm:mt-8 sm:pt-6 print:border-border">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Firme</h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[
                { label: 'Firma cliente privacy', value: intervento.firmaClientePrivacy },
                { label: 'Firma cliente', value: intervento.firmaCliente },
                { label: 'Firma C.A.T.', value: intervento.firmaOperatore },
              ].map((firma) => (
                <div key={firma.label}>
                  <p className="mb-3 text-sm font-medium text-muted-foreground">{firma.label}</p>
                  <div className="flex h-20 items-end border-b-2 border-border">
                    {firma.value ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firma.value} alt={firma.label} className="max-h-16 w-auto object-contain" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Rapportino creato il {format(new Date(rapportino.dataCreazione), 'dd/MM/yyyy HH:mm')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
