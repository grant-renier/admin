/**
 * Read-only billing data access for the support/operations panel.
 *
 * THIS MODULE NEVER WRITES BILLING STATE. The Stripe webhook
 * (`IntualityWeb/src/app/api/stripe/webhook`) is the only writer of
 * `billing_customers`, `subscription_items`, `usage_periods`,
 * `minute_consumptions` and `stripe_webhook_events`. A second writer would race
 * the webhook and produce entitlements Stripe never sold, so the local
 * {@link BillingDatabase} schema types Insert/Update as `never` - an accidental
 * mutation here is a compile error, not a production incident.
 *
 * ALL CURRENCY comes from `./lib/pricing`, which mirrors
 * `/Users/omrajpal/Downloads/IntualityWeb/src/lib/billing/catalog.ts` - the
 * single source of truth for the price sheet. No amount is written down twice.
 *
 * @module features/billing/queries
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase/client";

import {
  BASKET_CENTS,
  NEAR_LIMIT_THRESHOLD,
  monthlyAmountCents,
  productLabel,
} from "./lib/pricing";
import { fetchStripeCustomerSnapshot, isStripeConfigured } from "./lib/stripe";
import {
  INDIVIDUAL_ADDON_KEYS,
  LIVE_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_PRODUCT_KEYS,
  SUBSCRIPTION_STATUSES,
  type AddonMixSummary,
  type BillingDashboardData,
  type BillingDatabase,
  type BillingUserLookup,
  type DailyConsumption,
  type FreeIntroSummary,
  type LookupConsumption,
  type LookupSubscriptionItem,
  type LookupUsagePeriod,
  type MinuteRiskUser,
  type MinuteUsageSummary,
  type ProductRevenueLine,
  type SubscriptionItemRow,
  type SubscriptionOverview,
  type SubscriptionProductKey,
  type SubscriptionStatus,
  type SubscriptionTableRow,
  type StripeCustomerSnapshot,
  type UsagePeriodRow,
  type WebhookEventSummary,
  type WebhookHealth,
} from "./types";

/**
 * The service-role client, re-typed against the billing schema.
 *
 * WHY the cast: `types/supabase.ts` is the repo's hand-written `Database`
 * interface and does not yet describe the billing tables (it is shared with
 * other in-flight feature work, so this feature does not edit it). The cast is
 * narrow, local, and documented; extending `types/supabase.ts` and deleting it
 * is tracked as follow-up work.
 */
const billingDb = supabaseAdmin as unknown as SupabaseClient<BillingDatabase>;

/** Days of consumption history charted on the dashboard. */
const CONSUMPTION_WINDOW_DAYS = 30;

/** Webhook deliveries listed in the health panel. */
const WEBHOOK_FEED_LIMIT = 40;

/** Cap on users listed in the at/near-limit tables, newest pressure first. */
const RISK_LIST_LIMIT = 50;

/* -------------------------------------------------------------------------- */
/* Narrowing helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Narrows a raw `product_key` to a known subscription product.
 *
 * Returns null for anything unrecognised so a key introduced by a newer webhook
 * can never be priced with the wrong number - an unknown product is omitted
 * from revenue rather than counted at $0 inside a total that looks complete.
 */
function asProductKey(value: string): SubscriptionProductKey | null {
  return SUBSCRIPTION_PRODUCT_KEYS.includes(value as SubscriptionProductKey)
    ? (value as SubscriptionProductKey)
    : null;
}

/** Narrows a raw `status` to a known subscription status. */
function asStatus(value: string): SubscriptionStatus | null {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : null;
}

/** True when a status means the customer currently holds the product. */
function isLive(status: string): boolean {
  return LIVE_SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus);
}

/**
 * Coerces a Postgres `numeric` column to a JS number.
 *
 * PostgREST may serialise `numeric(10,2)` as either a JSON number or a string
 * depending on version; `Number()` handles both and `|| 0` absorbs null.
 */
