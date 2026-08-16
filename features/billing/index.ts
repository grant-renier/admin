/**
 * Public surface of the billing feature module.
 *
 * `queries.ts` is intentionally NOT re-exported here: it imports the
 * service-role Supabase client, and a barrel that mixes it with components
 * would let a `"use client"` file pull it in transitively. Routes import
 * `@/features/billing/queries` explicitly.
 *
 * @module features/billing
 */

export { AddonMixPanel } from "./components/addon-mix-panel";
export { BillingLookup } from "./components/billing-lookup";
export { BillingLookupResult } from "./components/billing-lookup-result";
export { BillingSummaryCards } from "./components/billing-summary-cards";
export { ConsumptionChart } from "./components/consumption-chart";
export { FreeIntroPanel } from "./components/free-intro-panel";
export { MinuteRiskPanel } from "./components/minute-risk-panel";
export { RefreshBillingButton } from "./components/refresh-billing-button";
export { RevenueBreakdown } from "./components/revenue-breakdown";
export { StripeConnectionNote } from "./components/stripe-connection-note";
export { SubscriptionsTable } from "./components/subscriptions-table";
export { GuestPurchasesTable } from "./components/guest-purchases-table";
export { WebhookHealthPanel } from "./components/webhook-health-panel";
export {
  MinutePressureBadge,
  SubscriptionStatusBadge,
  UsageKindBadge,
} from "./components/billing-badges";
export type * from "./types";
