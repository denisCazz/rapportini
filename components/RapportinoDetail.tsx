'use client';

import { Rapportino, AziendaSettings } from '@/types';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { downloadPDF } from '@/lib/pdfGenerator';

interface RapportinoDetailProps {
  rapportino: Rapportino;
  settings: AziendaSettings;
  onClose: () => void;
}

export default function RapportinoDetail({ rapportino, settings, onClose }: RapportinoDetailProps) {
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
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full my-4 sm:my-8 print:shadow-none print:max-w-full print:my-0 print:rounded-none animate-slideUp">
        <div className="p-4 sm:p-6 print:p-8">
          {/* Header con logo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-gray-300 dark:border-gray-600 print:border-gray-800 gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              {settings.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logo}
                  alt={settings.nomeAzienda || 'Logo Azienda'}
                  className="h-12 w-auto sm:h-16 object-contain print:h-20"
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt={settings.nomeAzienda || 'Logo Azienda'}
                    className="h-12 w-auto sm:h-16 object-contain print:h-20"
                    onError={(e) => {
                      // Se il logo non esiste, mostra il fallback
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="h-12 w-12 sm:h-16 sm:w-16 bg-primary-600 rounded-lg flex items-center justify-center print:h-20 print:w-20 flex-shrink-0" style={{ display: 'none' }}>
                    <span className="text-white font-bold text-xl sm:text-2xl print:text-3xl">R</span>
                  </div>
                </>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white print:text-3xl">
                  {settings.nomeAzienda || 'Bitora - Gestione Rapportini'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 print:text-base">
                  Sistema Gestione Interventi Stufe
                </p>
              </div>
            </div>
            <div className="flex gap-2 print:hidden w-full sm:w-auto">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base"
              >
                🖨️ Stampa
              </button>
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
              >
                Chiudi
              </button>
            </div>
          </div>

          {/* Dati Operatore */}
          <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 print:text-2xl">Dati Operatore</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Nome e Cognome</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">
                  {rapportino.operatore.nome} {rapportino.operatore.cognome}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Qualifica</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.operatore.qualifica}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Telefono</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.operatore.telefono}</p>
              </div>
              {rapportino.operatore.email && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.operatore.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dati Cliente */}
          <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 print:text-2xl">Dati Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Nome e Cognome</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">
                  {rapportino.cliente.nome} {rapportino.cliente.cognome}
                </p>
              </div>
              {rapportino.cliente.ragioneSociale && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Ragione Sociale</p>
                  <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.cliente.ragioneSociale}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Indirizzo</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">
                  {rapportino.cliente.indirizzo}, {rapportino.cliente.citta} ({rapportino.cliente.cap})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Telefono</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.cliente.telefono}</p>
              </div>
              {rapportino.cliente.email && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.cliente.email}</p>
                </div>
              )}
              {rapportino.cliente.partitaIva && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Partita IVA</p>
                  <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.cliente.partitaIva}</p>
                </div>
              )}
              {rapportino.cliente.codiceFiscale && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Codice Fiscale</p>
                  <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.cliente.codiceFiscale}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dati Intervento */}
          <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 print:text-2xl">Dati Intervento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Data e Ora</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">
                  {format(new Date(rapportino.intervento.data), 'dd/MM/yyyy')} - {rapportino.intervento.ora}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Tipo Stufa</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg capitalize">
                  {rapportino.intervento.tipoStufa === 'pellet' ? 'Pellet' : 'Legno'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Marca</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.intervento.marca}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Modello</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.intervento.modello}</p>
              </div>
              {rapportino.intervento.numeroSerie && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Numero di Serie</p>
                  <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.intervento.numeroSerie}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base">Tipo Intervento</p>
                <p className="font-semibold text-gray-900 dark:text-white print:text-lg">{rapportino.intervento.tipoIntervento}</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base mb-2">Descrizione</p>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap print:text-base">{rapportino.intervento.descrizione}</p>
            </div>
            {rapportino.intervento.materialiUtilizzati && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base mb-2">Materiali Utilizzati</p>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap print:text-base">{rapportino.intervento.materialiUtilizzati}</p>
              </div>
            )}
            {rapportino.intervento.note && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base mb-2">Note Aggiuntive</p>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap print:text-base">{rapportino.intervento.note}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t-2 border-gray-300 dark:border-gray-600 print:border-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base mb-4">Firma Operatore</p>
                <div className="h-16 border-b-2 border-gray-400 dark:border-gray-500 print:border-gray-800"></div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 print:text-sm">
                  {rapportino.operatore.nome} {rapportino.operatore.cognome}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 print:text-base mb-4">Firma Cliente</p>
                <div className="h-16 border-b-2 border-gray-400 dark:border-gray-500 print:border-gray-800"></div>
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
