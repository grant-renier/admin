import {
  getPsychometricScales,
  PsychometricScalesTable,
} from "@/features/learn";
import { MetricCard } from "@/components/metric-card";
import { BrainIcon, ShieldCheckIcon } from "lucide-react";

export default async function PsychometricsPage() {
  const scales = await getPsychometricScales();

  const systemCount = scales.filter((s) => s.is_system).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Scales"
          value={scales.length}
          icon={BrainIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="System Scales"
          value={systemCount}
          icon={ShieldCheckIcon}
          accent="blue"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <PsychometricScalesTable data={scales} />
      </div>
    </>
  );
}
