import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export default function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Riprova',
  className,
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        'mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20',
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
      <p className="flex-1 text-sm font-medium text-red-800 dark:text-red-200">{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
