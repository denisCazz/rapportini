'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import PlannerExternalPanel from '@/components/modules/PlannerExternalPanel';
import { PAID_MODULES } from '@/lib/modules';

const modulo = PAID_MODULES.find((m) => m.code === 'planner')!;

export default function PlannerPage() {
  return (
    <ModulePageShell modulo={modulo}>
      <PlannerExternalPanel />
    </ModulePageShell>
  );
}
