import type { Database } from "@/types/supabase";

export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
export type TranscriptSegmentRow =
  Database["public"]["Tables"]["transcript_segments"]["Row"];

export interface SessionWithUser extends SessionRow {
  user_email: string;
  user_display_name: string;
}

export interface SessionDetail extends SessionRow {
  user_email: string;
  user_display_name: string;
  segments: TranscriptSegmentRow[];
  conversation_count: number;
  message_count: number;
  total_tokens: number;
}
