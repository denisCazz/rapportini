'use client';

interface RapportinoStepIndicatorProps {
  step: number;
}

export default function RapportinoStepIndicator({ step }: RapportinoStepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center flex-1">
          <div
            className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              s <= step ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              s < step
                ? 'bg-primary-600 text-white shadow-lg'
                : s === step
                ? 'bg-primary-600 text-white shadow-lg ring-4 ring-primary-200 dark:ring-primary-900'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {s < step ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              s
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
