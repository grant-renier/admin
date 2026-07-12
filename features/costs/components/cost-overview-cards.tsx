import { MetricCard } from "@/components/metric-card";
import { CostEstimateNote } from "@/components/cost-estimate-note";
import {
  DollarSignIcon,
  AudioWaveformIcon,
  BrainCircuitIcon,
  ZapIcon,
} from "lucide-react";
import type { CostSummary } from "../types";

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function CostOverviewCards({ summary }: { summary: CostSummary }) {
  return (
    <div className="space-y-2 px-4 lg:px-6">
      <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Cost (Estimated)"
          value={fmt(summary.grandTotal)}
          subtitle="All providers combined"
          icon={DollarSignIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Deepgram (Estimated)"
          value={fmt(summary.deepgramTotal)}
          subtitle="STT · $0.0043/min"
          icon={AudioWaveformIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="AI Chat (Estimated)"
          value={fmt(summary.aiChatTotal)}
          subtitle="OpenRouter tokens"
          icon={BrainCircuitIcon}
          accent="amber"
          compact
        />
        <MetricCard
          title="Bridge (Estimated)"
          value={fmt(summary.bridgeTotal)}
          subtitle="Gemini · $0.00025/chunk"
          icon={ZapIcon}
          accent="emerald"
          compact
        />
      </div>
      <CostEstimateNote />
    </div>
  );
}
