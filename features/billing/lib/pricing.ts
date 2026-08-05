/**
 * The one place a dollar amount is written down in this admin panel.
 *
 * SOURCE OF TRUTH: `/Users/omrajpal/Downloads/IntualityWeb/src/lib/billing/catalog.ts`
 * (module `@/lib/billing/catalog` in the IntualityWeb repo), which is itself
 * kept byte-for-byte consistent with `scripts/stripe-bootstrap.mjs`. This file
 * is a READ-ONLY MIRROR for display purposes: nothing here ever charges a card,
 * and Stripe remains the authority on what a customer was actually billed.
 *
 * If a price changes it changes in the catalog first, then here, then the
 * bootstrap script is re-run (Stripe prices are immutable - it mints a new one).
 *
 * WHY the amounts are centralised: the marketing site once advertised a "$49
 * plan" that did not exist because a number was typed straight into JSX. Every
 * currency figure rendered by this feature must resolve to {@link BILLING_CATALOG}.
 *
 * This module is PURE and client-safe - no `server-only`, no `process.env`.
 *
 * @module features/billing/lib/pricing
 */

import type { CatalogProductKey } from "../types";

/** One catalog line, display-only. */
export interface CatalogLine {
  /** Customer-facing product name, as it appears on the Stripe invoice. */
  label: string;
  /** Short label for tables and chart legends. */
  shortLabel: string;
  /** Price in cents, USD. */
  amountCents: number;
  /** Recurring monthly, or a single one-off charge. */
  interval: "month" | "one_time";
  /** Assessment minutes the line provides, when it provides any. */
  includedMinutes?: number;
}

/**
 * THE price sheet. Mirrors `CATALOG` in
 * `/Users/omrajpal/Downloads/IntualityWeb/src/lib/billing/catalog.ts`:
 *
 *   base           $29 / month, 180 minutes included
 *   block_180      $24 one-off, +180 minutes on the CURRENT period
 *   addon_uploads  $19 / month
 *   addon_reports  $15 / month
 *   addon_chat     $ 9 / month
 *   addon_basket   $35 / month (all three; $43 bought separately)
 *
 * Enterprise is contact-sales and has no catalog entry, by design.
 */
export const BILLING_CATALOG: Record<CatalogProductKey, CatalogLine> = {
  base: {
    label: "IA Commercial Basic",
    shortLabel: "Base",
    amountCents: 2900,
    interval: "month",
    includedMinutes: 180,
  },
  block_180: {
    label: "IA Additional Block - 180 minutes",
    shortLabel: "Minute block",
    amountCents: 2400,
    interval: "one_time",
    includedMinutes: 180,
  },
  addon_uploads: {
    label: "IA Add-On - File Uploads",
    shortLabel: "Uploads",
    amountCents: 1900,
    interval: "month",
  },
  addon_reports: {
    label: "IA Add-On - Full Session Reports",
    shortLabel: "Reports",
    amountCents: 1500,
    interval: "month",
  },
  addon_chat: {
    label: "IA Add-On - Chat with IntualityAI",
    shortLabel: "Chat",
    amountCents: 900,
    interval: "month",
  },
  addon_basket: {
    label: "IA Full Basket Add-Ons",
    shortLabel: "Basket",
    amountCents: 3500,
    interval: "month",
  },
};

/** Minutes granted by the invite-led free introduction. */
export const FREE_INTRO_MINUTES = 15;

/** Length of the free introductory window, in days. */
export const FREE_INTRO_DAYS = 30;

/**
 * Fraction of the allowance at which a user is flagged as *near* their limit.
 *
 * Support-facing, not billing-facing: at 85% a long session will run them out
 * mid-assessment, which is when people write in.
 */
export const NEAR_LIMIT_THRESHOLD = 0.85;

/**
 * Monthly recurring amount, in cents, for a subscription product.
 *
 * Unknown keys return 0 rather than throwing: a `product_key` written by a
 * future webhook version must never blank out an operations page.
 *
 * @param key - `subscription_items.product_key`.
 */
export function monthlyAmountCents(key: string): number {
  const line = BILLING_CATALOG[key as CatalogProductKey];
  if (!line || line.interval !== "month") return 0;
  return line.amountCents;
}

/**
 * Customer-facing label for a product key, falling back to the raw key so an
 * unrecognised value is visible rather than silently blank.
 */
export function productLabel(key: string): string {
  return BILLING_CATALOG[key as CatalogProductKey]?.label ?? key;
}

/** Compact label for tables, chart legends and badges. */
export function productShortLabel(key: string): string {
  return BILLING_CATALOG[key as CatalogProductKey]?.shortLabel ?? key;
}

/**
 * Combined monthly cost of the three individual add-ons ($43), used to show
 * what a customer would save by moving to the $35 basket.
 */
export const INDIVIDUAL_ADDONS_TOTAL_CENTS =
  BILLING_CATALOG.addon_uploads.amountCents +
  BILLING_CATALOG.addon_reports.amountCents +
  BILLING_CATALOG.addon_chat.amountCents;

/** Monthly price of the basket ($35). */
export const BASKET_CENTS = BILLING_CATALOG.addon_basket.amountCents;

/**
 * Formats cents as USD. The ONLY way currency reaches the screen in this
 * feature - no component builds a `$` string by hand.
 *
 * @param cents - Amount in cents.
 * @param opts.cents - When true, show cents (default rounds to whole dollars,
 *   which is what every catalog price is).
 */
export function formatUsd(
  cents: number,
  opts: { cents?: boolean } = {}
): string {
  const showCents = opts.cents ?? cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(cents / 100);
}

/** Formats a minute count with at most one decimal (the column is numeric(10,2)). */
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes * 10) / 10;
  return `${rounded.toLocaleString("en-US")} min`;
}
