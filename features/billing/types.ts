/**
 * Billing domain types for the support/operations panel.
 *
 * This module is PURE - no React, no `server-only`, no `process.env`. Client
 * components import from here, so it must stay bundleable for the browser.
 *
 * The row shapes mirror `IntualityWeb/supabase/migrations/0006_billing_entitlements.sql`.
 * They are declared here rather than in `types/supabase.ts` because that file is
 * owned by another workstream; see the note on {@link BillingDatabase}.
 *
 * @module features/billing/types
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every purchasable product key, including the one-off minute block.
 *
 * Mirrors `ProductKey` in `IntualityWeb/src/types/billing.ts`.
 */
export type CatalogProductKey =
  | "base"
  | "block_180"
  | "addon_uploads"
  | "addon_reports"
  | "addon_chat"
  | "addon_basket";

/**
 * Product keys that can appear in `subscription_items.product_key`.
 *
 * `block_180` is deliberately absent: it is a one-off purchase that tops up the
 * active `usage_periods` row and creates no subscription item, which is exactly
 * what the table's CHECK constraint encodes.
 */
export type SubscriptionProductKey = Exclude<CatalogProductKey, "block_180">;

/** Product keys in display order (base first, basket last). */
export const SUBSCRIPTION_PRODUCT_KEYS: readonly SubscriptionProductKey[] = [
  "base",
  "addon_uploads",
  "addon_reports",
  "addon_chat",
  "addon_basket",
];

/** The three add-ons the basket bundles. */
export const INDIVIDUAL_ADDON_KEYS: readonly SubscriptionProductKey[] = [
  "addon_uploads",
  "addon_reports",
  "addon_chat",
];

/** Every value allowed by the `subscription_items_status_check` constraint. */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

/** All statuses, in the order the status breakdown is rendered. */
export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
];

/**
 * Statuses that mean the customer currently holds the product.
 *
 * Matches the partial unique index `subscription_items_live_product_uniq`, so
 * "live" here means the same thing in the UI as it does in the database.
 */
export const LIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
];

/** Kinds of minute allowance window. */
export type UsagePeriodKind = "free_intro" | "plan" | "enterprise";

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                  */
/* -------------------------------------------------------------------------- */

/*
 * These five row shapes MUST stay `type` aliases, not `interface`s.
 *
 * supabase-js constrains a schema's tables to `Row extends Record<string,
 * unknown>`. TypeScript gives object *type aliases* an implicit index
 * signature but never gives one to an `interface`, so an interface here fails
 * the constraint, `SupabaseClient<BillingDatabase>` silently degrades, and
 * every `.select()` in queries.ts resolves to `never[]`. `types/supabase.ts`
 * gets this right by writing its rows inline. Converting these back to
 * interfaces will break the whole feature at compile time.
 */

/** `billing_customers` row. */
export type BillingCustomerRow = {
  user_id: string;
  stripe_customer_id: string;
  created_at: string;
  updated_at: string;
};

