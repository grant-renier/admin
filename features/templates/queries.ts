import { supabaseAdmin } from "@/lib/supabase/client";
import type { TemplateWithUsage } from "./types";

export async function getTemplates(): Promise<TemplateWithUsage[]> {
  const { data: templates } = await supabaseAdmin
    .from("metric_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (!templates || templates.length === 0) return [];

  const templateIds = templates.map((t) => t.id);
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("template_id")
    .in("template_id", templateIds);

  const usageCounts = new Map<string, number>();
  projects?.forEach((p) => {
    usageCounts.set(
      p.template_id,
      (usageCounts.get(p.template_id) ?? 0) + 1
    );
  });

  return templates.map((t) => ({
    ...t,
    projectCount: usageCounts.get(t.id) ?? 0,
  }));
}

export async function getTemplateById(id: string) {
  const { data } = await supabaseAdmin
    .from("metric_templates")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function createTemplate(
  template: Omit<
    TemplateWithUsage,
    "id" | "created_at" | "updated_at" | "projectCount"
  >
) {
  const { data, error } = await supabaseAdmin
    .from("metric_templates")
    .insert(template)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplate(
  id: string,
  updates: Partial<{
    name: string;
    description: string | null;
    metrics: Array<{ key: string; label: string; description: string }>;
    module_slug: string | null;
  }>
) {
  const { data, error } = await supabaseAdmin
    .from("metric_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabaseAdmin
    .from("metric_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
