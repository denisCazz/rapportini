'use client';

import type { ReactNode } from 'react';

interface FormSectionHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  iconClassName?: string;
}

export default function FormSectionHeader({
  icon,
  title,
  description,
  iconClassName = 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20',
}: FormSectionHeaderProps) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:items-center sm:gap-4 sm:p-4">
      <div className={`shrink-0 rounded-xl p-2.5 sm:p-3 ${iconClassName}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">{title}</h3>
        <p className="text-sm font-medium text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
