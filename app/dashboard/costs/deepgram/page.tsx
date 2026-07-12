import { getDailyDeepgramUsage, getCostSummary } from "@/features/costs/queries";
import { DeepgramUsageChart } from "@/features/costs";
import { MetricCard } from "@/components/metric-card";
import { CostEstimateNote } from "@/components/cost-estimate-note";
import { AudioWaveformIcon, DollarSignIcon, ClockIcon } from "lucide-react";
import { COST_CONSTANTS } from "@/features/costs/lib/cost-calculator";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function DeepgramPage() {
  const [daily, summary] = await Promise.all([
    getDailyDeepgramUsage(),
    getCostSummary(),
  ]);

  const totalMinutes = daily.reduce((sum, d) => sum + d.minutes, 0);
  const totalSessions = daily.reduce((sum, d) => sum + d.sessionCount, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Deepgram Cost (Estimated)"
          value={`$${summary.deepgramTotal.toFixed(2)}`}
          subtitle="Minutes × hardcoded rate"
          icon={DollarSignIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Total Minutes"
          value={Math.round(totalMinutes)}
          icon={ClockIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="Sessions Processed"
          value={totalSessions}
          icon={AudioWaveformIcon}
          accent="emerald"
          compact
        />
        <MetricCard
          title="Rate"
          value={`$${COST_CONSTANTS.DEEPGRAM_COST_PER_MINUTE}/min`}
          subtitle="Nova-3 pay-as-you-go"
          accent="amber"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <CostEstimateNote />
      </div>
      <div className="px-4 lg:px-6">
        <DeepgramUsageChart data={daily} />
      </div>
    </>
  );
}
