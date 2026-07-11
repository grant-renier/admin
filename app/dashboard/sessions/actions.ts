"use server";

import { revalidatePath } from "next/cache";
import { deleteSession } from "@/features/sessions/queries";

/**
 * Server action: permanently deletes a session and all of its child data.
 * Callers are responsible for confirmation UI (ConfirmationDialog) and for
 * navigating back to /dashboard/sessions after a detail-page delete.
 *
 * NOTE: flag/unflag-for-review was intentionally NOT implemented. The
 * `sessions` table has no flag column and overloading `status` would corrupt
 * live session state -- flagging requires a schema migration (e.g. a nullable
 * `flagged_at timestamptz` column) before it can be built here.
 */
export async function deleteSessionAction(id: string) {
  await deleteSession(id);
  revalidatePath("/dashboard/sessions");
}
