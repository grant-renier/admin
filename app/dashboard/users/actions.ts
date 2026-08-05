"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

import { revalidatePath } from "next/cache";
import {
  updateUserRole,
  deleteUserAccount,
  setUserBanned,
} from "@/features/users/queries";
import type { UserRole } from "@/features/users/types";

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
  auditLog(actor, "user.role_change", String(id));
  await updateUserRole(id, role);
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
