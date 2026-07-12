import { InfoIcon } from "lucide-react";
import { COST_CONSTANTS } from "@/features/costs/lib/cost-calculator";

/**
 * One-line disclosure shown next to any cost figures. All dollar amounts in
 * the admin panel are estimates derived from usage counts multiplied by
 * hardcoded unit rates -- they are not pulled from provider invoices.
 */
export function CostEstimateNote() {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <InfoIcon className="mt-0.5 size-3 shrink-0" />
      <span>
        Estimated from usage &times; hardcoded unit rates (Deepgram $
        {COST_CONSTANTS.DEEPGRAM_COST_PER_MINUTE}/min, OpenRouter $
        {COST_CONSTANTS.OPENROUTER_INPUT_PER_1K}/$
        {COST_CONSTANTS.OPENROUTER_OUTPUT_PER_1K} per 1K tokens, Bridge $
        {COST_CONSTANTS.BRIDGE_COST_PER_CHUNK}/chunk) &mdash; not billed
        invoices.
      </span>
    </p>
  );
}
