'use client';

import type { SiNoNc } from '@/lib/rapportino-constants';
import { SI_NO_NC_LABELS, SI_NO_NC_VALUES } from '@/lib/rapportino-constants';

interface SiNoNcFieldProps {
  label: string;
  value?: SiNoNc;
  onChange: (value: SiNoNc) => void;
  name: string;
}

export default function SiNoNcField({ label, value, onChange, name }: SiNoNcFieldProps) {
  return (
    <fieldset className="rounded-md border border-input bg-background p-3 sm:p-4">
      <legend className="px-1 text-sm font-bold text-foreground">
        {label}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {SI_NO_NC_VALUES.map((option) => (
          <label
            key={option}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              value === option
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input text-foreground hover:bg-muted'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 border-input text-primary focus:ring-ring"
            />
            {SI_NO_NC_LABELS[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
