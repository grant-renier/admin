"use server";

import { requireAdmin } from "@/lib/require-admin";

import { revalidatePath } from "next/cache";
import { updateModule } from "@/features/content/queries";

/**
 * Server actions for the Content > Modules admin page. Thin wrappers around
 * the feature-layer queries so client components never touch supabaseAdmin.
 */

/** Persists a module's active flag and refreshes the modules page. */
export async function toggleModuleAction(id: string, isActive: boolean) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  await updateModule(id, { is_active: isActive });
  revalidatePath("/dashboard/content/modules");
}

/**
 * Updates a module's description and sample prompts from the edit dialog.
 * Sample prompts arrive as a newline-separated textarea value.
 */
export async function updateModuleDetailsAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const id = formData.get("id") as string;
  const updates = {
    description: (formData.get("description") as string) ?? "",
    sample_prompts:
      (formData.get("sample_prompts") as string)
        ?.split("\n")
        .map((p) => p.trim())
        .filter(Boolean) ?? [],
  };
  await updateModule(id, updates);
  revalidatePath("/dashboard/content/modules");
}
