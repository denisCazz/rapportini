'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Rapportino, AziendaSettings } from '@/types';
import { format } from 'date-fns';
import RapportinoDetail from './RapportinoDetail';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RapportiniListProps {
  rapportini: Rapportino[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onEdit?: (rapportino: Rapportino) => void;
  settings: AziendaSettings;
  showCreateAction?: boolean;
}

export default function RapportiniList({
  rapportini,
  loading = false,
  onDelete,
  onEdit,
  settings,
  showCreateAction = false,
}: RapportiniListProps) {
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const [filter, setFilter] = useState<'all' | 'pellet' | 'legno'>('all');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const filteredRapportini = rapportini.filter((r) => {
    if (filter === 'all') return true;
    return r.intervento.tipoStufa === filter;
  });

  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      onDelete(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  if (loading && rapportini.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Intervento</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-56" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-8 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!loading && rapportini.length === 0) {
    return (
      <EmptyState
        title="Nessun rapportino presente"
        description="Crea il tuo primo rapportino per iniziare"
        action={
          showCreateAction ? (
            <Link href="/rapportini/nuovo">
              <Button size="lg" className="rounded-2xl">
                Nuovo rapportino
              </Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          'bg-white/50 dark:bg-surface-900/50 rounded-3xl shadow-sm border border-surface-200 dark:border-surface-800 p-4 sm:p-6 mb-6 backdrop-blur-sm transition-opacity',
          loading && rapportini.length > 0 && 'opacity-60 pointer-events-none'
        )}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white mb-1 tracking-tight">
              Rapportini
            </h2>
            <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 font-medium">
              {rapportini.length} {rapportini.length === 1 ? 'rapportino' : 'rapportini'} totali
              {filter !== 'all' && ` • ${filteredRapportini.length} ${filter === 'pellet' ? 'pellet' : 'legno'}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 bg-surface-100/80 dark:bg-surface-800/80 p-1.5 rounded-2xl w-full sm:w-auto backdrop-blur-sm border border-surface-200/50 dark:border-surface-700/50">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-bold ${
                filter === 'all'
                  ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-surface-700/50'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilter('pellet')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-bold ${
                filter === 'pellet'
                  ? 'bg-white dark:bg-surface-700 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-surface-700/50'
              }`}
            >
              🔥 Pellet
            </button>
            <button
              onClick={() => setFilter('legno')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-bold ${
                filter === 'legno'
                  ? 'bg-white dark:bg-surface-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-surface-700/50'
              }`}
            >
              🪵 Legno
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredRapportini.length === 0 ? (
            <div className="text-center py-16 bg-surface-50/50 dark:bg-surface-800/30 rounded-3xl border border-dashed border-surface-200 dark:border-surface-700">
              <p className="text-surface-500 dark:text-surface-400 font-medium">Nessun rapportino trovato con i filtri selezionati</p>
            </div>
          ) : (
            filteredRapportini.map((rapportino) => (
              <div
                key={rapportino.id}
                className="group relative overflow-hidden rounded-3xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary-300 dark:hover:border-primary-700"
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full ${rapportino.intervento.tipoStufa === 'pellet' ? 'bg-gradient-to-b from-orange-400 to-orange-600' : 'bg-gradient-to-b from-amber-500 to-amber-700'}`} />
                <div className="p-5 sm:p-6 pl-6 sm:pl-8">
                  <div className="flex flex-col gap-5 sm:gap-6">
                    <div className="flex-1 min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                            rapportino.intervento.tipoStufa === 'pellet'
                              ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-800/50'
                              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50'
                          }`}
                        >
                          {rapportino.intervento.tipoStufa === 'pellet' ? '🔥' : '🪵'}
                          {rapportino.intervento.tipoStufa === 'pellet' ? 'Pellet' : 'Legno'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-900/50 px-3 py-1.5 rounded-xl border border-surface-100 dark:border-surface-800">
                          <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {format(new Date(rapportino.intervento.data), 'dd MMM yyyy')} · {rapportino.intervento.ora}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white mb-1 break-words tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {rapportino.cliente.nome} {rapportino.cliente.cognome}
                        </h3>
                        {rapportino.cliente.ragioneSociale && (
                          <p className="text-sm text-surface-500 dark:text-surface-400 truncate max-w-full font-medium">{rapportino.cliente.ragioneSociale}</p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-5 text-sm text-surface-600 dark:text-surface-400 font-medium">
                        <span className="flex items-center gap-2 min-w-0 bg-surface-50 dark:bg-surface-900/30 px-3 py-2 rounded-xl border border-surface-100 dark:border-surface-800/50">
                          <svg className="w-4 h-4 text-surface-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="break-words truncate">{rapportino.cliente.indirizzo}, {rapportino.cliente.citta}</span>
                        </span>
                        <span className="flex items-center gap-2 bg-surface-50 dark:bg-surface-900/30 px-3 py-2 rounded-xl border border-surface-100 dark:border-surface-800/50">
                          <svg className="w-4 h-4 text-surface-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <a href={`tel:${rapportino.cliente.telefono}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">{rapportino.cliente.telefono}</a>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
                        <span className="px-3 py-1.5 bg-surface-100 dark:bg-surface-700 rounded-xl text-xs font-bold text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-600">
                          {rapportino.intervento.tipoIntervento}
                        </span>
                        <span className="px-3 py-1.5 bg-surface-50 dark:bg-surface-800/50 rounded-xl text-xs font-semibold text-surface-600 dark:text-surface-400 border border-surface-100 dark:border-surface-700/50">
                          {rapportino.intervento.marca} {rapportino.intervento.modello}
                        </span>
                        <span className="px-3 py-1.5 bg-surface-50 dark:bg-surface-800/50 rounded-xl text-xs font-semibold text-surface-500 dark:text-surface-500 border border-surface-100 dark:border-surface-700/50">
                          Op: {rapportino.operatore.nome} {rapportino.operatore.cognome}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3 shrink-0 border-t border-surface-100 dark:border-surface-700 pt-5 sm:pt-0 sm:border-t-0">
                      <button
                        onClick={() => setSelectedRapportino(rapportino)}
                        className="flex-1 sm:flex-none min-w-[110px] px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-2xl hover:from-primary-500 hover:to-primary-400 transition-all text-sm font-bold shadow-glow flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Visualizza
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => { onEdit(rapportino); setSelectedRapportino(null); }}
                          className="flex-1 sm:flex-none min-w-[110px] px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-2xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all text-sm font-bold flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Modifica
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTargetId(rapportino.id)}
                        className="flex-1 sm:flex-none min-w-[110px] px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all text-sm font-bold flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                        aria-label={`Elimina rapportino di ${rapportino.cliente.nome} ${rapportino.cliente.cognome}`}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Elimina
                      </button>
                    </div>
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
          onEdit={onEdit ? () => { onEdit(selectedRapportino); setSelectedRapportino(null); } : undefined}
        />
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Elimina rapportino"
        description="Sei sicuro di voler eliminare questo rapportino? L'operazione non può essere annullata."
        confirmLabel="Elimina"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
