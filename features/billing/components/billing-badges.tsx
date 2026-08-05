import { Badge } from "@/components/ui/badge";

import type { SubscriptionStatus, UsagePeriodKind } from "../types";

/**
 * Shared status pills for the billing surfaces.
 *
 * No `"use client"`: these are pure render helpers with no state, so they work
 * in server components and are still bundleable into the client table. They
 * import only `../types` (pure) - never `queries.ts`.
 *
 * @module features/billing/components/billing-badges
 */

/**
 * Colour by consequence, not by aesthetics: red means the customer is paying
 * and not getting what they paid for, or is about to churn.
 */
const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  trialing: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  past_due: "border-destructive/30 bg-destructive/10 text-destructive",
  unpaid: "border-destructive/30 bg-destructive/10 text-destructive",
  canceled: "text-muted-foreground",
  incomplete: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  incomplete_expired: "text-muted-foreground",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-600",
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  unpaid: "Unpaid",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  paused: "Paused",
};

/** Renders a `subscription_items.status` value as a coloured pill. */
export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const KIND_LABELS: Record<string, string> = {
  free_intro: "Free intro",
  plan: "Plan",
  enterprise: "Enterprise",
};

/** Renders a `usage_periods.kind` value, falling back to the raw value. */
export function UsageKindBadge({ kind }: { kind: UsagePeriodKind | string }) {
  return (
    <Badge
      variant="outline"
      className={
        kind === "free_intro"
          ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
          : undefined
      }
    >
      {KIND_LABELS[kind] ?? kind}
    </Badge>
  );
}

/**
 * Minute-pressure pill. Anything at or over 100% means the user is blocked
 * right now, which is a support ticket that has not been filed yet.
 */
export function MinutePressureBadge({ pctUsed }: { pctUsed: number }) {
  const blocked = pctUsed >= 100;
  return (
    <Badge
      variant="outline"
      className={
        blocked
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600"
      }
    >
      {Math.round(pctUsed)}% used
    </Badge>
  );
}
