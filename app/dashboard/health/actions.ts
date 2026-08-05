"use server";

import { revalidatePath } from "next/cache";

import { auditLog, requireAdmin } from "@/lib/require-admin";
import { runHealthChecks } from "@/features/health/queries";

/** Counts returned to the client after a manual check round. */
export interface RunChecksSummary {
  /** ISO timestamp the round was taken. */
  checkedAt: string;
  up: number;
  degraded: number;
  down: number;
  notConfigured: number;
}

/**
 * Runs every dependency probe now and records the round into
 * `service_health_checks`.
 *
 * Privileged: it makes authenticated outbound calls with the bridge and
 * Stripe secrets and writes rows with the service-role key, so it is
 * audit-logged as well as guarded.
 */
export async function runHealthChecksAction(): Promise<RunChecksSummary> {
  // Authorization is enforced HERE, not only in middleware: this action
  // writes via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "health.run_checks", "service_health_checks");

  const snapshot = await runHealthChecks();
  revalidatePath("/dashboard/health");

  const count = (status: string) =>
    snapshot.services.filter((s) => s.status === status).length;

  return {
    checkedAt: snapshot.checkedAt,
    up: count("up"),
    degraded: count("degraded"),
    down: count("down"),
    notConfigured: count("not_configured"),
  };
}
