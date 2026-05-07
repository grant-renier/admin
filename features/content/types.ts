import type { Database } from "@/types/supabase";

export type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];

export interface ModuleWithSubscribers extends ModuleRow {
  subscriberCount: number;
  sessionCount: number;
}

export interface AppCopyEntry {
  key: string;
  value: string;
  section: string;
}
