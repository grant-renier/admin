"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

import { revalidatePath } from "next/cache";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/features/templates/queries";

/**
 * Server actions for the Templates admin page. metric_templates rows are
 * shared with the live web + mobile apps, so metrics are re-validated here
 * (unique, non-empty keys) even though the form validates client-side.
 */

interface MetricDef {
  key: string;
  label: string;
  description: string;
}

/**
 * Parses the JSON-encoded metrics field from the form and enforces the
 * shared jsonb shape: every metric has a unique, non-empty key.
 */
function parseMetrics(raw: FormDataEntryValue | null): MetricDef[] {
  const parsed = JSON.parse((raw as string) || "[]") as MetricDef[];
  const seen = new Set<string>();
  return parsed.map((m) => {
    const key = m.key?.trim() ?? "";
    if (!key) throw new Error("Every metric needs a non-empty key");
    if (seen.has(key)) throw new Error(`Duplicate metric key: ${key}`);
    seen.add(key);
    return {
      key,
      label: m.label?.trim() || key,
      description: m.description?.trim() ?? "",
    };
  });
}

export async function createTemplateAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  await createTemplate({
    name: (formData.get("name") as string).trim(),
    description: (formData.get("description") as string)?.trim() || null,
    module_slug: (formData.get("module_slug") as string)?.trim() || null,
    is_system: formData.get("is_system") === "true",
    metrics: parseMetrics(formData.get("metrics")),
    created_by: null,
  });
  revalidatePath("/dashboard/templates");
}

export async function updateTemplateAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const id = formData.get("id") as string;
  await updateTemplate(id, {
    name: (formData.get("name") as string).trim(),
    description: (formData.get("description") as string)?.trim() || null,
    module_slug: (formData.get("module_slug") as string)?.trim() || null,
    metrics: parseMetrics(formData.get("metrics")),
  });
  revalidatePath("/dashboard/templates");
}

export async function deleteTemplateAction(id: string) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "template.delete", String(id));
  await deleteTemplate(id);
  revalidatePath("/dashboard/templates");
}