function num(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** UTC `YYYY-MM-DD` bucket key for the consumption chart. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Profile lookup                                                              */
/* -------------------------------------------------------------------------- */

interface ProfileLite {
  email: string;
  displayName: string;
}

/**
 * Resolves user ids to display identity in one round trip.
 *
 * Support searches by email, so every billing row has to carry one; the billing
 * tables only store `user_id`.
 */
async function loadProfiles(
  userIds: string[]
): Promise<Map<string, ProfileLite>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, email, display_name")
    .in("id", unique);

  return new Map(
    (data ?? []).map((p) => [
      p.id,
      { email: p.email, displayName: p.display_name },
    ])
  );
}

/* -------------------------------------------------------------------------- */
/* Derivations (pure)                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Recurring revenue and status counts.
 *
 * MRR counts `active` items ONLY. `trialing` has not been charged yet and
 * `past_due` has been charged but not paid - folding either into headline MRR
 * is how a dashboard tells you the business is bigger than the bank says. Both
 * are reported alongside so nothing is hidden.
 */
function deriveSubscriptionOverview(
  rows: SubscriptionItemRow[]
): SubscriptionOverview {
  const countsByStatus = Object.fromEntries(
    SUBSCRIPTION_STATUSES.map((s) => [s, 0])
  ) as Record<SubscriptionStatus, number>;

  const perProduct = new Map<
    SubscriptionProductKey,
    { active: number; trialing: number; pastDue: number }
  >(
    SUBSCRIPTION_PRODUCT_KEYS.map((k) => [
      k,
      { active: 0, trialing: 0, pastDue: 0 },
    ])
  );

  const payingUsers = new Set<string>();
  let liveItemCount = 0;

  for (const row of rows) {
    const status = asStatus(row.status);
    if (status) countsByStatus[status] += 1;

    const key = asProductKey(row.product_key);
    if (!key || !status) continue;

    if (isLive(status)) {
      liveItemCount += 1;
      payingUsers.add(row.user_id);
    }

    const bucket = perProduct.get(key);
    if (!bucket) continue;
    if (status === "active") bucket.active += 1;
    else if (status === "trialing") bucket.trialing += 1;
    else if (status === "past_due") bucket.pastDue += 1;
  }

  let mrrCents = 0;
  let atRiskMrrCents = 0;
  let trialingMrrCents = 0;

  const byProduct: ProductRevenueLine[] = SUBSCRIPTION_PRODUCT_KEYS.map(
    (key) => {
      const bucket = perProduct.get(key) ?? {
        active: 0,
        trialing: 0,
        pastDue: 0,
      };
      const unitAmountCents = monthlyAmountCents(key);
      const lineMrr = bucket.active * unitAmountCents;

      mrrCents += lineMrr;
      atRiskMrrCents += bucket.pastDue * unitAmountCents;
      trialingMrrCents += bucket.trialing * unitAmountCents;

      return {
        productKey: key,
        label: productLabel(key),
        activeCount: bucket.active,
        trialingCount: bucket.trialing,
        pastDueCount: bucket.pastDue,
        unitAmountCents,
        mrrCents: lineMrr,
      };
    }
  );

  return {
    mrrCents,
    atRiskMrrCents,
    trialingMrrCents,
    liveItemCount,
    payingUserCount: payingUsers.size,
    byProduct,
    countsByStatus,
  };
}

/**
 * Basket-vs-individual add-on mix.
 *
 * Two support signals fall out of it: `overlappingUsers` (someone is paying
 * twice for a feature the basket already grants - a refund conversation) and
 * `couldSaveWithBasketUsers` (three separate add-ons cost more than the basket).
 */
