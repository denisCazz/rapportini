'use client';

import { useState } from 'react';
import { Rapportino, AziendaSettings } from '@/types';
import { format } from 'date-fns';
import RapportinoDetail from './RapportinoDetail';

interface RapportiniListProps {
  rapportini: Rapportino[];
  onDelete: (id: string) => void;
  settings: AziendaSettings;
}

export default function RapportiniList({ rapportini, onDelete, settings }: RapportiniListProps) {
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const [filter, setFilter] = useState<'all' | 'pellet' | 'legno'>('all');

  const filteredRapportini = rapportini.filter((r) => {
    if (filter === 'all') return true;
    return r.intervento.tipoStufa === filter;
  });

  const handleDelete = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo rapportino?')) {
      onDelete(id);
    }
  };

  if (rapportini.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
        <svg
          className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nessun rapportino presente</h3>
        <p className="text-gray-600 dark:text-gray-300">Crea il tuo primo rapportino per iniziare</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Rapportini
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {rapportini.length} {rapportini.length === 1 ? 'rapportino' : 'rapportini'} totali
              {filter !== 'all' && ` • ${filteredRapportini.length} ${filter === 'pellet' ? 'pellet' : 'legno'}`}
            </p>
          </div>
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${
                filter === 'all'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilter('pellet')}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${
                filter === 'pellet'
                  ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🔥 Pellet
            </button>
            <button
              onClick={() => setFilter('legno')}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${
                filter === 'legno'
                  ? 'bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🪵 Legno
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredRapportini.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Nessun rapportino trovato con i filtri selezionati</p>
            </div>
          ) : (
            filteredRapportini.map((rapportino) => (
              <div
                key={rapportino.id}
                className="group border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 bg-white dark:bg-gray-700/50"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          rapportino.intervento.tipoStufa === 'pellet'
                            ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800'
                            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {rapportino.intervento.tipoStufa === 'pellet' ? '🔥 Pellet' : '🪵 Legno'}
                      </span>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {format(new Date(rapportino.intervento.data), 'dd MMMM yyyy')} alle {rapportino.intervento.ora}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {rapportino.cliente.nome} {rapportino.cliente.cognome}
                      {rapportino.cliente.ragioneSociale && (
                        <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                          • {rapportino.cliente.ragioneSociale}
                        </span>
                      )}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{rapportino.cliente.indirizzo}, {rapportino.cliente.citta} ({rapportino.cliente.cap})</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {rapportino.cliente.telefono}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold text-gray-900 dark:text-white">Intervento:</span> {rapportino.intervento.tipoIntervento}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-medium">Apparecchio:</span> {rapportino.intervento.marca} {rapportino.intervento.modello}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-medium">Operatore:</span> {rapportino.operatore.nome} {rapportino.operatore.cognome} • {rapportino.operatore.qualifica}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 lg:flex-col lg:items-end">
                    <button
                      onClick={() => setSelectedRapportino(rapportino)}
                      className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all text-sm font-medium shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Visualizza
                    </button>
                    <button
                      onClick={() => handleDelete(rapportino.id)}
                      className="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedRapportino && (
        <RapportinoDetail
          rapportino={selectedRapportino}
          settings={settings}
          onClose={() => setSelectedRapportino(null)}
        />
      )}
    </>
  );
}
