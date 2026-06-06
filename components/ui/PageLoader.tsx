import { cn } from '@/lib/utils';

interface PageLoaderProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export default function PageLoader({
  message = 'Caricamento in corso…',
  className,
  fullScreen = false,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullScreen ? 'min-h-screen' : 'min-h-[280px] py-12',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-primary-200 dark:border-primary-900" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
