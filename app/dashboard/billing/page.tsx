import {
  AddonMixPanel,
  BillingLookup,
  BillingSummaryCards,
  ConsumptionChart,
  FreeIntroPanel,
  GuestPurchasesTable,
  MinuteRiskPanel,
  RevenueBreakdown,
  StripeConnectionNote,
  SubscriptionsTable,
  WebhookHealthPanel,
} from "@/features/billing";
import { getStripeConnection } from "@/features/billing/lib/stripe";
import { getBillingDashboard } from "@/features/billing/queries";

/**
 * Stripe / billing operations console.
 *
 * Built so the team can answer a customer without opening the Stripe console:
 * what we are billing, who is about to be blocked on minutes, which webhooks
 * failed, and what any one customer's account looks like.
 *
 * READ-ONLY. The Stripe webhook is the only writer of billing state; there is
 * no control on this page that changes a subscription, an allowance, or a
 * ledger row.
 *
 * Renders entirely from Supabase. `STRIPE_SECRET_KEY` is optional - when it is
 * absent the page still works and says so; when it is present the customer
 * lookup is enriched with the live Stripe view.
 *
 * @module app/dashboard/billing/page
 */

// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  // The Stripe probe cannot fail the page: getStripeConnection resolves to a
  // status object on every error path, including "no key configured".
  const [data, stripeConnection] = await Promise.all([
    getBillingDashboard(),
    getStripeConnection(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Subscriptions, minute allowances and Stripe webhook health. This
            panel is read-only - the Stripe webhook owns every write.
          </p>
        </div>
        <StripeConnectionNote status={stripeConnection} />
      </div>

      <div className="px-4 lg:px-6">
        <BillingSummaryCards
          subscriptions={data.subscriptions}
          minutes={data.minutes}
          freeIntro={data.freeIntro}
          webhooks={data.webhooks}
        />
      </div>

      {/* Webhook health sits above everything else on purpose: a failed event
          means a paying customer did not get what they bought. */}
      <div className="px-4 lg:px-6">
        <WebhookHealthPanel health={data.webhooks} />
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <RevenueBreakdown overview={data.subscriptions} />
        <div className="flex flex-col gap-4">
          <AddonMixPanel mix={data.addonMix} />
          <FreeIntroPanel summary={data.freeIntro} />
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <ConsumptionChart data={data.consumption} />
      </div>

      <div className="px-4 lg:px-6">
        <MinuteRiskPanel minutes={data.minutes} />
      </div>

      <div className="px-4 lg:px-6">
        <BillingLookup />
      </div>

      <div className="px-4 lg:px-6">
        <h2 className="mb-3 text-lg font-semibold">Subscription Items</h2>
        <SubscriptionsTable data={data.table} />
      </div>

      {/* No-account purchases (currently just the $10 Persona Atlas Guide) -
          a structurally separate table from subscription_items, see
          GuestPurchaseRow's doc comment in features/billing/types.ts. */}
      <div className="px-4 pb-6 lg:px-6">
        <h2 className="mb-3 text-lg font-semibold">Guest Purchases</h2>
        <GuestPurchasesTable data={data.guestPurchases} />
      </div>
    </>
  );
}
