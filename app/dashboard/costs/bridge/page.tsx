import { getDailyBridgeUsage, getCostSummary } from "@/features/costs/queries";
import { MetricCard } from "@/components/metric-card";
import { BridgeUsageChart } from "@/features/costs/components/bridge-usage-chart";
import {
  ZapIcon,
  DollarSignIcon,
  LayersIcon,
  MicIcon,
} from "lucide-react";
import { COST_CONSTANTS } from "@/features/costs/lib/cost-calculator";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function BridgePage() {
  const [daily, summary] = await Promise.all([
    getDailyBridgeUsage(),
    getCostSummary(),
  ]);

  const totalChunks = daily.reduce((sum, d) => sum + d.chunkCount, 0);
  const totalSessions = daily.reduce((sum, d) => sum + d.sessionCount, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Bridge Cost"
          value={`$${summary.bridgeTotal.toFixed(2)}`}
          icon={DollarSignIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Total Chunks"
          value={totalChunks.toLocaleString()}
          icon={LayersIcon}
          accent="emerald"
          compact
        />
        <MetricCard
          title="Sessions"
          value={totalSessions}
          icon={MicIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="Rate"
          value={`$${COST_CONSTANTS.BRIDGE_COST_PER_CHUNK}/chunk`}
          subtitle="Gemini Flash pricing"
          icon={ZapIcon}
          accent="amber"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <BridgeUsageChart data={daily} />
      </div>
    </>
  );
}
