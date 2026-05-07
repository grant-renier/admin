import type { Database } from "@/types/supabase";

export type EducationalContentRow =
  Database["public"]["Tables"]["educational_content"]["Row"];
export type PsychometricScaleRow =
  Database["public"]["Tables"]["psychometric_scales"]["Row"];

export interface BlogEntry {
  id: string;
  title: string;
  description: string | null;
  type: "article";
  content_body: string | null;
  is_published: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}
