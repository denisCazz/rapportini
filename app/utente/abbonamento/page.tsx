'use client';

import { Suspense } from 'react';
import PageLoader from '@/components/ui/PageLoader';
import AbbonamentoContent from '@/components/utente/AbbonamentoContent';

export default function AbbonamentoPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AbbonamentoContent />
    </Suspense>
  );
}
