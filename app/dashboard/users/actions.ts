"use server";

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
  await updateUserRole(id, role);
  revalidateUserPaths(id);
}

/**
 * Permanently deletes a user's auth account and profile. Destructive and
 * irreversible -- callers must gate this behind an explicit confirmation.
 */
export async function deleteUserAction(id: string) {
  await deleteUserAccount(id);
  revalidateUserPaths(id);
}

/** Bans (indefinitely, ~100 years) or unbans a user at the auth layer. */
export async function setUserBannedAction(id: string, banned: boolean) {
  await setUserBanned(id, banned);
  revalidateUserPaths(id);
}
