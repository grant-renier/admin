import { supabaseAdmin } from "@/lib/supabase/client";
import {
  calculateDeepgramCost,
  calculateAIChatCost,
  calculateBridgeCost,
  estimateTokenSplit,
} from "./lib/cost-calculator";
import type {
  CostSummary,
  DailyDeepgramUsage,
  DailyAIChatUsage,
  DailyBridgeUsage,
  PerSessionCost,
} from "./types";

export async function getCostSummary(): Promise<CostSummary> {
  const [{ data: sessions }, { data: messages }] = await Promise.all([
    supabaseAdmin.from("sessions").select("duration, chunk_count"),
    supabaseAdmin.from("messages").select("token_count"),
  ]);

  const totalDuration =
    sessions?.reduce((sum, s) => sum + (s.duration ?? 0), 0) ?? 0;
  const totalChunks =
    sessions?.reduce((sum, s) => sum + (s.chunk_count ?? 0), 0) ?? 0;
  const totalTokens =
    messages?.reduce((sum, m) => sum + (m.token_count ?? 0), 0) ?? 0;

  const { input, output } = estimateTokenSplit(totalTokens);

  const deepgramTotal = calculateDeepgramCost(totalDuration);
  const aiChatTotal = calculateAIChatCost(input, output);
  const bridgeTotal = calculateBridgeCost(totalChunks);

  return {
    deepgramTotal,
    aiChatTotal,
    bridgeTotal,
    grandTotal: deepgramTotal + aiChatTotal + bridgeTotal,
  };
}

export async function getDailyDeepgramUsage(
  days = 30
): Promise<DailyDeepgramUsage[]> {
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("duration, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const grouped = new Map<
    string,
    { minutes: number; cost: number; count: number }
  >();

  sessions?.forEach((s) => {
    const date = new Date(s.created_at).toISOString().slice(0, 10);
    const existing = grouped.get(date) ?? { minutes: 0, cost: 0, count: 0 };
    const durationMin = (s.duration ?? 0) / 60;
    existing.minutes += durationMin;
    existing.cost += calculateDeepgramCost(s.duration ?? 0);
    existing.count += 1;
    grouped.set(date, existing);
  });

  return Array.from(grouped.entries()).map(([date, v]) => ({
    date,
    minutes: Math.round(v.minutes * 100) / 100,
    cost: Math.round(v.cost * 10000) / 10000,
    sessionCount: v.count,
  }));
}

export async function getDailyAIChatUsage(
  days = 30
): Promise<DailyAIChatUsage[]> {
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("token_count, role, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const grouped = new Map<
    string,
    { input: number; output: number; count: number }
  >();

  messages?.forEach((m) => {
    const date = new Date(m.created_at).toISOString().slice(0, 10);
    const existing = grouped.get(date) ?? { input: 0, output: 0, count: 0 };
    const tokens = m.token_count ?? 0;
    if (m.role === "assistant") {
      existing.output += tokens;
    } else {
      existing.input += tokens;
    }
    existing.count += 1;
    grouped.set(date, existing);
  });

  return Array.from(grouped.entries()).map(([date, v]) => ({
    date,
    inputTokens: v.input,
    outputTokens: v.output,
    cost:
      Math.round(calculateAIChatCost(v.input, v.output) * 10000) / 10000,
    messageCount: v.count,
  }));
}

export async function getDailyBridgeUsage(
  days = 30
): Promise<DailyBridgeUsage[]> {
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: assessments } = await supabaseAdmin
    .from("chunk_assessments")
    .select("session_id, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const grouped = new Map<string, { chunks: number; sessions: Set<string> }>();

  assessments?.forEach((a) => {
    const date = new Date(a.created_at).toISOString().slice(0, 10);
    const existing = grouped.get(date) ?? {
      chunks: 0,
      sessions: new Set<string>(),
    };
    existing.chunks += 1;
    existing.sessions.add(a.session_id);
    grouped.set(date, existing);
  });

  return Array.from(grouped.entries()).map(([date, v]) => ({
    date,
    chunkCount: v.chunks,
    cost: Math.round(calculateBridgeCost(v.chunks) * 10000) / 10000,
    sessionCount: v.sessions.size,
  }));
}

export async function getPerSessionCosts(): Promise<PerSessionCost[]> {
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("id, name, user_id, duration, chunk_count, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!sessions || sessions.length === 0) return [];

  const userIds = [...new Set(sessions.map((s) => s.user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p.email]) ?? []);

  const sessionIds = sessions.map((s) => s.id);
  const { data: conversations } = await supabaseAdmin
    .from("conversations")
    .select("id, session_id")
    .in("session_id", sessionIds);

  const convIds = conversations?.map((c) => c.id) ?? [];
  const { data: messages } =
    convIds.length > 0
      ? await supabaseAdmin
          .from("messages")
          .select("conversation_id, token_count")
          .in("conversation_id", convIds)
      : { data: [] };

  const convSessionMap = new Map(
    conversations?.map((c) => [c.id, c.session_id]) ?? []
  );
  const sessionTokens = new Map<string, number>();
  messages?.forEach((m) => {
    const sessionId = convSessionMap.get(m.conversation_id);
    if (sessionId) {
      sessionTokens.set(
        sessionId,
        (sessionTokens.get(sessionId) ?? 0) + (m.token_count ?? 0)
      );
    }
  });

  return sessions.map((s) => {
    const deepgramCost = calculateDeepgramCost(s.duration ?? 0);
    const bridgeCost = calculateBridgeCost(s.chunk_count ?? 0);
    const totalTokens = sessionTokens.get(s.id) ?? 0;
    const { input, output } = estimateTokenSplit(totalTokens);
    const aiChatCost = calculateAIChatCost(input, output);

    return {
      sessionId: s.id,
      sessionName: s.name,
      userEmail: profileMap.get(s.user_id) ?? "Unknown",
      deepgramCost,
      aiChatCost,
      bridgeCost,
      totalCost: deepgramCost + aiChatCost + bridgeCost,
      createdAt: s.created_at,
    };
  });
}