function deriveAddonMix(rows: SubscriptionItemRow[]): AddonMixSummary {
  const liveByUser = new Map<string, Set<SubscriptionProductKey>>();

  const individualCounts = Object.fromEntries(
    SUBSCRIPTION_PRODUCT_KEYS.map((k) => [k, 0])
  ) as Record<SubscriptionProductKey, number>;

  for (const row of rows) {
    if (!isLive(row.status)) continue;
    const key = asProductKey(row.product_key);
    if (!key) continue;

    individualCounts[key] += 1;

    const set = liveByUser.get(row.user_id) ?? new Set<SubscriptionProductKey>();
    set.add(key);
    liveByUser.set(row.user_id, set);
  }

  let basketUsers = 0;
  let individualAddonUsers = 0;
  let overlappingUsers = 0;
  let couldSaveWithBasketUsers = 0;

  for (const held of liveByUser.values()) {
    const hasBasket = held.has("addon_basket");
    const individuals = INDIVIDUAL_ADDON_KEYS.filter((k) => held.has(k));

    if (hasBasket) basketUsers += 1;
    if (individuals.length > 0) individualAddonUsers += 1;
    if (hasBasket && individuals.length > 0) overlappingUsers += 1;

    if (!hasBasket) {
      const spend = individuals.reduce(
        (sum, k) => sum + monthlyAmountCents(k),
        0
      );
      if (spend > BASKET_CENTS) couldSaveWithBasketUsers += 1;
    }
  }

  const individualMrrCents = INDIVIDUAL_ADDON_KEYS.reduce(
    (sum, k) => sum + individualCounts[k] * monthlyAmountCents(k),
    0
  );

  return {
    basketUsers,
    individualAddonUsers,
    overlappingUsers,
    couldSaveWithBasketUsers,
    individualCounts,
    basketMrrCents: individualCounts.addon_basket * BASKET_CENTS,
    individualMrrCents,
  };
}

/**
 * Minute allowance across every currently-open usage period.
 *
 * The at/near-limit lists are the point of this aggregate: a user with no
 * minutes left cannot start an assessment, and they write in the moment it
 * happens. Seeing them *before* the ticket arrives is the whole feature.
 */
function deriveMinuteUsage(
  periods: UsagePeriodRow[],
  profiles: Map<string, ProfileLite>
): MinuteUsageSummary {
  let includedMinutes = 0;
  let purchasedMinutes = 0;
  let consumedMinutes = 0;

  const atLimit: MinuteRiskUser[] = [];
  const nearLimit: MinuteRiskUser[] = [];

  for (const period of periods) {
    const included = num(period.included_minutes);
    const purchased = num(period.purchased_minutes);
    const consumed = num(period.consumed_minutes);
    const allowance = included + purchased;

    includedMinutes += included;
    purchasedMinutes += purchased;
    consumedMinutes += consumed;

    // A zero allowance with zero use is a provisioning artefact, not a user
    // about to be blocked -- listing it would bury the real signals.
    if (allowance === 0 && consumed === 0) continue;

    const remaining = allowance - consumed;
    const pctUsed = allowance > 0 ? (consumed / allowance) * 100 : 100;
    const profile = profiles.get(period.user_id);

    const entry: MinuteRiskUser = {
      userId: period.user_id,
      email: profile?.email ?? "unknown",
      displayName: profile?.displayName ?? "",
      kind: period.kind,
      allowanceMinutes: allowance,
      consumedMinutes: consumed,
      remainingMinutes: Math.max(0, remaining),
      pctUsed,
      periodEnd: period.period_end,
    };

    if (remaining <= 0) atLimit.push(entry);
    else if (pctUsed >= NEAR_LIMIT_THRESHOLD * 100) nearLimit.push(entry);
  }

  const byPressure = (a: MinuteRiskUser, b: MinuteRiskUser) =>
    b.pctUsed - a.pctUsed;

  return {
    openPeriods: periods.length,
    includedMinutes,
    purchasedMinutes,
    consumedMinutes,
    remainingMinutes: includedMinutes + purchasedMinutes - consumedMinutes,
    atLimit: atLimit.sort(byPressure).slice(0, RISK_LIST_LIMIT),
    nearLimit: nearLimit.sort(byPressure).slice(0, RISK_LIST_LIMIT),
  };
}

/**
 * Free-intro cohort and its conversion rate.
 *
 * "Converted" means the user holds a live paid subscription item today, not
 * that they ever did - this is an operational read, not a cohort analysis.
 */
