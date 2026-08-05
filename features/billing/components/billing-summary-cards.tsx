import {
  AlertTriangleIcon,
  ClockIcon,
  DollarSignIcon,
  GaugeIcon,
  HourglassIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { MetricCard } from "@/components/metric-card";

import { formatMinutes, formatUsd } from "../lib/pricing";
import type {
  FreeIntroSummary,
  MinuteUsageSummary,
  SubscriptionOverview,
  WebhookHealth,
} from "../types";

/**
 * Headline billing tiles.
 *
 * Every dollar figure passes through `formatUsd` from the single billing
 * catalog constant - no amount is typed into this JSX.
 *
 * @module features/billing/components/billing-summary-cards
 */

interface BillingSummaryCardsProps {
  subscriptions: SubscriptionOverview;
  minutes: MinuteUsageSummary;
  freeIntro: FreeIntroSummary;
  webhooks: WebhookHealth;
}

export function BillingSummaryCards({
  subscriptions,
  minutes,
  freeIntro,
  webhooks,
}: BillingSummaryCardsProps) {
  const blockedNow = minutes.atLimit.length;

  return (
    <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
      <MetricCard
        title="MRR"
        value={formatUsd(subscriptions.mrrCents)}
        subtitle={`${subscriptions.payingUserCount} paying customers`}
        icon={DollarSignIcon}
        accent="primary"
        compact
      />
      <MetricCard
        title="Live Subscription Items"
        value={subscriptions.liveItemCount}
        subtitle="Trialing, active or past due"
        icon={UsersIcon}
        accent="blue"
        compact
      />
      <MetricCard
        title="Blocked on Minutes"
        value={blockedNow}
        subtitle={
          blockedNow > 0
            ? "Cannot start an assessment right now"
            : "Nobody is out of minutes"
        }
        icon={GaugeIcon}
        accent={blockedNow > 0 ? "rose" : "emerald"}
        compact
      />
      <MetricCard
        title="Failed Webhooks"
        value={webhooks.failedCount}
        subtitle={
          webhooks.failedCount > 0
            ? "Customers may be charged but unprovisioned"
            : "Stripe events all applied"
        }
        icon={AlertTriangleIcon}
        accent={webhooks.failedCount > 0 ? "rose" : "emerald"}
        compact
      />

      <MetricCard
        title="MRR at Risk"
        value={formatUsd(subscriptions.atRiskMrrCents)}
        subtitle="Past due - billed, not paid"
        icon={WalletIcon}
        accent={subscriptions.atRiskMrrCents > 0 ? "amber" : "default"}
        compact
      />
      <MetricCard
        title="Trialing MRR"
        value={formatUsd(subscriptions.trialingMrrCents)}
        subtitle="Lands when trials convert"
        icon={HourglassIcon}
        accent="blue"
        compact
      />
      <MetricCard
        title="Minutes Consumed"
        value={formatMinutes(minutes.consumedMinutes)}
        subtitle={`${formatMinutes(Math.max(0, minutes.remainingMinutes))} left across ${minutes.openPeriods} open periods`}
        icon={ClockIcon}
        accent="default"
        compact
      />
      <MetricCard
        title="Free Intro Converted"
        value={`${freeIntro.converted} / ${freeIntro.total}`}
        subtitle={`${freeIntro.conversionPct.toFixed(0)}% conversion · ${freeIntro.stillOpen} still open`}
        icon={SparklesIcon}
        accent="emerald"
        compact
      />
    </div>
  );
}
