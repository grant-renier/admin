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
