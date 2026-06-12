'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import ReportClientePanel from '@/components/modules/ReportClientePanel';
import { PAID_MODULES } from '@/lib/modules';

const modulo = PAID_MODULES.find((m) => m.code === 'report_cliente')!;

export default function ReportClientePage() {
  return (
    <ModulePageShell modulo={modulo}>
      <ReportClientePanel />
    </ModulePageShell>
  );
}
