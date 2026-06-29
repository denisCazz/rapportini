'use client';

import {
  CONDIZIONI_GARANZIA_CHECKBOX_LABEL,
  CONDIZIONI_GARANZIA_DICHIARAZIONE,
  CONDIZIONI_GARANZIA_INTRO,
  CONDIZIONI_GARANZIA_ITEMS,
} from '@/lib/rapportino-constants';

interface CondizioniGaranziaSectionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  readOnly?: boolean;
}

export default function CondizioniGaranziaSection({
  checked,
  onChange,
  readOnly = false,
}: CondizioniGaranziaSectionProps) {
  return (
    <div className="space-y-4 rounded-md border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10 sm:p-5">
      <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">
        Condizioni di garanzia
      </h4>
      <p className="text-sm leading-relaxed text-foreground/80">
        {CONDIZIONI_GARANZIA_INTRO}
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/80">
        {CONDIZIONI_GARANZIA_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="text-sm font-medium text-foreground">
        {CONDIZIONI_GARANZIA_DICHIARAZIONE}
      </p>

      {readOnly ? (
        <p className="text-sm font-bold text-foreground">
          {checked ? '☑' : '☐'} {CONDIZIONI_GARANZIA_CHECKBOX_LABEL}
        </p>
      ) : (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input bg-background p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-input text-primary focus:ring-ring"
            required
          />
          <span className="text-sm font-semibold text-foreground">
            {CONDIZIONI_GARANZIA_CHECKBOX_LABEL}
          </span>
        </label>
      )}
    </div>
  );
}
