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
  iconClassName = 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
}: FormSectionHeaderProps) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-surface-100 bg-surface-50/50 p-3 dark:border-surface-700/50 dark:bg-surface-800/30 sm:items-center sm:gap-4 sm:p-4">
      <div className={`shrink-0 rounded-xl p-2.5 shadow-inner sm:p-3 ${iconClassName}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-surface-900 dark:text-white sm:text-lg">{title}</h3>
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{description}</p>
      </div>
    </div>
  );
}
