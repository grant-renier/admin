import { supabaseAdmin } from "@/lib/supabase/client";
import type { SessionWithUser, SessionDetail } from "./types";

export async function getSessions(): Promise<SessionWithUser[]> {
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (!sessions || sessions.length === 0) return [];

  const userIds = [...new Set(sessions.map((s) => s.user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return sessions.map((s) => {
    const profile = profileMap.get(s.user_id);
    return {
      ...s,
      user_email: profile?.email ?? "Unknown",
      user_display_name: profile?.display_name ?? "Unknown",
    };
  });
}

export async function getSessionById(
  id: string
): Promise<SessionDetail | null> {
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) return null;

  const [
    { data: profile },
    { data: segments },
    { count: conversationCount },
    messagesData,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", session.user_id)
      .single(),
    supabaseAdmin
      .from("transcript_segments")
      .select("*")
      .eq("session_id", id)
      .order("start_time", { ascending: true }),
    supabaseAdmin
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("session_id", id),
    supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("session_id", id)
      .then(async (convResult) => {
        if (!convResult.data || convResult.data.length === 0) {
          return { messageCount: 0, totalTokens: 0 };
        }
        const convIds = convResult.data.map((c) => c.id);
        const { data: msgs } = await supabaseAdmin
          .from("messages")
          .select("token_count")
          .in("conversation_id", convIds);
        return {
          messageCount: msgs?.length ?? 0,
          totalTokens:
            msgs?.reduce((sum, m) => sum + (m.token_count ?? 0), 0) ?? 0,
        };
      }),
  ]);

  return {
    ...session,
    user_email: profile?.email ?? "Unknown",
    user_display_name: profile?.display_name ?? "Unknown",
    segments: segments ?? [],
    conversation_count: conversationCount ?? 0,
    message_count: messagesData.messageCount,
    total_tokens: messagesData.totalTokens,
  };
}

/**
 * Child tables that hold per-session rows keyed by `session_id`. Deleted
 * before the parent `sessions` row because the shared schema does not
 * guarantee ON DELETE CASCADE on these foreign keys.
 */
const SESSION_CHILD_TABLES = [
  "transcript_segments",
  "chunk_assessments",
  "session_final_analyses",
  "session_deep_analyses",
  "session_warmups",
  "session_bias_profiles",
] as const;

/**
 * True when a PostgREST error means the relation simply is not present in
 * this environment (42P01 = undefined_table, PGRST205 = table not in schema
 * cache). Some child tables only exist in newer deployments, so a missing
 * table must not abort the delete.
 */
function isMissingTableError(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/**
 * Permanently deletes a session and all of its child data (transcript
 * segments, chunk assessments, analyses, warmups, bias profiles, chat
 * conversations and their messages). Throws on any real database error;
 * missing child tables are tolerated.
 */
export async function deleteSession(id: string): Promise<void> {
  // Messages hang off conversations, not the session, so resolve the
  // conversation ids first and delete bottom-up.
  const { data: conversations, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("session_id", id);
  if (convError && !isMissingTableError(convError)) throw convError;

  const convIds = conversations?.map((c) => c.id) ?? [];
  if (convIds.length > 0) {
    const { error } = await supabaseAdmin
      .from("messages")
      .delete()
      .in("conversation_id", convIds);
    if (error && !isMissingTableError(error)) throw error;
    const { error: delConvError } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("session_id", id);
    if (delConvError && !isMissingTableError(delConvError)) throw delConvError;
  }

  for (const table of SESSION_CHILD_TABLES) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("session_id", id);
    if (error && !isMissingTableError(error)) throw error;
  }

  const { error } = await supabaseAdmin.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function getSessionStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    { count: totalSessions },
    { count: sessionsThisWeek },
    { count: sessionsLastWeek },
    { data: durationData },
  ] = await Promise.all([
    supabaseAdmin
      .from("sessions")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString()),
    supabaseAdmin
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twoWeeksAgo.toISOString())
      .lt("created_at", weekAgo.toISOString()),
    supabaseAdmin.from("sessions").select("duration"),
  ]);

  const totalAudioSeconds =
    durationData?.reduce((sum, s) => sum + (s.duration ?? 0), 0) ?? 0;

  return {
    totalSessions: totalSessions ?? 0,
    sessionsThisWeek: sessionsThisWeek ?? 0,
    sessionsLastWeek: sessionsLastWeek ?? 0,
    totalAudioHours: Math.round((totalAudioSeconds / 3600) * 100) / 100,
  };
}
