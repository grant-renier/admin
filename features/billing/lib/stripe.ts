// Reads STRIPE_SECRET_KEY. Server-only, structurally enforced: importing this
// from a "use client" file must fail the build, not leak a live API key.
import "server-only";

import type { StripeConnectionStatus, StripeCustomerSnapshot } from "../types";

/**
 * Optional live-Stripe enrichment for the billing panel.
 *
 * Everything here is BEST EFFORT. The panel's contract is that it renders
 * entirely from Supabase; Stripe only adds detail when `STRIPE_SECRET_KEY` is
 * configured and the API answers. Every exported function therefore returns a
 * value on failure and never throws - an outage at Stripe must not take down
 * the page support uses during a Stripe outage.
 *
 * The `stripe` SDK is not a dependency of this repo, so these are plain REST
 * calls against the versioned API.
 *
 * @module features/billing/lib/stripe
 */

const STRIPE_API = "https://api.stripe.com/v1";

/** Milliseconds before a Stripe call is abandoned and we fall back to Supabase. */
const STRIPE_TIMEOUT_MS = 4000;

/** Whether a Stripe secret key is present in the environment. */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return typeof key === "string" && key.length > 0;
}

/**
 * Which Stripe environment the configured key points at, derived from its
 * prefix. No network call - safe to render synchronously.
 */
export function stripeMode(): "live" | "test" | "unknown" | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return "unknown";
}

/** Base URL of the Stripe dashboard for the configured mode. */
function dashboardBase(): string {
  return stripeMode() === "test"
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
}

/**
 * GETs a Stripe endpoint and returns the parsed body, or null on any failure.
 *
 * Deliberately swallows every error class (missing key, network, non-2xx,
 * malformed JSON, timeout) into `null` - callers treat "no live data" and
 * "Stripe is unhappy" identically, and the reason is logged server-side.
 */
async function stripeGet(path: string): Promise<Record<string, unknown> | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STRIPE_TIMEOUT_MS);

  try {
    const res = await fetch(`${STRIPE_API}${path}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        // Pinning the API version keeps response shapes stable across Stripe's
        // rolling upgrades; an unpinned call can change field names under us.
        "Stripe-Version": "2024-06-20",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("[billing/stripe] %s -> HTTP %d", path, res.status);
      return null;
    }

    const body: unknown = await res.json();
    return isRecord(body) ? body : null;
  } catch (error) {
    console.warn(
      "[billing/stripe] %s failed: %s",
      path,
      error instanceof Error ? error.message : "unknown error"
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Narrows unknown JSON to an object without reaching for `any`. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/**
 * Probes the Stripe API so the page can show whether live enrichment is
 * actually working, rather than silently rendering Supabase-only data.
 *
 * @returns A status object. `configured: false` when no key is set - that is a
 *   supported deployment, not an error.
 */
export async function getStripeConnection(): Promise<StripeConnectionStatus> {
  if (!isStripeConfigured()) {
    return { configured: false, mode: null, reachable: false, error: null };
  }

  // `customers?limit=1` is the cheapest call that also proves the key carries
  // the read scope this panel needs; `/v1/balance` would pass with a key that
  // cannot read customers at all.
  const body = await stripeGet("/customers?limit=1");
  return {
    configured: true,
    mode: stripeMode(),
    reachable: body !== null,
    error: body === null ? "Stripe API did not respond successfully." : null,
  };
}

/**
 * Fetches the live Stripe view of one customer: delinquency, account balance,
 * and current subscription statuses.
 *
 * This is the tie-breaker when Supabase and the customer disagree - if the
 * webhook failed, `subscription_items` is stale and Stripe is right.
 *
 * @param customerId - `billing_customers.stripe_customer_id`.
 * @returns A snapshot, or null when Stripe is unconfigured/unreachable.
 */
export async function fetchStripeCustomerSnapshot(
  customerId: string
): Promise<StripeCustomerSnapshot | null> {
  if (!isStripeConfigured() || !customerId) return null;

  const [customer, subs] = await Promise.all([
    stripeGet(`/customers/${encodeURIComponent(customerId)}`),
    stripeGet(
      `/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=10`
    ),
  ]);

  if (!customer) return null;

  const statuses: string[] = [];
  const data = subs?.data;
  if (Array.isArray(data)) {
    for (const entry of data) {
      const status = isRecord(entry) ? asString(entry.status) : null;
      if (status) statuses.push(status);
    }
  }

  return {
    customerId,
    email: asString(customer.email),
    delinquent: asBoolean(customer.delinquent),
    balanceCents: asNumber(customer.balance),
    currency: asString(customer.currency),
    subscriptionStatuses: statuses,
    dashboardUrl: `${dashboardBase()}/customers/${customerId}`,
  };
}
