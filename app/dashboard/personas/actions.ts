"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

/**
 * Server actions for the Persona Atlas. Every mutation validates its FormData
 * with Zod (zod@4) before touching Supabase, returning structured field errors
 * the client can surface inline. Slugs are derived from the name (with a manual
 * override); the DB `slug` unique constraint is the ultimate arbiter.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createPersona,
  updatePersona,
  deletePersona,
  uploadAtlasPdf,
} from "@/features/personas/queries";
import type { PersonaInsert, PersonaMetric } from "@/features/personas/types";
import { slugify } from "@/lib/utils";

/** Standard action result: either field-level errors or the affected id. */
export interface PersonaActionState {
  ok: boolean;
  errors?: Record<string, string>;
  id?: string;
}

/** Exactly-five metric editor rows travel as a JSON string in the form. */
const metricSchema = z.object({
  key: z.string().trim().min(1, "Metric key is required"),
  label: z.string().trim().default(""),
  description: z.string().trim().default(""),
});

/** Shared validation schema for both create and update. */
const personaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name is too long"),
  slug: z.string().trim().max(200).optional().default(""),
  archetype_title: z.string().trim().max(200).optional().default(""),
  summary: z.string().trim().max(2000).optional().default(""),
  leadership_context: z.string().trim().max(4000).optional().default(""),
  communication_style: z.string().trim().max(4000).optional().default(""),
  display_order: z.coerce.number().int().min(0).optional().default(0),
  is_published: z.string().optional().default("false"),
  metrics: z
    .string()
    .optional()
    .default("[]")
    .transform((raw, ctx): PersonaMetric[] => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid metrics payload" });
        return z.NEVER;
      }
      const result = z.array(metricSchema).safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          message: "Every metric needs a non-empty key",
        });
        return z.NEVER;
      }
      return result.data;
    }),
});

/** Collapse a ZodError into a flat `{ field: message }` map. */
function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Parse validated form fields into a Supabase-ready insert payload. */
function toPayload(
  fields: z.infer<typeof personaSchema>,
  finalSlug: string
): PersonaInsert {
  return {
    slug: finalSlug,
    name: fields.name,
    archetype_title: fields.archetype_title || null,
    summary: fields.summary || null,
    leadership_context: fields.leadership_context || null,
    communication_style: fields.communication_style || null,
    display_order: fields.display_order,
    is_published: fields.is_published === "true",
    metrics: fields.metrics,
  };
}

/** Read raw FormData into the schema's plain-string shape. */
function readForm(formData: FormData) {
  return {
    name: (formData.get("name") as string) ?? "",
    slug: (formData.get("slug") as string) ?? "",
    archetype_title: (formData.get("archetype_title") as string) ?? "",
    summary: (formData.get("summary") as string) ?? "",
    leadership_context: (formData.get("leadership_context") as string) ?? "",
    communication_style:
      (formData.get("communication_style") as string) ?? "",
    display_order: (formData.get("display_order") as string) ?? "0",
    is_published: (formData.get("is_published") as string) ?? "false",
    metrics: (formData.get("metrics") as string) ?? "[]",
  };
}

/** Create a new persona from validated FormData. */
export async function createPersonaAction(
  formData: FormData
): Promise<PersonaActionState> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const parsed = personaSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }
  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!slug) return { ok: false, errors: { slug: "Could not derive a slug" } };
  try {
    const persona = await createPersona(toPayload(parsed.data, slug));
    revalidatePath("/dashboard/personas");
    return { ok: true, id: persona.id };
  } catch (err) {
    return { ok: false, errors: { slug: dbError(err) } };
  }
}

/** Update an existing persona from validated FormData. */
export async function updatePersonaAction(
  formData: FormData
): Promise<PersonaActionState> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, errors: { form: "Missing persona id" } };
  const parsed = personaSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }
  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!slug) return { ok: false, errors: { slug: "Could not derive a slug" } };
  try {
    await updatePersona(id, toPayload(parsed.data, slug));
    revalidatePath("/dashboard/personas");
    return { ok: true, id };
  } catch (err) {
    return { ok: false, errors: { slug: dbError(err) } };
  }
}

/** Delete a single persona. */
export async function deletePersonaAction(id: string): Promise<void> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "persona.delete", String(id));
  await deletePersona(id);
  revalidatePath("/dashboard/personas");
}

/** Toggle the published state for a single persona. */
export async function setPersonaPublishedAction(
  id: string,
  published: boolean
): Promise<void> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  await updatePersona(id, { is_published: published });
  revalidatePath("/dashboard/personas");
}

/**
 * Upload the shared Atlas PDF (from a multipart FormData) to Storage and
 * return its public URL. Called directly from the page before any list save.
 */
export async function uploadAtlasPdfAction(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { url: null, error: "No file provided" };
  }
  if (file.type !== "application/pdf") {
    return { url: null, error: "File must be a PDF" };
  }
  const result = await uploadAtlasPdf(file);
  if (result.url) revalidatePath("/dashboard/personas");
  return result;
}

/** Surface a friendly message for the common unique-slug collision. */
function dbError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/duplicate key|unique/i.test(message)) {
    return "That slug is already taken";
  }
  return message || "Save failed";
}
