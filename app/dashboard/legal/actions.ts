"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

/**
 * Server Actions for the Privacy Policy, EULA and Recording Consent documents.
 *
 * These are the most consequential writes in the panel: the payload they store
 * is rendered verbatim on public pages, so a malformed `doc` is not a bad
 * admin screen, it is a broken `/legal/*` for every visitor and a compliance
 * problem. Two rules follow, and both are enforced here rather than in the UI:
 *
 * - **Nothing is written that has not passed `parseLegalDoc`.** The editor
 *   validates too, but the editor is a client and a Server Action is a public
 *   POST endpoint - the browser's validation is a convenience, this is the gate.
 * - **`version` is never set.** A BEFORE UPDATE trigger archives the outgoing
 *   row into `legal_document_versions` and bumps the counter itself. Writing
 *   it here would desynchronise the history from the document.
 *
 * Every export begins with `await requireAdmin()` and records an `auditLog`
 * entry: changing published legal terms is a privileged act and needs an
 * attributable server-side record independent of anything the browser says.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getLegalDocumentBySlug,
  getLegalDocumentVersion,
  setLegalDocumentPublished,
  updateLegalDocument,
} from "@/features/legal/queries";
import {
  LEGAL_SLUGS,
  type LegalActionState,
  type LegalSlug,
} from "@/features/legal/types";
import {
  normalizeLegalDoc,
  parseLegalDoc,
  parseLegalDocJson,
} from "@/features/legal/validation";

/**
 * Refresh the list, the document's editor, and the dashboard overview (which
 * carries a "Legal Drafts" tile fed by the same rows).
 */
function revalidateLegalPaths(slug: LegalSlug) {
  revalidatePath("/dashboard/legal");
  revalidatePath(`/dashboard/legal/${slug}`);
  revalidatePath("/dashboard");
}

