import { getDailyAIChatUsage, getCostSummary } from "@/features/costs/queries";
import { AITokenChart } from "@/features/costs";
import { MetricCard } from "@/components/metric-card";
import {
  BrainCircuitIcon,
  DollarSignIcon,
  MessageSquareIcon,
  CoinsIcon,
} from "lucide-react";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function AIChatPage() {
  const [daily, summary] = await Promise.all([
    getDailyAIChatUsage(),
    getCostSummary(),
  ]);

  const totalInput = daily.reduce((sum, d) => sum + d.inputTokens, 0);
  const totalOutput = daily.reduce((sum, d) => sum + d.outputTokens, 0);
  const totalMessages = daily.reduce((sum, d) => sum + d.messageCount, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="AI Chat Cost"
          value={`$${summary.aiChatTotal.toFixed(2)}`}
          icon={DollarSignIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Input Tokens"
          value={totalInput.toLocaleString()}
          icon={CoinsIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="Output Tokens"
          value={totalOutput.toLocaleString()}
          icon={BrainCircuitIcon}
          accent="amber"
          compact
        />
        <MetricCard
          title="Messages"
          value={totalMessages.toLocaleString()}
          icon={MessageSquareIcon}
          accent="emerald"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <AITokenChart data={daily} />
      </div>
    </>
  );
}
