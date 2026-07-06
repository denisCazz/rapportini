'use client';

import ModulePageShell from '@/components/modules/ModulePageShell';
import PlannerPanel from '@/components/modules/PlannerPanel';
import { PAID_MODULES } from '@/lib/modules';

const modulo = PAID_MODULES.find((m) => m.code === 'planner')!;

export default function PlannerPage() {
  return (
    <ModulePageShell modulo={modulo}>
      <PlannerPanel />
    </ModulePageShell>
  );
}