/** Collapse a ZodError into the `path: message` lines the editor renders. */
function flattenErrors(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${String(issue.path[0] ?? "form")}: ${issue.message}`
  );
}

/** The slug arrives from the browser, so it is validated, never trusted. */
const slugSchema = z.enum(LEGAL_SLUGS);

/** Fields accepted by the save action. */
const saveSchema = z.object({
  slug: slugSchema,
  doc: z.string().min(1, "Missing document payload"),
  // HTML date inputs emit `YYYY-MM-DD`; empty means "clear the column".
  effective_date: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Effective date must be YYYY-MM-DD",
    }),
});

/**
 * Save the document body.
 *
 * The `title` COLUMN is derived from the validated `doc.title` rather than
 * accepted as its own field: they are shown as one input in the editor and any
 * drift between them would mean the list page and the rendered page disagree
 * about what the document is called.
 *
 * @param formData - `slug`, `doc` (JSON string), `effective_date`.
 */
export async function saveLegalDocumentAction(
  formData: FormData
): Promise<LegalActionState> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();

  const parsed = saveSchema.safeParse({
    slug: (formData.get("slug") as string) ?? "",
    doc: (formData.get("doc") as string) ?? "",
    effective_date: (formData.get("effective_date") as string) ?? "",
  });
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }

  const docResult = parseLegalDocJson(parsed.data.doc);
  if (!docResult.ok) {
    return { ok: false, errors: docResult.errors };
  }

  const doc = normalizeLegalDoc(docResult.doc);
  // Re-validate AFTER normalising: trimming can empty a string that was only
  // whitespace, and a blank title or section heading must not reach the page.
  const recheck = parseLegalDoc(doc);
  if (!recheck.ok) {
    return { ok: false, errors: recheck.errors };
  }

  auditLog(actor, "legal.save", parsed.data.slug, {
    title: doc.title,
    sections: doc.sections.length,
  });

  const row = await updateLegalDocument(parsed.data.slug, {
    title: doc.title,
    doc,
    effective_date: parsed.data.effective_date || null,
    updated_by: actor.username,
  });

  revalidateLegalPaths(parsed.data.slug);
  return { ok: true, version: row.version };
}

/**
 * Make a document readable by the public (RLS exposes only `published` rows).
 *
 * Refuses when the stored payload does not satisfy the render contract. This
 * is the one place where "the DB accepted it" is not good enough: publishing
 * is precisely the act of pointing every visitor at this row.
 */
export async function publishLegalDocumentAction(
  slug: LegalSlug
): Promise<LegalActionState> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();

  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { ok: false, errors: ["Unknown legal document slug."] };
  }

  const row = await getLegalDocumentBySlug(parsedSlug.data);
  if (!row) {
    return {
      ok: false,
      errors: [`No "${parsedSlug.data}" row exists in legal_documents yet.`],
    };
  }

  const check = parseLegalDoc(row.doc);
  if (!check.ok) {
    return {
      ok: false,
      errors: [
        "Refusing to publish: the stored document does not match the shape the public page renders.",
        ...check.errors,
      ],
    };
  }

  auditLog(actor, "legal.publish", parsedSlug.data, { version: row.version });
  const updated = await setLegalDocumentPublished(
    parsedSlug.data,
    true,
    actor.username
  );

  revalidateLegalPaths(parsedSlug.data);
  return { ok: true, version: updated.version };
}

/**
 * Withdraw a document from the public site.
 *
 * Deliberately does NOT validate the payload first - unpublishing is the
 * takedown switch, and it must keep working when the stored doc is exactly
 * what you are trying to take down.
 */
export async function unpublishLegalDocumentAction(
  slug: LegalSlug
): Promise<LegalActionState> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();

  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { ok: false, errors: ["Unknown legal document slug."] };
  }

  const row = await getLegalDocumentBySlug(parsedSlug.data);
  if (!row) {
    return {
      ok: false,
      errors: [`No "${parsedSlug.data}" row exists in legal_documents yet.`],
    };
  }

  auditLog(actor, "legal.unpublish", parsedSlug.data, { version: row.version });
  const updated = await setLegalDocumentPublished(
    parsedSlug.data,
    false,
    actor.username
  );

  revalidateLegalPaths(parsedSlug.data);
  return { ok: true, version: updated.version };
}

/** Fields accepted by the restore action. */
const restoreSchema = z.object({
  slug: slugSchema,
  versionId: z.uuid("Invalid version id"),
});

/**
 * Restore an archived version as the live document.
 *
 * This is a forward edit, not a rewind: the current text is archived by the
 * same trigger before the old text lands, so the history stays append-only and
 * a mistaken restore is itself reversible. The version is looked up scoped to
 * this document's id, so a version id belonging to another document cannot be
 * grafted on.
 */
export async function restoreLegalVersionAction(
  slug: LegalSlug,
  versionId: string
): Promise<LegalActionState> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();

  const parsed = restoreSchema.safeParse({ slug, versionId });
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }

  const row = await getLegalDocumentBySlug(parsed.data.slug);
  if (!row) {
    return {
      ok: false,
      errors: [`No "${parsed.data.slug}" row exists in legal_documents yet.`],
    };
  }

  const version = await getLegalDocumentVersion(row.id, parsed.data.versionId);
  if (!version) {
    return {
      ok: false,
      errors: ["That version does not belong to this document."],
    };
  }

  const check = parseLegalDoc(version.doc);
  if (!check.ok) {
    return {
      ok: false,
      errors: [
        `Version ${version.version} predates the current document contract and cannot be restored as-is. Copy it into the Raw JSON tab and repair it instead.`,
        ...check.errors,
      ],
    };
  }

  const doc = normalizeLegalDoc(check.doc);

  auditLog(actor, "legal.restore", parsed.data.slug, {
    restoredVersion: version.version,
    replacedVersion: row.version,
  });

  const updated = await updateLegalDocument(parsed.data.slug, {
    // `title` mirrors `doc.title` on every other write; keep that invariant
    // here too rather than resurrecting a column value that drifted.
    title: doc.title,
    doc,
    effective_date: version.effective_date,
    updated_by: actor.username,
  });

  revalidateLegalPaths(parsed.data.slug);
  return { ok: true, version: updated.version };
}
