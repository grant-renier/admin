/**
 * Data-access layer for the Persona Atlas feature. All reads/writes go through
 * the service-role admin client (RLS blocks client writes). Pure and
 * React-free so it can be unit-tested and reused by server actions.
 */
import { supabaseAdmin } from "@/lib/supabase/client";
import type { Persona, PersonaInsert, PersonaUpdate } from "./types";

/** Storage bucket that holds the shared Persona Atlas PDF (public read). */
export const PERSONA_ATLAS_BUCKET = "persona-atlas";

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
 * Upload the single shared Atlas PDF to the public bucket at a stable key
 * (upsert), replacing any prior version, and return its public URL.
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
  const { data } = supabaseAdmin.storage
    .from(PERSONA_ATLAS_BUCKET)
    .getPublicUrl(ATLAS_PDF_KEY);
  return { url: data.publicUrl, error: null };
}

/**
 * Return the public URL for the shared Atlas PDF when it exists, else null.
 * Lists the bucket to confirm the object is present before advertising a link.
 */
export async function getAtlasPdfUrl(): Promise<string | null> {
  const { data: list } = await supabaseAdmin.storage
    .from(PERSONA_ATLAS_BUCKET)
    .list("", { search: ATLAS_PDF_KEY });
  const exists = (list ?? []).some((obj) => obj.name === ATLAS_PDF_KEY);
  if (!exists) return null;
  const { data } = supabaseAdmin.storage
    .from(PERSONA_ATLAS_BUCKET)
    .getPublicUrl(ATLAS_PDF_KEY);
  return data.publicUrl;
}
