'use client';

import SignaturePad from '@/components/SignaturePad';
import FormSectionHeader from '@/components/rapportino/FormSectionHeader';
import type { RapportinoFormValues } from '@/lib/validators/rapportino-form';
import type { UseFormSetValue } from 'react-hook-form';

interface Props {
  intervento: RapportinoFormValues['intervento'];
  operatoreFirmaFromProfile: boolean;
  setOperatoreFirmaFromProfile: (value: boolean) => void;
  setValue: UseFormSetValue<RapportinoFormValues>;
}

export default function RapportinoStepFirme({
  intervento,
  operatoreFirmaFromProfile,
  setOperatoreFirmaFromProfile,
  setValue,
}: Props) {
  return (
    <div className="space-y-6">
      <FormSectionHeader
        iconClassName="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
        icon={
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        }
        title="Firme"
        description="Raccogli le firme per privacy, accettazione e attestazione tecnica"
      />

      <div>
        <label className="mb-1.5 block text-sm font-bold text-surface-700 dark:text-surface-300">
          Termine previsto prossimo intervento di manutenzione
        </label>
        <input
          type="date"
          value={intervento.prossimoIntervento || ''}
          onChange={(e) => setValue('intervento.prossimoIntervento', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="relative z-10 rounded-md border border-surface-200 bg-muted/30 p-4 dark:border-surface-700 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SignaturePad
            label="Firma del cliente per privacy"
            value={intervento.firmaClientePrivacy}
            required
            onChange={(firma) => setValue('intervento.firmaClientePrivacy', firma)}
          />
          <SignaturePad
            label="Firma del cliente"
            value={intervento.firmaCliente}
            required
            onChange={(firma) => setValue('intervento.firmaCliente', firma)}
          />
          <SignaturePad
            label="Firma del C.A.T."
            value={intervento.firmaOperatore}
            required
            helperText={
              operatoreFirmaFromProfile && intervento.firmaOperatore
                ? 'Firma del profilo caricata automaticamente. Puoi modificarla se necessario.'
                : undefined
            }
            onChange={(firma) => {
              setOperatoreFirmaFromProfile(false);
              setValue('intervento.firmaOperatore', firma);
            }}
          />
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tutte le firme sono obbligatorie per concludere e salvare il rapportino.
        </p>
      </div>
    </div>
  );
}
