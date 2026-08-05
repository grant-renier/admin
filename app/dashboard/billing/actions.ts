"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog, requireAdmin } from "@/lib/require-admin";
import { lookupBillingUser } from "@/features/billing/queries";
import type { BillingUserLookup } from "@/features/billing/types";

/**
 * Server Actions for the billing panel.
 *
 * This panel is READ-ONLY by design: the Stripe webhook owns every write to
 * billing state, so there is no action here that mutates a subscription, a
 * usage period, or a ledger row. What is here is still privileged - the lookup
 * reads one customer's complete billing history through the service-role key,
 * which bypasses RLS - so it is guarded and audited exactly like a mutation.
 *
 * @module app/dashboard/billing/actions
 */

/**
 * A support lookup is either an email or a Supabase user id. Three characters
 * is the floor so a stray keystroke cannot scan the profiles table.
 */
const lookupSchema = z
  .string()
  .trim()
  .min(3, "Enter at least 3 characters.")
  .max(320, "Too long to be an email address or user id.");

/** Discriminated result so the client renders errors without try/catch trees. */
export type LookupResult =
  | { ok: true; data: BillingUserLookup }
  | { ok: false; error: string };

/**
 * Looks up one customer's billing state by email or user id.
 *
 * Privileged read: it returns another person's subscription items, Stripe ids
 * and consumption history, so it is authorized at the action and written to the
 * audit log with the search term. Middleware is not the boundary here - this is
 * an addressable POST endpoint.
 *
 * @param query - Email address or Supabase user id.
 * @returns The customer's billing picture, or a message safe to show support.
 */
export async function lookupBillingUserAction(
  query: string
): Promise<LookupResult> {
  // Authorization is enforced HERE, not only in middleware: this action reads
  // every customer's billing data through the service-role key.
  const actor = await requireAdmin();

  const parsed = lookupSchema.safeParse(query);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid search term.",
    };
  }

  auditLog(actor, "billing.lookup", parsed.data);

  const data = await lookupBillingUser(parsed.data);
  if (!data) {
    return { ok: false, error: `No user found for "${parsed.data}".` };
  }

  return { ok: true, data };
}

/**
 * Re-reads the billing page from Supabase.
 *
 * Exists because the webhook-health panel is the one surface where a stale read
 * is actively harmful: an operator who just replayed a failed event needs to
 * confirm it cleared without hunting for a browser reload.
 */
export async function refreshBillingAction(): Promise<void> {
  // Authorization is enforced HERE, not only in middleware.
  await requireAdmin();
  revalidatePath("/dashboard/billing");
}
