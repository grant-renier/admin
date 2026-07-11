import { supabaseAdmin } from "@/lib/supabase/client";
import type {
  UserWithStats,
  UserDetail,
  OnboardingStep,
  UserRole,
} from "./types";

export async function getUsers(): Promise<UserWithStats[]> {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (!profiles || profiles.length === 0) return [];

  const userIds = profiles.map((p) => p.id);

  const [{ data: sessions }, { data: subscriptions }] = await Promise.all([
    supabaseAdmin
      .from("sessions")
      .select("user_id, duration, created_at")
      .in("user_id", userIds),
    supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan")
      .in("user_id", userIds)
      .eq("status", "active"),
  ]);

  const sessionStats = new Map<
    string,
    { count: number; totalDuration: number; lastAt: string | null }
  >();
  sessions?.forEach((s) => {
    const existing = sessionStats.get(s.user_id) ?? {
      count: 0,
      totalDuration: 0,
      lastAt: null,
    };
    existing.count += 1;
    existing.totalDuration += s.duration ?? 0;
    if (!existing.lastAt || s.created_at > existing.lastAt) {
      existing.lastAt = s.created_at;
    }
    sessionStats.set(s.user_id, existing);
  });

  const subMap = new Map(subscriptions?.map((s) => [s.user_id, s.plan]) ?? []);

  return profiles.map((p) => {
    const stats = sessionStats.get(p.id);
    return {
      ...p,
      sessionCount: stats?.count ?? 0,
      totalDuration: stats?.totalDuration ?? 0,
      lastSessionAt: stats?.lastAt ?? null,
      subscriptionPlan: subMap.get(p.id) ?? null,
    };
  });
}

export async function getUserById(id: string): Promise<UserDetail | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) return null;

  const [
    { data: sessions },
    { data: subscription },
    { count: projectCount },
    messagesData,
    authUserResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("sessions")
      .select("id, name, status, duration, created_at, module_slug")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabaseAdmin
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id),
    supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("user_id", id)
      .then(async (convResult) => {
        if (!convResult.data || convResult.data.length === 0) return 0;
        const { count } = await supabaseAdmin
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in(
            "conversation_id",
            convResult.data.map((c) => c.id)
          );
        return count ?? 0;
      }),
    // Banned state lives on the GoTrue auth record, not the profiles row.
    supabaseAdmin.auth.admin.getUserById(id),
  ]);

  return {
    ...profile,
    sessions: sessions ?? [],
    subscriptionPlan: subscription?.plan ?? null,
    subscriptionStatus: subscription?.status ?? null,
    projectCount: projectCount ?? 0,
    totalMessages: messagesData,
    bannedUntil: authUserResult.data.user?.banned_until ?? null,
  };
}

/**
 * Sets the profile role for a user. Roles `admin` and `beta` are exempt
 * from the web app's access-gate kill switch, so this is the lever the
 * team uses to keep its own accounts working after a beta cutover.
 */
export async function updateUserRole(
  id: string,
  role: UserRole
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role })
    .eq("id", id);
  if (error) throw new Error(`Failed to update role: ${error.message}`);
}

/**
 * Permanently deletes a user's auth account and profile row.
 *
 * The `profiles.id -> auth.users.id` FK cascade could not be verified from
 * local DDL (the schema predates this repo's migrations), so the profile
 * row is deleted explicitly as a safety net -- a no-op when the FK already
 * cascades. Sessions, projects, and conversation data are intentionally
 * left in place so historical analytics keep working; they become orphaned
 * rows keyed by the deleted user id unless their own FKs cascade.
 */
export async function deleteUserAccount(id: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new Error(`Failed to delete auth user: ${error.message}`);

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", id);
  if (profileError) {
    throw new Error(
      `Auth user deleted but profile cleanup failed: ${profileError.message}`
    );
  }
}

/**
 * Bans or unbans a user at the auth layer. GoTrue has no permanent-ban
 * flag, so banning sets ban_duration to ~100 years; unbanning passes the
 * sentinel value "none".
 */
export async function setUserBanned(
  id: string,
  banned: boolean
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: banned ? "876600h" : "none",
  });
  if (error) {
    throw new Error(
      `Failed to ${banned ? "ban" : "unban"} user: ${error.message}`
    );
  }
}

export async function getUserStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    { count: totalUsers },
    { count: usersThisWeek },
    { count: usersLastWeek },
    { data: activeData },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString()),
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twoWeeksAgo.toISOString())
      .lt("created_at", weekAgo.toISOString()),
    supabaseAdmin
      .from("sessions")
      .select("user_id")
      .gte("created_at", weekAgo.toISOString()),
  ]);

  const activeUsers = new Set(activeData?.map((s) => s.user_id)).size;

  return {
    totalUsers: totalUsers ?? 0,
    usersThisWeek: usersThisWeek ?? 0,
    usersLastWeek: usersLastWeek ?? 0,
    activeUsers,
  };
}

export async function getOnboardingFunnel(): Promise<OnboardingStep[]> {
  const [
    { count: signedUp },
    { count: onboarded },
    { data: sessionUsers },
    { data: conversationUsers },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("onboarded", true),
    supabaseAdmin.from("sessions").select("user_id"),
    supabaseAdmin.from("conversations").select("user_id"),
  ]);

  const total = signedUp ?? 1;
  const sessionUserCount = new Set(sessionUsers?.map((s) => s.user_id)).size;
  const chatUserCount = new Set(
    conversationUsers?.map((c) => c.user_id)
  ).size;

  return [
    { label: "Signed Up", count: signedUp ?? 0, pct: 100 },
    {
      label: "Onboarded",
      count: onboarded ?? 0,
      pct: Math.round(((onboarded ?? 0) / total) * 100),
    },
    {
      label: "First Session",
      count: sessionUserCount,
      pct: Math.round((sessionUserCount / total) * 100),
    },
    {
      label: "Used AI Chat",
      count: chatUserCount,
      pct: Math.round((chatUserCount / total) * 100),
    },
  ];
}
