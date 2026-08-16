/**
 * Data-access layer for the Persona Atlas feature. All reads/writes go through
 * the service-role admin client (RLS blocks client writes). Pure and
 * React-free so it can be unit-tested and reused by server actions.
 */
import { supabaseAdmin } from "@/lib/supabase/client";
import type { Persona, PersonaInsert, PersonaUpdate } from "./types";

/**
 * Storage bucket that holds the shared Persona Atlas PDF.
 *
 * PRIVATE as of IntualityWeb migration `0013_lock_personas_table.sql` - it
 * used to be `public: true`, which meant anyone with the raw object URL
 * (constructible from the public Supabase URL + this bucket/key, no secret
 * needed) could read the real paid document with no purchase and no login.
 * Every read through this file now goes through `createSignedUrl`, which
 * only this service-role client can mint, and expires quickly.
 */
export const PERSONA_ATLAS_BUCKET = "persona-atlas";

/** How long an admin-preview signed URL stays valid. Short: this is a live preview link for content management, not something meant to be bookmarked or shared. */
const PREVIEW_URL_TTL_SECONDS = 300;

/** Stable object key for the single shared Atlas PDF within the bucket. */
const ATLAS_PDF_KEY = "atlas.pdf";

/** List all personas, ordered by display_order then name (published or not). */
export async function getPersonas(): Promise<Persona[]> {
  const { data } = await supabaseAdmin
    .from("personas")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
}

/** Fetch a single persona by primary key, or null when absent. */
export async function getPersonaById(id: string): Promise<Persona | null> {
  const { data } = await supabaseAdmin
    .from("personas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Insert a new persona and return the created row. */
export async function createPersona(
  persona: PersonaInsert
): Promise<Persona> {
  const { data, error } = await supabaseAdmin
    .from("personas")
    .insert(persona)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Patch an existing persona; server-managed columns are stripped defensively
 * and `updated_at` is stamped to now (no DB trigger is assumed).
 */
export async function updatePersona(
  id: string,
  updates: PersonaUpdate
): Promise<Persona> {
  const { id: _id, ...safe } = updates;
  const { data, error } = await supabaseAdmin
    .from("personas")
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Permanently delete a persona by id. */
export async function deletePersona(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("personas")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * Upload the single shared Atlas PDF to the (private) bucket at a stable key
 * (upsert), replacing any prior version, and return a short-lived signed URL
 * so the admin who just uploaded it can immediately preview what shipped.
 * This is NOT the URL end users see - the live web app proxies the file
 * itself through a purchase-gated route (`/api/atlas/pdf` in IntualityWeb),
 * never this signed link.
 */
export async function uploadAtlasPdf(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const { error } = await supabaseAdmin.storage
    .from(PERSONA_ATLAS_BUCKET)
    .upload(ATLAS_PDF_KEY, file, {
      upsert: true,
      contentType: "application/pdf",
    });
  if (error) return { url: null, error: error.message };
  const { data, error: signError } = await supabaseAdmin.storage
    .from(PERSONA_ATLAS_BUCKET)
    .createSignedUrl(ATLAS_PDF_KEY, PREVIEW_URL_TTL_SECONDS);
  if (signError) return { url: null, error: signError.message };
  return { url: data.signedUrl, error: null };
}

/**
 * Return a short-lived signed preview URL for the shared Atlas PDF when it
 * exists, else null. Lists the bucket to confirm the object is present
 * before minting a link. Admin-preview only - see {@link uploadAtlasPdf}'s
 * doc for why this is never what an end user's browser fetches.
 */
export async function getAtlasPdfUrl(): Promise<string | null> {
  const { data: list } = await supabaseAdmin.storage
    .from(PERSONA_ATLAS_BUCKET)
    .list("", { search: ATLAS_PDF_KEY });
  const exists = (list ?? []).some((obj) => obj.name === ATLAS_PDF_KEY);
  if (!exists) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(PERSONA_ATLAS_BUCKET)
    .createSignedUrl(ATLAS_PDF_KEY, PREVIEW_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}