function deriveFreeIntro(
  freeIntroPeriods: Array<Pick<UsagePeriodRow, "user_id" | "period_end">>,
  rows: SubscriptionItemRow[],
  now: Date
): FreeIntroSummary {
  const paidUsers = new Set(
    rows.filter((r) => isLive(r.status)).map((r) => r.user_id)
  );

  // One free-intro window per user is enforced by a partial unique index, but
  // de-duplicate anyway so the denominator is users, never rows.
  const latestEndByUser = new Map<string, string>();
  for (const period of freeIntroPeriods) {
    const current = latestEndByUser.get(period.user_id);
    if (!current || period.period_end > current) {
      latestEndByUser.set(period.user_id, period.period_end);
    }
  }

  let converted = 0;
  let stillOpen = 0;
  let lapsed = 0;

  for (const [userId, periodEnd] of latestEndByUser) {
    const isConverted = paidUsers.has(userId);
    const open = new Date(periodEnd).getTime() > now.getTime();

    if (isConverted) converted += 1;
    if (open) stillOpen += 1;
    else if (!isConverted) lapsed += 1;
  }

  const total = latestEndByUser.size;

  return {
    total,
    converted,
    stillOpen,
    lapsed,
    conversionPct: total > 0 ? (converted / total) * 100 : 0,
  };
}

/** Buckets ledger entries into UTC days, filling gaps so the chart has no holes. */
function deriveConsumptionSeries(
  rows: Array<{ minutes: number; occurred_at: string; user_id: string }>,
  now: Date
): DailyConsumption[] {
  const buckets = new Map<string, { minutes: number; users: Set<string> }>();

  for (let i = CONSUMPTION_WINDOW_DAYS - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    buckets.set(dayKey(day.toISOString()), { minutes: 0, users: new Set() });
  }

  for (const row of rows) {
    const bucket = buckets.get(dayKey(row.occurred_at));
    // Rows outside the pre-seeded window (clock skew at the boundary) are
    // dropped rather than creating an out-of-order point in the series.
    if (!bucket) continue;
    bucket.minutes += num(row.minutes);
    bucket.users.add(row.user_id);
  }

  return [...buckets.entries()].map(([date, bucket]) => ({
    date,
    minutes: Math.round(bucket.minutes * 10) / 10,
    users: bucket.users.size,
  }));
}

