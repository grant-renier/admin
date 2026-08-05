/**
 * Data-access layer for the legal-documents feature.
 *
 * `legal_documents` has RLS that lets anon/authenticated SELECT only published
 * rows and has NO write policy at all, so every edit in this panel necessarily
 * goes through the service-role client. Pure and React-free so the Server
 * Actions can compose it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase/client";

import {
  LEGAL_SLUGS,
  type LegalDatabase,
  type LegalDocumentPatch,
  type LegalDocumentRow,
  type LegalDocumentVersionRow,
  type LegalSlug,
} from "./types";

/**
 * The service-role client, retyped for the two legal tables.
 *
 * WHY the cast: `types/supabase.ts` holds the hand-written `Database`
 * interface and has no `legal_documents` / `legal_document_versions` entry.
 * That file is outside this feature's ownership right now, so instead of
 * dropping to an untyped client (which would make every column name a silent
 * typo risk) the client is re-typed against the local `LegalDatabase` schema
 * declared in `./types`. Same runtime client, same key, full column checking.
 *
 * TODO: delete this once `legal_documents` is added to `types/supabase.ts`.
 */
const legalDb = supabaseAdmin as unknown as SupabaseClient<LegalDatabase>;

/** Fixed display order, so the list page never reshuffles between loads. */
const SLUG_ORDER = new Map<string, number>(
  LEGAL_SLUGS.map((slug, index) => [slug, index])
);

/**
 * Every legal document, in canonical slug order.
 *
 * There are exactly three rows by CHECK constraint, so no pagination and no
 * `limit` -- but the query does not assume all three exist; a missing row is a
 * seeding gap the list page reports honestly.
 */
export async function getLegalDocuments(): Promise<LegalDocumentRow[]> {
  const { data, error } = await legalDb.from("legal_documents").select("*");
  if (error) {
    throw new Error(`Failed to load legal documents: ${error.message}`);
  }
  return (data ?? []).sort(
    (a, b) =>
      (SLUG_ORDER.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
      (SLUG_ORDER.get(b.slug) ?? Number.MAX_SAFE_INTEGER)
  );
}

/** Fetch one document by its unique slug, or null when it has not been seeded. */
export async function getLegalDocumentBySlug(
  slug: LegalSlug
): Promise<LegalDocumentRow | null> {
  const { data, error } = await legalDb
    .from("legal_documents")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load "${slug}": ${error.message}`);
  }
  return data;
}

/**
 * Version history for a document, newest first.
 *
 * `legal_document_versions` is append-only and written by the BEFORE UPDATE
 * trigger, so each row is a snapshot of the document as it stood *before* the
 * edit that superseded it.
 */
export async function getLegalDocumentVersions(
  documentId: string
): Promise<LegalDocumentVersionRow[]> {
  const { data, error } = await legalDb
    .from("legal_document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version", { ascending: false });
  if (error) {
    throw new Error(`Failed to load version history: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Fetch a single historical version.
 *
 * Scoped by `document_id` as well as `id` so a version belonging to a
 * different document can never be restored onto this one, even if a caller
 * passes a version id from another row.
 */
export async function getLegalDocumentVersion(
  documentId: string,
  versionId: string
): Promise<LegalDocumentVersionRow | null> {
  const { data, error } = await legalDb
    .from("legal_document_versions")
    .select("*")
    .eq("id", versionId)
    .eq("document_id", documentId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load version: ${error.message}`);
  }
  return data;
}

/**
 * Apply a patch to a document and return the row as it now stands.
 *
 * `version` is deliberately not part of `LegalDocumentPatch`: the BEFORE
 * UPDATE trigger archives the outgoing row and bumps the counter itself
 * whenever `doc` or `title` changes. Writing it here would either fight the
 * trigger or silently desynchronise the history.
 *
 * @param slug  - Which document to patch.
 * @param patch - Columns to write (title / doc / effective_date / published).
 */
export async function updateLegalDocument(
  slug: LegalSlug,
  patch: LegalDocumentPatch
): Promise<LegalDocumentRow> {
  const { data, error } = await legalDb
    .from("legal_documents")
    .update(patch)
    .eq("slug", slug)
    .select("*")
    .single();
  if (error) {
    throw new Error(`Failed to update "${slug}": ${error.message}`);
  }
  return data;
}

/**
 * Flip a document's published flag.
 *
 * Published state is not versioned: the trigger only snapshots on `doc` /
 * `title` changes, so toggling visibility does not create a history entry or
 * bump the version. That is intentional -- unpublishing is a takedown switch,
 * not a content edit.
 */
export async function setLegalDocumentPublished(
  slug: LegalSlug,
  published: boolean,
  updatedBy: string
): Promise<LegalDocumentRow> {
  return updateLegalDocument(slug, { published, updated_by: updatedBy });
}
