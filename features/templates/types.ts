import type { Database } from "@/types/supabase";

export type MetricTemplateRow =
  Database["public"]["Tables"]["metric_templates"]["Row"];

export interface TemplateWithUsage extends MetricTemplateRow {
  projectCount: number;
}
