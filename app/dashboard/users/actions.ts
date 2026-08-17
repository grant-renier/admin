"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

import { revalidatePath } from "next/cache";
import {
  updateUserRole,
  updateUserBillingBypass,
  deleteUserAccount,
  setUserBanned,
} from "@/features/users/queries";
import { USER_ROLES, type UserRole } from "@/features/users/types";

/** Refreshes the users list and the affected user's detail page. */
function revalidateUserPaths(id: string) {
  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${id}`);
}

/**
 * Changes a user's profile role. `admin` and `beta` are exempt from the
 * web app's access-gate kill switch -- this action is how the team keeps
 * its own accounts working after a beta cutover.
 */
export async function updateUserRoleAction(id: string, role: UserRole) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();

  // Runtime re-check, not just a TypeScript cast at the call site. A Server
  // Action is an addressable POST endpoint (see AGENTS.md's CVE-2025-29927
  // note) - `role: UserRole` is compile-time-only for the browser bundle
  // that calls this via the framework's RPC, but nothing stops a raw POST
  // from sending any string. Writing that straight to `profiles.role` would
  // land whatever was sent, silently, since `updateUserRole` does a plain
  // `.update({ role })` with no column CHECK constraint backing it up.
  if (!USER_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${String(role)}`);
  }

  auditLog(actor, "user.role_change", String(id));
  await updateUserRole(id, role);
  revalidateUserPaths(id);
}

/**
 * Toggles the comp-account "bypass billing" flag for a user. On, the web
 * app grants them every add-on and unlimited minutes regardless of actual
 * subscription/usage-period state -- the lever for internal-team and
 * beta-tester accounts that should never hit the paywall.
 */
export async function updateUserBillingBypassAction(id: string, bypass: boolean) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "user.billing_bypass_change", String(id));
  await updateUserBillingBypass(id, bypass);
  revalidateUserPaths(id);
}

/**
 * Permanently deletes a user's auth account and profile. Destructive and
 * irreversible -- callers must gate this behind an explicit confirmation.
 */
export async function deleteUserAction(id: string) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "user.delete", String(id));
  await deleteUserAccount(id);
  revalidateUserPaths(id);
}

/** Bans (indefinitely, ~100 years) or unbans a user at the auth layer. */
export async function setUserBannedAction(id: string, banned: boolean) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "user.ban", String(id));
  await setUserBanned(id, banned);
  revalidateUserPaths(id);
}
