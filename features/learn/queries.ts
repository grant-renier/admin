import { supabaseAdmin } from "@/lib/supabase/client";
import type { EducationalContentRow, PsychometricScaleRow } from "./types";

export async function getEducationalContent(): Promise<
  EducationalContentRow[]
> {
  const { data } = await supabaseAdmin
    .from("educational_content")
    .select("*")
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function getEducationalContentById(id: string) {
  const { data } = await supabaseAdmin
    .from("educational_content")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function createEducationalContent(
  content: Omit<EducationalContentRow, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabaseAdmin
    .from("educational_content")
    .insert(content)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEducationalContent(
  id: string,
  updates: Partial<EducationalContentRow>
) {
  const { id: _id, created_at: _ca, updated_at: _ua, ...safe } = updates;
  const { data, error } = await supabaseAdmin
    .from("educational_content")
    .update(safe)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEducationalContent(id: string) {
  const { error } = await supabaseAdmin
    .from("educational_content")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getPsychometricScales(): Promise<
  PsychometricScaleRow[]
> {
  const { data } = await supabaseAdmin
    .from("psychometric_scales")
    .select("*")
    .order("category", { ascending: true });
  return data ?? [];
}

export async function createPsychometricScale(
  scale: Omit<PsychometricScaleRow, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabaseAdmin
    .from("psychometric_scales")
    .insert(scale)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePsychometricScale(
  id: string,
  updates: Partial<PsychometricScaleRow>
) {
  const { id: _id, created_at: _ca, updated_at: _ua, ...safe } = updates;
  const { data, error } = await supabaseAdmin
    .from("psychometric_scales")
    .update(safe)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePsychometricScale(id: string) {
  const { error } = await supabaseAdmin
    .from("psychometric_scales")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getBlogArticles(): Promise<EducationalContentRow[]> {
  const { data } = await supabaseAdmin
    .from("educational_content")
    .select("*")
    .eq("type", "article")
    .order("created_at", { ascending: false });
  return data ?? [];
}
