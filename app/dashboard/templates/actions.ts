"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/features/templates/queries";
import { MODULE_SLUGS } from "@/lib/modules";

/**
 * Server actions for the Templates admin page. metric_templates rows are
 * shared with the live web + mobile apps and the bridge's scoring prompts, so
 * every field is re-validated here (Zod, zod@4) even though the form
 * validates client-side too - this is the boundary a hand-crafted request
 * actually has to pass.
 *
 * `module_slug` in particular used to accept any free-text string with no
 * check against `MODULE_SLUGS` - the exact typo class `lib/modules.ts`'s own
 * docstring says a shared constant exists to kill. A typo'd slug here is not
 * a cosmetic bug: metric_templates.module_slug is read by the bridge's
 * scoring prompts and both live clients, so a mismatched slug silently
 * detaches a template from every module it was meant to serve.
 */

const metricSchema = z.object({
  key: z.string().trim().min(1, "Every metric needs a non-empty key"),
  label: z.string().trim().optional().default(""),
  description: z.string().trim().optional().default(""),
});

/** Parses the JSON-encoded metrics field and enforces unique, non-empty keys. */
const metricsField = z
  .string()
  .optional()
  .default("[]")
  .transform((raw, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid metrics payload" });
      return z.NEVER;
    }
    const result = z.array(metricSchema).min(1, "Add at least one metric").safeParse(parsed);
    if (!result.success) {
      ctx.addIssue({ code: "custom", message: result.error.issues[0]?.message ?? "Invalid metrics" });
      return z.NEVER;
    }
    const seen = new Set<string>();
    for (const m of result.data) {
      if (seen.has(m.key)) {
        ctx.addIssue({ code: "custom", message: `Duplicate metric key: ${m.key}` });
        return z.NEVER;
      }
      seen.add(m.key);
    }
    return result.data.map((m) => ({ ...m, label: m.label || m.key }));
  });

/** Empty string means "global" (no module scoping) - the DB column is nullable. */
const moduleSlugField = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((v) => v === "" || (MODULE_SLUGS as readonly string[]).includes(v), {
    message: `Must be blank (global) or one of: ${MODULE_SLUGS.join(", ")}`,
  })
  .transform((v) => (v === "" ? null : v));

const templateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().trim().optional().default(""),
  module_slug: moduleSlugField,
  metrics: metricsField,
});

function readForm(formData: FormData) {
  return {
    name: (formData.get("name") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    module_slug: (formData.get("module_slug") as string) ?? "",
    metrics: (formData.get("metrics") as string) ?? "[]",
  };
}

/** Collapse a ZodError into one readable message for the form's toast. */
function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid template";
}

export async function createTemplateAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const parsed = templateSchema.safeParse(readForm(formData));
  if (!parsed.success) throw new Error(firstError(parsed.error));
  await createTemplate({
    name: parsed.data.name,
    description: parsed.data.description || null,
    module_slug: parsed.data.module_slug,
    is_system: formData.get("is_system") === "true",
    metrics: parsed.data.metrics,
    created_by: null,
  });
  revalidatePath("/dashboard/templates");
}

export async function updateTemplateAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing template id");
  const parsed = templateSchema.safeParse(readForm(formData));
  if (!parsed.success) throw new Error(firstError(parsed.error));
  await updateTemplate(id, {
    name: parsed.data.name,
    description: parsed.data.description || null,
    module_slug: parsed.data.module_slug,
    metrics: parsed.data.metrics,
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
