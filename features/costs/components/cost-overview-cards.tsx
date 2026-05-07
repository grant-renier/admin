import { MetricCard } from "@/components/metric-card";
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
    <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
      <MetricCard
        title="Total Cost"
        value={fmt(summary.grandTotal)}
        icon={DollarSignIcon}
        accent="primary"
        compact
      />
      <MetricCard
        title="Deepgram (STT)"
        value={fmt(summary.deepgramTotal)}
        subtitle="$0.0043/min"
        icon={AudioWaveformIcon}
        accent="blue"
        compact
      />
      <MetricCard
        title="AI Chat (LLM)"
        value={fmt(summary.aiChatTotal)}
        subtitle="OpenRouter tokens"
        icon={BrainCircuitIcon}
        accent="amber"
        compact
      />
      <MetricCard
        title="Bridge (Gemini)"
        value={fmt(summary.bridgeTotal)}
        subtitle="$0.00025/chunk"
        icon={ZapIcon}
        accent="emerald"
        compact
      />
    </div>
  );
}
