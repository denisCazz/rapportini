'use client';

import { Rapportino, AziendaSettings } from '@/types';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { downloadPDF } from '@/lib/pdfGenerator';

interface RapportinoDetailProps {
  rapportino: Rapportino;
  settings: AziendaSettings;
  onClose: () => void;
  onEdit?: () => void;
}

export default function RapportinoDetail({ rapportino, settings, onClose, onEdit }: RapportinoDetailProps) {
  useEffect(() => {
    // Previene lo scroll del body quando il modal è aperto
    document.body.style.overflow = 'hidden';
    
    // Chiude il modal con il tasto ESC
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handlePrint = async () => {
    await downloadPDF(rapportino, settings);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-surface-900/75 backdrop-blur-sm z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in-up"
      onClick={handleOverlayClick}
    >
      <div className="glass-card bg-surface-50/95 dark:bg-surface-900/95 rounded-3xl shadow-2xl max-w-4xl w-full my-4 sm:my-8 print:shadow-none print:max-w-full print:my-0 print:rounded-none print:bg-white">
        <div className="p-5 sm:p-8 print:p-8">
          {/* Header con logo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-surface-200 dark:border-surface-700 print:border-surface-800 gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              {settings.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logo}
                  alt={settings.nomeAzienda || 'Logo Azienda'}
                  className="h-12 w-auto sm:h-16 object-contain print:h-20 drop-shadow-sm"
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt={settings.nomeAzienda || 'Logo Azienda'}
                    className="h-12 w-auto sm:h-16 object-contain print:h-20 drop-shadow-sm"
                    onError={(e) => {
                      // Se il logo non esiste, mostra il fallback
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center print:h-20 print:w-20 flex-shrink-0 shadow-glow" style={{ display: 'none' }}>
                    <span className="text-white font-bold text-xl sm:text-2xl print:text-3xl">R</span>
                  </div>
                </>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white print:text-3xl tracking-tight">
                  {settings.nomeAzienda || 'Bitora - Gestione Rapportini'}
                </h1>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium">
                  Sistema Gestione Interventi Stufe
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden w-full sm:w-auto">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-2xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all text-sm font-bold flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifica
                </button>
              )}
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-2xl hover:from-primary-500 hover:to-primary-400 transition-all text-sm font-bold shadow-glow flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                🖨️ Stampa
              </button>
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 rounded-2xl hover:bg-surface-200 dark:hover:bg-surface-700 transition-all text-sm font-bold flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                Chiudi
              </button>
            </div>
          </div>

          {/* Dati Operatore */}
          <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white mb-4 sm:mb-5 print:text-2xl flex items-center gap-2">
              <span className="p-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-surface-500 dark:text-surface-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </span>
              Dati Operatore
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-surface-100/85 dark:bg-surface-800/75 p-4 sm:p-6 rounded-2xl border border-surface-200/80 dark:border-surface-700/70">
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Nome e Cognome</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">
                  {rapportino.operatore.nome} {rapportino.operatore.cognome}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Qualifica</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.operatore.qualifica}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Telefono</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.operatore.telefono}</p>
              </div>
              {rapportino.operatore.email && (
                <div>
                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Email</p>
                  <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.operatore.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dati Cliente */}
          <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white mb-4 sm:mb-5 print:text-2xl flex items-center gap-2">
              <span className="p-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-surface-500 dark:text-surface-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </span>
              Dati Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-surface-100/85 dark:bg-surface-800/75 p-4 sm:p-6 rounded-2xl border border-surface-200/80 dark:border-surface-700/70">
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Nome e Cognome</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">
                  {rapportino.cliente.nome} {rapportino.cliente.cognome}
                </p>
              </div>
              {rapportino.cliente.ragioneSociale && (
                <div>
                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Ragione Sociale</p>
                  <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.cliente.ragioneSociale}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Indirizzo</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">
                  {rapportino.cliente.indirizzo}, {rapportino.cliente.citta} ({rapportino.cliente.cap})
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Telefono</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.cliente.telefono}</p>
              </div>
              {rapportino.cliente.email && (
                <div>
                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Email</p>
                  <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.cliente.email}</p>
                </div>
              )}
              {rapportino.cliente.partitaIva && (
                <div>
                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Partita IVA</p>
                  <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.cliente.partitaIva}</p>
                </div>
              )}
              {rapportino.cliente.codiceFiscale && (
                <div>
                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Codice Fiscale</p>
                  <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.cliente.codiceFiscale}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dati Intervento */}
          <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white mb-4 sm:mb-5 print:text-2xl flex items-center gap-2">
              <span className="p-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-surface-500 dark:text-surface-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </span>
              Dati Intervento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 bg-surface-100/85 dark:bg-surface-800/75 p-4 sm:p-6 rounded-2xl border border-surface-200/80 dark:border-surface-700/70">
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Data e Ora</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">
                  {format(new Date(rapportino.intervento.data), 'dd/MM/yyyy')} - {rapportino.intervento.ora}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Tipo Stufa</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg capitalize flex items-center gap-2">
                  {rapportino.intervento.tipoStufa === 'pellet' ? '🔥 Pellet' : '🪵 Legno'}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Marca</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.intervento.marca}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Modello</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.intervento.modello}</p>
              </div>
              {rapportino.intervento.numeroSerie && (
                <div>
                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Numero di Serie</p>
                  <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.intervento.numeroSerie}</p>
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-1">Tipo Intervento</p>
                <p className="font-bold text-surface-900 dark:text-white print:text-lg">{rapportino.intervento.tipoIntervento}</p>
              </div>
            </div>
            <div className="mb-4 sm:mb-6 bg-surface-100/85 dark:bg-surface-800/75 p-4 sm:p-6 rounded-2xl border border-surface-200/80 dark:border-surface-700/70">
              <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-2">Descrizione</p>
              <p className="text-surface-900 dark:text-white whitespace-pre-wrap print:text-base font-medium">{rapportino.intervento.descrizione}</p>
            </div>
            {rapportino.intervento.materialiUtilizzati && (
              <div className="mb-4 sm:mb-6 bg-surface-100/85 dark:bg-surface-800/75 p-4 sm:p-6 rounded-2xl border border-surface-200/80 dark:border-surface-700/70">
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-2">Materiali Utilizzati</p>
                <p className="text-surface-900 dark:text-white whitespace-pre-wrap print:text-base font-medium">{rapportino.intervento.materialiUtilizzati}</p>
              </div>
            )}
            {rapportino.intervento.note && (
              <div className="bg-surface-100/85 dark:bg-surface-800/75 p-4 sm:p-6 rounded-2xl border border-surface-200/80 dark:border-surface-700/70">
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-2">Note Aggiuntive</p>
                <p className="text-surface-900 dark:text-white whitespace-pre-wrap print:text-base font-medium">{rapportino.intervento.note}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-surface-200 dark:border-surface-700 print:border-surface-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 print:text-base font-medium mb-4">Firma Operatore</p>
                <div className="h-20 border-b-2 border-surface-300 dark:border-surface-600 print:border-surface-800 flex items-end justify-start">
                  {rapportino.intervento.firmaOperatore ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rapportino.intervento.firmaOperatore}
                      alt="Firma operatore"
                      className="max-h-16 w-auto object-contain"
                    />
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 print:text-sm">
                  {rapportino.operatore.nome} {rapportino.operatore.cognome}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base mb-4">Firma Cliente</p>
                <div className="h-20 border-b-2 border-gray-400 dark:border-gray-500 print:border-gray-800 flex items-end justify-start">
                  {rapportino.intervento.firmaCliente ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rapportino.intervento.firmaCliente}
                      alt="Firma cliente"
                      className="max-h-16 w-auto object-contain"
                    />
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 print:text-sm">
                  {rapportino.cliente.nome} {rapportino.cliente.cognome}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 text-center print:text-sm">
              Rapportino creato il {format(new Date(rapportino.dataCreazione), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
