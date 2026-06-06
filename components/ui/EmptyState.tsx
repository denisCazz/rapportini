import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass-card flex min-h-[280px] flex-col items-center justify-center rounded-3xl p-12 text-center',
        className
      )}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-100 shadow-inner dark:bg-surface-800">
        {icon ?? <FileText className="h-10 w-10 text-surface-400 dark:text-surface-500" aria-hidden />}
      </div>
      <h3 className="mb-2 text-2xl font-bold tracking-tight text-surface-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mb-6 max-w-md font-medium text-surface-500 dark:text-surface-400">{description}</p>
      )}
      {action}
    </div>
  );
}