/** Flattens a webhook row for display. */
function toWebhookSummary(row: {
  id: string;
  type: string;
  received_at: string;
  processed_at: string | null;
  error: string | null;
}): WebhookEventSummary {
  const failed = row.processed_at === null && row.error !== null;
  return {
    id: row.id,
    type: row.type,
    receivedAt: row.received_at,
    processedAt: row.processed_at,
    error: row.error,
    failed,
    pending: row.processed_at === null && row.error === null,
  };
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Stripe webhook pipeline health, failures first.
 *
 * A failed webhook (`processed_at IS NULL AND error IS NOT NULL`) means Stripe
 * took a customer's money and this system never applied what they bought - the
 * customer is charged and still blocked. That is why failures are fetched with
 * their own query and prepended, rather than being left to sort order in a
 * "recent events" feed where a day of traffic buries them.
 */
export async function getWebhookHealth(): Promise<WebhookHealth> {
  const [failedRes, recentRes, failedCountRes, pendingCountRes, processedCountRes] =
    await Promise.all([
      billingDb
        .from("stripe_webhook_events")
        .select("id, type, received_at, processed_at, error")
        .is("processed_at", null)
        .not("error", "is", null)
        .order("received_at", { ascending: false })
        .limit(WEBHOOK_FEED_LIMIT),
      billingDb
        .from("stripe_webhook_events")
        .select("id, type, received_at, processed_at, error")
        .order("received_at", { ascending: false })
        .limit(WEBHOOK_FEED_LIMIT),
      billingDb
        .from("stripe_webhook_events")
        .select("id", { count: "exact", head: true })
        .is("processed_at", null)
        .not("error", "is", null),
      billingDb
        .from("stripe_webhook_events")
        .select("id", { count: "exact", head: true })
        .is("processed_at", null)
        .is("error", null),
      billingDb
        .from("stripe_webhook_events")
        .select("id", { count: "exact", head: true })
        .not("processed_at", "is", null),
    ]);

  const failed = (failedRes.data ?? []).map(toWebhookSummary);
  const failedIds = new Set(failed.map((e) => e.id));
  const recent = (recentRes.data ?? [])
    .map(toWebhookSummary)
    .filter((e) => !failedIds.has(e.id));

  return {
    events: [...failed, ...recent],
    failedCount: failedCountRes.count ?? 0,
    pendingCount: pendingCountRes.count ?? 0,
    processedCount: processedCountRes.count ?? 0,
    lastEventAt: recentRes.data?.[0]?.received_at ?? null,
  };
}

/**
 * Everything the billing dashboard renders, in one pass.
 *
 * Fetched together rather than as separate exported queries because the
 * subscription rows feed four different aggregates - splitting them would mean
 * reading the same table four times per page load.
 *
 * @returns Aggregates derived entirely from Supabase. Live Stripe data is never
 *   required for this call to succeed.
 */
export async function getBillingDashboard(): Promise<BillingDashboardData> {
  const now = new Date();
  const nowIso = now.toISOString();
  const windowStart = new Date(
    now.getTime() - CONSUMPTION_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [itemsRes, openPeriodsRes, freeIntroRes, consumptionRes, webhooks] =
    await Promise.all([
      billingDb
        .from("subscription_items")
        .select("*")
        .order("created_at", { ascending: false }),
      // "Open" = now falls inside the period. Enforcement reads the same rows.
      billingDb
        .from("usage_periods")
        .select("*")
        .lte("period_start", nowIso)
        .gt("period_end", nowIso),
      billingDb
        .from("usage_periods")
        .select("user_id, period_end")
        .eq("kind", "free_intro"),
      billingDb
        .from("minute_consumptions")
        .select("user_id, minutes, occurred_at")
        .gte("occurred_at", windowStart)
        .order("occurred_at", { ascending: true }),
      getWebhookHealth(),
    ]);

  const items = itemsRes.data ?? [];
  const openPeriods = openPeriodsRes.data ?? [];

  const profiles = await loadProfiles([
    ...items.map((i) => i.user_id),
    ...openPeriods.map((p) => p.user_id),
  ]);

  const table: SubscriptionTableRow[] = [];
  for (const row of items) {
    const productKey = asProductKey(row.product_key);
    const status = asStatus(row.status);
    // A row failing both CHECK constraints cannot be priced or badged; it is
    // omitted rather than rendered with a guessed amount.
    if (!productKey || !status) continue;

    const profile = profiles.get(row.user_id);
    table.push({
      id: row.id,
      userId: row.user_id,
      email: profile?.email ?? "unknown",
      displayName: profile?.displayName ?? "",
      productKey,
      productLabel: productLabel(productKey),
      status,
      amountCents: monthlyAmountCents(productKey),
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      stripeSubscriptionId: row.stripe_subscription_id,
    });
  }

  return {
    subscriptions: deriveSubscriptionOverview(items),
    addonMix: deriveAddonMix(items),
    minutes: deriveMinuteUsage(openPeriods, profiles),
    freeIntro: deriveFreeIntro(freeIntroRes.data ?? [], items, now),
    webhooks,
    consumption: deriveConsumptionSeries(consumptionRes.data ?? [], now),
    table,
  };
}

/* -------------------------------------------------------------------------- */
/* Per-user support lookup                                                     */
/* -------------------------------------------------------------------------- */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Escapes LIKE metacharacters so an email containing `_` matches literally and
 * a stray `%` cannot turn an exact lookup into "return an arbitrary user".
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_*]/g, (c) => `\\${c}`);
}

/** Resolves the search box input to a profile row. */
async function resolveProfile(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (UUID_RE.test(trimmed)) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, role, created_at")
      .eq("id", trimmed)
      .maybeSingle();
    return data;
  }

  const { data: exact } = await supabaseAdmin
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .eq("email", trimmed)
    .maybeSingle();
  if (exact) return exact;

  // Case-insensitive fallback: support pastes emails out of tickets, often
  // capitalised differently from how the user typed them at signup.
  const { data: rows } = await supabaseAdmin
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .ilike("email", escapeLike(trimmed))
    .limit(1);

  return rows?.[0] ?? null;
}

