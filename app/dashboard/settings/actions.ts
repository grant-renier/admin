"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

import { revalidatePath } from "next/cache";

import { updateAccessGate } from "@/features/config/queries";
import type { AccessGateMode } from "@/features/config/types";

/**
 * Persist the access-gate (version kill switch) from the settings form.
 * Server action → service-role write; RLS blocks every other writer.
 * Route protection comes from middleware.ts (admin session cookie), same
 * as the learn CRUD actions.
 */
export async function updateAccessGateAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "access_gate.update", String("access_gate"));
  const rawMode = formData.get("mode") as string;
  const mode: AccessGateMode =
    rawMode === "paid_only" || rawMode === "maintenance" ? rawMode : "open";

  await updateAccessGate({
    mode,
    registrations_enabled: formData.get("registrations_enabled") === "true",
    message: ((formData.get("message") as string) || "").trim() || null,
    upgrade_url: ((formData.get("upgrade_url") as string) || "").trim() || null,
    entitlements_enforced: formData.get("entitlements_enforced") === "true",
  });
  revalidatePath("/dashboard/settings");
}
