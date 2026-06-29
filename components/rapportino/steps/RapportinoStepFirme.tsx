'use client';

import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import SignaturePad from '@/components/SignaturePad';
import FormSectionHeader from '@/components/rapportino/FormSectionHeader';
import type { RapportinoFormValues } from '@/lib/validators/rapportino-form';

interface Props {
  intervento: RapportinoFormValues['intervento'];
  control: Control<RapportinoFormValues>;
  operatoreFirmaFromProfile: boolean;
  setOperatoreFirmaFromProfile: (value: boolean) => void;
  setValue: UseFormSetValue<RapportinoFormValues>;
}

export default function RapportinoStepFirme({
  intervento,
  control,
  operatoreFirmaFromProfile,
  setOperatoreFirmaFromProfile,
  setValue,
}: Props) {
  return (
    <div className="space-y-6">
      <FormSectionHeader
        iconClassName="bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
        icon={
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        }
        title="Firme"
        description="Raccogli le firme per privacy, accettazione e attestazione tecnica"
      />

      <div>
        <label className="mb-1.5 block text-sm font-bold text-foreground">
          Termine previsto prossimo intervento di manutenzione
        </label>
        <input
          type="date"
          value={intervento.prossimoIntervento || ''}
          onChange={(e) => setValue('intervento.prossimoIntervento', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="relative z-10 rounded-md border border-border bg-muted/30 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Controller
            name="intervento.firmaClientePrivacy"
            control={control}
            render={({ field }) => (
              <div data-field="intervento.firmaClientePrivacy">
                <SignaturePad
                  label="Firma del cliente per privacy"
                  value={field.value}
                  required
                  onChange={(firma) => field.onChange(firma)}
                />
              </div>
            )}
          />
          <Controller
            name="intervento.firmaCliente"
            control={control}
            render={({ field }) => (
              <div data-field="intervento.firmaCliente">
                <SignaturePad
                  label="Firma del cliente"
                  value={field.value}
                  required
                  onChange={(firma) => field.onChange(firma)}
                />
              </div>
            )}
          />
          <Controller
            name="intervento.firmaOperatore"
            control={control}
            render={({ field }) => (
              <div data-field="intervento.firmaOperatore">
                <SignaturePad
                  label="Firma del C.A.T."
                  value={field.value}
                  required
                  helperText={
                    operatoreFirmaFromProfile && field.value
                      ? 'Firma del profilo caricata automaticamente. Puoi modificarla se necessario.'
                      : undefined
                  }
                  onChange={(firma) => {
                    setOperatoreFirmaFromProfile(false);
                    field.onChange(firma);
                  }}
                />
              </div>
            )}
          />
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tutte le firme sono obbligatorie per concludere e salvare il rapportino.
        </p>
      </div>
    </div>
  );
}