/** `subscription_items` row. */
export type SubscriptionItemRow = {
  id: string;
  user_id: string;
  product_key: string;
  stripe_subscription_id: string | null;
  stripe_item_id: string | null;
  stripe_price_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

/** `usage_periods` row. `consumed_minutes` is numeric(10,2). */
export type UsagePeriodRow = {
  id: string;
  user_id: string;
  kind: string;
  period_start: string;
  period_end: string;
  included_minutes: number;
  purchased_minutes: number;
  consumed_minutes: number;
  created_at: string;
  updated_at: string;
};

/** `minute_consumptions` row - the append-only ledger. */
export type MinuteConsumptionRow = {
  id: string;
  user_id: string;
  session_id: string | null;
  period_id: string | null;
  minutes: number;
  occurred_at: string;
  created_at: string;
};

/** `stripe_webhook_events` row. Primary key is the Stripe event id. */
export type StripeWebhookEventRow = {
  id: string;
  type: string;
  received_at: string;
  processed_at: string | null;
  error: string | null;
  payload: Record<string, unknown> | null;
};

/**
 * `guest_purchases` row (IntualityWeb migration `0012_atlas_guest_purchases.sql`).
 *
 * Structurally NOT a `subscription_items` row: no `user_id`, because a guest
 * checkout (the $10 Persona Atlas Guide, `/atlas/purchase` in IntualityWeb) has
 * no Supabase account to attach one to. `email` is the only identity - it comes
 * from what Stripe Checkout collected, not a profile. `status` is `'paid'`
 * until the confirmation email sends, then `'fulfilled'` - which per
 * IntualityWeb's docs/BILLING.md means "the receipt email went out," NOT "the
 * buyer has the actual document" (only one persona exists at full guide depth
 * as of this writing, so nothing sends the real document yet).
 */
export type GuestPurchaseRow = {
  id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  product_key: string;
  email: string;
  amount_cents: number;
  currency: string;
  status: string;
  fulfilled_at: string | null;
  created_at: string;
};

/**
 * Minimal `Database` shape covering only the five billing tables.
 *
 * WHY this exists: `types/supabase.ts` is the repo's hand-written `Database`
 * interface and does not yet describe the billing tables. That file is shared
 * with other feature work, so rather than edit it, `queries.ts` re-types the
 * service-role client against this local schema. Insert/Update are
 * `Record<string, never>` - the Stripe webhook is the only writer of billing
 * state and this panel is strictly read-only, so any real `.insert()` or
 * `.update()` payload written here is a compile error.
 */
export interface BillingDatabase {
  public: {
    Tables: {
      billing_customers: {
        Row: BillingCustomerRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      subscription_items: {
        Row: SubscriptionItemRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      usage_periods: {
        Row: UsagePeriodRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      minute_consumptions: {
        Row: MinuteConsumptionRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: StripeWebhookEventRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      guest_purchases: {
        Row: GuestPurchaseRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                  */
/* -------------------------------------------------------------------------- */

/** One product line of recurring revenue. */
export interface ProductRevenueLine {
  productKey: SubscriptionProductKey;
  label: string;
  /** Live rows in an actively-billing status. */
  activeCount: number;
  /** Live rows in `trialing` - revenue that has not landed yet. */
  trialingCount: number;
  /** Live rows in `past_due` - revenue at risk of churning. */
  pastDueCount: number;
  /** List price, in cents, from the single billing catalog constant. */
  unitAmountCents: number;
  /** `activeCount * unitAmountCents`. */
  mrrCents: number;
}

/** Headline subscription + revenue aggregate. */
export interface SubscriptionOverview {
  /** Recurring revenue from `active` items only. */
  mrrCents: number;
  /** Recurring revenue from `past_due` items - billed, unpaid, may churn. */
  atRiskMrrCents: number;
  /** Recurring revenue that starts when trials convert. */
  trialingMrrCents: number;
  /** Count of rows in a live status (`trialing`/`active`/`past_due`). */
  liveItemCount: number;
  /** Distinct users holding at least one live item. */
  payingUserCount: number;
  byProduct: ProductRevenueLine[];
  countsByStatus: Record<SubscriptionStatus, number>;
}

/** Basket-vs-individual add-on mix. */
export interface AddonMixSummary {
  /** Users holding a live `addon_basket`. */
  basketUsers: number;
  /** Users holding at least one live individual add-on. */
  individualAddonUsers: number;
  /**
   * Users holding the basket AND an add-on the basket already grants. This
   * should be zero - it means someone is paying twice for one feature.
   */
  overlappingUsers: number;
  /**
   * Users whose individual add-ons cost more per month than the basket would.
   * A save-the-customer conversation, not a bug.
   */
  couldSaveWithBasketUsers: number;
  /** Live count per individual add-on key. */
  individualCounts: Record<SubscriptionProductKey, number>;
  basketMrrCents: number;
  individualMrrCents: number;
}

/** A user at or near their minute allowance - they are about to be blocked. */
export interface MinuteRiskUser {
  userId: string;
  email: string;
  displayName: string;
  kind: UsagePeriodKind | string;
  /** `included_minutes + purchased_minutes`. */
  allowanceMinutes: number;
  consumedMinutes: number;
  /** `allowance - consumed`, floored at zero for display. */
  remainingMinutes: number;
  /** 0-100+; can exceed 100 if the counter overshot. */
  pctUsed: number;
  periodEnd: string;
}

/** Minute allowance aggregate across every currently-open usage period. */
export interface MinuteUsageSummary {
  /** Number of usage periods open right now. */
  openPeriods: number;
  includedMinutes: number;
  purchasedMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
  /** Remaining <= 0 - already blocked. */
  atLimit: MinuteRiskUser[];
  /** Past the near-limit threshold but not yet blocked. */
  nearLimit: MinuteRiskUser[];
}

/** Free-intro cohort and its conversion into paid. */
export interface FreeIntroSummary {
  /** Users who have ever had a `free_intro` window. */
  total: number;
  /** Free-intro users who now hold a live paid subscription item. */
  converted: number;
  /** Free-intro windows still open. */
  stillOpen: number;
  /** Windows that closed without a paid subscription. */
  lapsed: number;
  /** `converted / total * 100`, 0 when the cohort is empty. */
  conversionPct: number;
}

/** One Stripe webhook delivery, flattened for the health panel. */
export interface WebhookEventSummary {
  id: string;
  type: string;
  receivedAt: string;
  processedAt: string | null;
  error: string | null;
  /**
   * True when the handler recorded an error and never completed
   * (`processed_at IS NULL AND error IS NOT NULL`). A paying customer may not
   * have received what they bought.
   */
  failed: boolean;
  /** Received but neither processed nor errored - still in flight, or stuck. */
  pending: boolean;
}

/** Webhook pipeline health. Failures sort first in {@link WebhookHealth.events}. */
export interface WebhookHealth {
  /** Failures first, then the most recent deliveries. */
  events: WebhookEventSummary[];
  failedCount: number;
  pendingCount: number;
  processedCount: number;
  /** Most recent `received_at` of any event, or null when the table is empty. */
  lastEventAt: string | null;
}

/** One day of minute consumption for the trend chart. */
export interface DailyConsumption {
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  minutes: number;
  /** Distinct users who consumed minutes that day. */
  users: number;
}

/** One row of the subscriptions table. */
export interface SubscriptionTableRow {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  productKey: SubscriptionProductKey;
  productLabel: string;
  status: SubscriptionStatus;
  /** List price in cents from the catalog constant - never typed into JSX. */
  amountCents: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}

/** One `guest_purchases` row, display-shaped. See {@link GuestPurchaseRow}. */
export interface GuestPurchaseTableRow {
  id: string;
  email: string;
  productKey: string;
  /** Customer-facing product name - falls back to the raw key if unrecognised. */
  productLabel: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  fulfilledAt: string | null;
}

/** Everything the billing page renders, fetched in one pass. */
export interface BillingDashboardData {
  subscriptions: SubscriptionOverview;
  addonMix: AddonMixSummary;
  minutes: MinuteUsageSummary;
  freeIntro: FreeIntroSummary;
  webhooks: WebhookHealth;
  consumption: DailyConsumption[];
  table: SubscriptionTableRow[];
  /** Most recent guest (no-account) purchases - currently just the Atlas Guide. */
  guestPurchases: GuestPurchaseTableRow[];
}

/* -------------------------------------------------------------------------- */
/* Per-user lookup                                                             */
/* -------------------------------------------------------------------------- */

/** One subscription item as shown on the support lookup. */
export interface LookupSubscriptionItem {
  id: string;
  productKey: SubscriptionProductKey;
  productLabel: string;
  status: SubscriptionStatus;
  amountCents: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  stripeItemId: string | null;
  live: boolean;
}

/** One usage period as shown on the support lookup. */
export interface LookupUsagePeriod {
  id: string;
  kind: UsagePeriodKind | string;
  periodStart: string;
  periodEnd: string;
  includedMinutes: number;
  purchasedMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
  /** True when now falls inside `[periodStart, periodEnd)`. */
  current: boolean;
}

/** One ledger entry as shown on the support lookup. */
export interface LookupConsumption {
  id: string;
  minutes: number;
  occurredAt: string;
  sessionId: string | null;
  sessionName: string | null;
}

/**
 * Live Stripe data, present only when `STRIPE_SECRET_KEY` is configured AND
 * the call succeeded. Every field is optional-by-nullability so the UI can
 * degrade to Supabase-only without branching on error shapes.
 */
export interface StripeCustomerSnapshot {
  customerId: string;
  email: string | null;
  /** Stripe's own delinquency flag - an unpaid invoice exists. */
  delinquent: boolean | null;
  /** Account credit/debit in cents. Negative means credit. */
  balanceCents: number | null;
  currency: string | null;
  /** Statuses of the customer's Stripe subscriptions, most recent first. */
  subscriptionStatuses: string[];
  /** Dashboard deep link, so support can escalate in one click. */
  dashboardUrl: string;
}

/** Result of a support lookup by email or user id. */
export interface BillingUserLookup {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  joinedAt: string;
  stripeCustomerId: string | null;
  /** Sum of live recurring items, in cents. */
  monthlySpendCents: number;
  items: LookupSubscriptionItem[];
  periods: LookupUsagePeriod[];
  currentPeriod: LookupUsagePeriod | null;
  recentConsumption: LookupConsumption[];
  /** Null when Stripe is not configured or the live call failed. */
  stripe: StripeCustomerSnapshot | null;
  /**
   * Set when Stripe is configured but the enrichment call failed. The lookup
   * still returns Supabase data; this is a note, not an error.
   */
  stripeError: string | null;
}

/** Whether the panel is talking to Stripe, and in which mode. */
export interface StripeConnectionStatus {
  configured: boolean;
  /** Derived from the key prefix - no network call needed. */
  mode: "live" | "test" | "unknown" | null;
  /** True when a probe request to the Stripe API succeeded. */
  reachable: boolean;
  error: string | null;
}
