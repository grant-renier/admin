import { getPsychometricScales } from "@/features/learn/queries";
import { MetricCard } from "@/components/metric-card";
import { BrainIcon, ShieldCheckIcon } from "lucide-react";
import { PsychometricsPageClient } from "./client";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

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
        <PsychometricsPageClient data={scales} />
      </div>
    </>
  );
}