/** Maps a usage period row to its display shape. */
function toLookupPeriod(row: UsagePeriodRow, now: Date): LookupUsagePeriod {
  const included = num(row.included_minutes);
  const purchased = num(row.purchased_minutes);
  const consumed = num(row.consumed_minutes);
  const startMs = new Date(row.period_start).getTime();
  const endMs = new Date(row.period_end).getTime();

  return {
    id: row.id,
    kind: row.kind,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    includedMinutes: included,
    purchasedMinutes: purchased,
    consumedMinutes: consumed,
    remainingMinutes: included + purchased - consumed,
    current: startMs <= now.getTime() && now.getTime() < endMs,
  };
}

/**
 * Everything support needs about one customer's billing, by email or user id.
 *
 * Answers the two tickets that actually arrive: "why was I charged?" (the
 * subscription items and their Stripe ids) and "why am I blocked?" (the current
 * usage period and the ledger entries that drained it).
 *
 * Reads only. When `STRIPE_SECRET_KEY` is set the result is enriched with the
 * live Stripe view - which is the tie-breaker when a webhook failed and
 * Supabase is therefore stale - but a Stripe failure only populates
 * `stripeError` and never fails the lookup.
 *
 * @param query - An email address or a Supabase user id.
 * @returns The customer's billing picture, or null when no profile matches.
 */
export async function lookupBillingUser(
  query: string
): Promise<BillingUserLookup | null> {
  const profile = await resolveProfile(query);
  if (!profile) return null;

  const now = new Date();

  const [customerRes, itemsRes, periodsRes, consumptionRes] = await Promise.all([
    billingDb
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", profile.id)
      .maybeSingle(),
    billingDb
      .from("subscription_items")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    billingDb
      .from("usage_periods")
      .select("*")
      .eq("user_id", profile.id)
      .order("period_start", { ascending: false })
      .limit(12),
    billingDb
      .from("minute_consumptions")
      .select("id, minutes, occurred_at, session_id")
      .eq("user_id", profile.id)
      .order("occurred_at", { ascending: false })
      .limit(25),
  ]);

  const items: LookupSubscriptionItem[] = [];
  let monthlySpendCents = 0;

  for (const row of itemsRes.data ?? []) {
    const productKey = asProductKey(row.product_key);
    const status = asStatus(row.status);
    if (!productKey || !status) continue;

    const live = isLive(status);
    const amountCents = monthlyAmountCents(productKey);
    if (live) monthlySpendCents += amountCents;

    items.push({
      id: row.id,
      productKey,
      productLabel: productLabel(productKey),
      status,
      amountCents,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeItemId: row.stripe_item_id,
      live,
    });
  }

  const periods = (periodsRes.data ?? []).map((p) => toLookupPeriod(p, now));

  const consumptionRows = consumptionRes.data ?? [];
  const sessionIds = consumptionRows
    .map((c) => c.session_id)
    .filter((id): id is string => id !== null);

  // Session names make the ledger legible ("which call burned 40 minutes?").
  // `sessions` lives in the main Database type, so it uses the base client.
  const sessionNames = new Map<string, string>();
  if (sessionIds.length > 0) {
    const { data: sessions } = await supabaseAdmin
      .from("sessions")
      .select("id, name")
      .in("id", [...new Set(sessionIds)]);
    for (const session of sessions ?? []) {
      sessionNames.set(session.id, session.name);
    }
  }

  const recentConsumption: LookupConsumption[] = consumptionRows.map((row) => ({
    id: row.id,
    minutes: num(row.minutes),
    occurredAt: row.occurred_at,
    sessionId: row.session_id,
    sessionName: row.session_id
      ? (sessionNames.get(row.session_id) ?? null)
      : null,
  }));

  const stripeCustomerId = customerRes.data?.stripe_customer_id ?? null;
  let stripe: StripeCustomerSnapshot | null = null;
  let stripeError: string | null = null;

  if (stripeCustomerId && isStripeConfigured()) {
    stripe = await fetchStripeCustomerSnapshot(stripeCustomerId);
    if (!stripe) {
      stripeError =
        "Stripe is configured but did not return this customer. Showing Supabase data only.";
    }
  }

  return {
    userId: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
    joinedAt: profile.created_at,
    stripeCustomerId,
    monthlySpendCents,
    items,
    periods,
    currentPeriod: periods.find((p) => p.current) ?? null,
    recentConsumption,
    stripe,
    stripeError,
  };
}
