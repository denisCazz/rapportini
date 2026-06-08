'use client';

import FormSectionHeader from '@/components/rapportino/FormSectionHeader';
import {
  TIPOLOGIA_INTERVENTO_LABELS,
  TIPOLOGIA_INTERVENTO_VALUES,
} from '@/lib/rapportino-constants';
import type { RapportinoFormValues } from '@/lib/validators/rapportino-form';
import type { UseFormSetValue } from 'react-hook-form';

interface Props {
  intervento: RapportinoFormValues['intervento'];
  setValue: UseFormSetValue<RapportinoFormValues>;
}

export default function RapportinoStepTipologia({ intervento, setValue }: Props) {
  return (
    <div className="space-y-6 pb-2 sm:pb-0">
      <FormSectionHeader
        iconClassName="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        icon={
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
        title="Tipologia intervento"
        description="Seleziona il tipo di intervento e le date di riferimento"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
            Tipologia intervento <span className="text-red-500">*</span>
          </label>
          <select
            value={intervento.tipologiaIntervento}
            onChange={(e) =>
              setValue('intervento.tipologiaIntervento', e.target.value as typeof intervento.tipologiaIntervento)
            }
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            required
          >
            {TIPOLOGIA_INTERVENTO_VALUES.map((value) => (
              <option key={value} value={value}>
                {TIPOLOGIA_INTERVENTO_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
            Data richiesta
          </label>
          <input
            type="date"
            value={intervento.dataRichiesta || ''}
            onChange={(e) => setValue('intervento.dataRichiesta', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
            Data intervento <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={intervento.data}
            onChange={(e) => setValue('intervento.data', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
            Ora intervento <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={intervento.ora}
            onChange={(e) => setValue('intervento.ora', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
            required
          />
        </div>
      </div>
    </div>
  );
}
