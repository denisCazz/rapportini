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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Rapportini ({rapportini.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilter('pellet')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'pellet'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pellet
            </button>
            <button
              onClick={() => setFilter('legno')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'legno'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Legno
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredRapportini.map((rapportino) => (
            <div
              key={rapportino.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-700"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        rapportino.intervento.tipoStufa === 'pellet'
                          ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                          : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                      }`}
                    >
                      {rapportino.intervento.tipoStufa === 'pellet' ? '🔥 Pellet' : '🪵 Legno'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(rapportino.intervento.data), 'dd/MM/yyyy')} - {rapportino.intervento.ora}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {rapportino.cliente.nome} {rapportino.cliente.cognome}
                    {rapportino.cliente.ragioneSociale && ` - ${rapportino.cliente.ragioneSociale}`}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {rapportino.cliente.indirizzo}, {rapportino.cliente.citta} ({rapportino.cliente.cap})
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Intervento:</span> {rapportino.intervento.tipoIntervento} - {rapportino.intervento.marca} {rapportino.intervento.modello}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    <span className="font-medium">Operatore:</span> {rapportino.operatore.nome} {rapportino.operatore.cognome}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRapportino(rapportino)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  >
                    Visualizza
                  </button>
                  <button
                    onClick={() => handleDelete(rapportino.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
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
