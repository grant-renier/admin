import { supabaseAdmin } from "@/lib/supabase/client";
import type { ModuleWithSubscribers } from "./types";

export async function getModules(): Promise<ModuleWithSubscribers[]> {
  const { data: modules } = await supabaseAdmin
    .from("modules")
    .select("*")
    .order("display_order", { ascending: true });

  if (!modules || modules.length === 0) return [];

  const moduleIds = modules.map((m) => m.id);

  const [{ data: userModules }, { data: sessions }] = await Promise.all([
    supabaseAdmin
      .from("user_modules")
      .select("module_id")
      .in("module_id", moduleIds),
    supabaseAdmin
      .from("sessions")
      .select("module_id")
      .in("module_id", moduleIds),
  ]);

  const subCounts = new Map<string, number>();
  userModules?.forEach((um) => {
    subCounts.set(um.module_id, (subCounts.get(um.module_id) ?? 0) + 1);
  });

  const sessCounts = new Map<string, number>();
  sessions?.forEach((s) => {
    if (s.module_id) {
      sessCounts.set(s.module_id, (sessCounts.get(s.module_id) ?? 0) + 1);
    }
  });

  return modules.map((m) => ({
    ...m,
    subscriberCount: subCounts.get(m.id) ?? 0,
    sessionCount: sessCounts.get(m.id) ?? 0,
  }));
}

export async function getModuleById(id: string) {
  const { data } = await supabaseAdmin
    .from("modules")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function updateModule(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    is_active: boolean;
    display_order: number;
    sample_prompts: string[];
  }>
) {
  const { data, error } = await supabaseAdmin
    .from("modules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
