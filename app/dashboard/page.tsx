import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/client";
import { MetricCard } from "@/components/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UsersIcon,
  ActivityIcon,
  MicIcon,
  ClockIcon,
  DollarSignIcon,
  AudioWaveformIcon,
  BrainCircuitIcon,
  ZapIcon,
  ArrowRightIcon,
  UserPlusIcon,
  BarChart3Icon,
} from "lucide-react";
import {
  calculateDeepgramCost,
  calculateAIChatCost,
  calculateBridgeCost,
  estimateTokenSplit,
} from "@/features/costs/lib/cost-calculator";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

async function getOverviewMetrics() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    { count: totalUsers },
    { count: usersThisWeek },
    { count: usersLastWeek },
    { count: totalSessions },
    { count: sessionsThisWeek },
    { count: sessionsLastWeek },
    { data: durationData },
    { data: messages },
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
    supabaseAdmin.from("sessions").select("duration, chunk_count"),
    supabaseAdmin.from("messages").select("token_count"),
    supabaseAdmin
      .from("sessions")
      .select("user_id")
      .gte("created_at", weekAgo.toISOString()),
  ]);

  const totalDuration =
    durationData?.reduce((sum, s) => sum + (s.duration ?? 0), 0) ?? 0;
  const totalChunks =
    durationData?.reduce((sum, s) => sum + (s.chunk_count ?? 0), 0) ?? 0;
  const totalTokens =
    messages?.reduce((sum, m) => sum + (m.token_count ?? 0), 0) ?? 0;
  const { input, output } = estimateTokenSplit(totalTokens);

  const deepgramCost = calculateDeepgramCost(totalDuration);
  const aiChatCost = calculateAIChatCost(input, output);
  const bridgeCost = calculateBridgeCost(totalChunks);

  const activeUsers = new Set(activeData?.map((s) => s.user_id)).size;

  const userGrowth =
    usersLastWeek && usersLastWeek > 0
      ? (((usersThisWeek ?? 0) - usersLastWeek) / usersLastWeek) * 100
      : 0;

  const sessionGrowth =
    sessionsLastWeek && sessionsLastWeek > 0
      ? (((sessionsThisWeek ?? 0) - sessionsLastWeek) / sessionsLastWeek) * 100
      : 0;

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers,
    userGrowth,
    totalSessions: totalSessions ?? 0,
    sessionsThisWeek: sessionsThisWeek ?? 0,
    sessionGrowth,
    totalAudioHours: Math.round((totalDuration / 3600) * 100) / 100,
    deepgramCost,
    aiChatCost,
    bridgeCost,
    totalCost: deepgramCost + aiChatCost + bridgeCost,
  };
}

async function getRecentActivity() {
  const [{ data: signups }, { data: sessions }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("sessions")
      .select("id, name, user_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  type ActivityItem = {
    type: "signup" | "session";
    id: string;
    description: string;
    timestamp: string;
  };

  const items: ActivityItem[] = [];

  signups?.forEach((u) =>
    items.push({
      type: "signup",
      id: u.id,
      description: `${u.display_name || u.email} signed up`,
      timestamp: u.created_at,
    })
  );

  sessions?.forEach((s) =>
    items.push({
      type: "session",
      id: s.id,
      description: `Session "${s.name}" (${s.status})`,
      timestamp: s.created_at,
    })
  );

  return items
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 10);
}

const ACTIVITY_STYLES = {
  signup: { color: "bg-emerald-500", icon: UserPlusIcon },
  session: { color: "bg-primary", icon: MicIcon },
};

const QUICK_LINKS = [
  {
    label: "Sessions",
    href: "/dashboard/sessions",
    icon: MicIcon,
    description: "View all sessions",
    accent: "from-primary/10 to-primary/3 hover:border-primary/30",
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: UsersIcon,
    description: "Manage users",
    accent: "from-blue-500/10 to-blue-500/3 hover:border-blue-500/30",
  },
  {
    label: "Costs",
    href: "/dashboard/costs",
    icon: DollarSignIcon,
    description: "Cost analysis",
    accent: "from-amber-500/10 to-amber-500/3 hover:border-amber-500/30",
  },
  {
    label: "Templates",
    href: "/dashboard/templates",
    icon: BarChart3Icon,
    description: "Metric templates",
    accent: "from-emerald-500/10 to-emerald-500/3 hover:border-emerald-500/30",
  },
];

export default async function DashboardPage() {
  const [metrics, activity] = await Promise.all([
    getOverviewMetrics(),
    getRecentActivity(),
  ]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <Link href="/dashboard/users">
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers}
            change={metrics.userGrowth !== 0 ? metrics.userGrowth : undefined}
            subtitle="All registered"
            icon={UsersIcon}
            accent="primary"
            compact
          />
        </Link>
        <Link href="/dashboard/users">
          <MetricCard
            title="Active (7d)"
            value={metrics.activeUsers}
            subtitle="Users with sessions"
            icon={ActivityIcon}
            accent="emerald"
            compact
          />
        </Link>
        <Link href="/dashboard/sessions">
          <MetricCard
            title="Total Sessions"
            value={metrics.totalSessions}
            change={
              metrics.sessionGrowth !== 0 ? metrics.sessionGrowth : undefined
            }
            subtitle={`${metrics.sessionsThisWeek} this week`}
            icon={MicIcon}
            accent="blue"
            compact
          />
        </Link>
        <MetricCard
          title="Audio Hours"
          value={metrics.totalAudioHours}
          subtitle="All time recorded"
          icon={ClockIcon}
          accent="amber"
          compact
        />
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <Link href="/dashboard/costs">
          <MetricCard
            title="Total Cost"
            value={`$${metrics.totalCost.toFixed(2)}`}
            icon={DollarSignIcon}
            accent="rose"
            compact
          />
        </Link>
        <Link href="/dashboard/costs/deepgram">
          <MetricCard
            title="Deepgram"
            value={`$${metrics.deepgramCost.toFixed(2)}`}
            subtitle="Speech-to-text"
            icon={AudioWaveformIcon}
            accent="blue"
            compact
          />
        </Link>
        <Link href="/dashboard/costs/ai-chat">
          <MetricCard
            title="AI Chat"
            value={`$${metrics.aiChatCost.toFixed(2)}`}
            subtitle="OpenRouter LLM"
            icon={BrainCircuitIcon}
            accent="amber"
            compact
          />
        </Link>
        <Link href="/dashboard/costs/bridge">
          <MetricCard
            title="Bridge"
            value={`$${metrics.bridgeCost.toFixed(2)}`}
            subtitle="Gemini scoring"
            icon={ZapIcon}
            accent="emerald"
            compact
          />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card
              className={`group/link relative overflow-hidden border-border/50 bg-gradient-to-br ${link.accent} transition-all duration-300 hover:shadow-md cursor-pointer`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/link:opacity-100 pointer-events-none" />
              <CardContent className="relative flex items-center gap-3 py-3 px-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border/50">
                  <link.icon className="size-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {link.description}
                  </p>
                </div>
                <ArrowRightIcon className="size-4 text-muted-foreground/40 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:text-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="px-4 lg:px-6">
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 card-glow">
          <CardHeader className="relative">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest events across the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-1">
              {activity.map((item) => {
                const style = ACTIVITY_STYLES[item.type];
                const ItemIcon = style.icon;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
                  >
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${style.color}/15`}
                    >
                      <ItemIcon
                        className={`size-3.5 ${style.color.replace("bg-", "text-")}`}
                      />
                    </div>
                    <span className="flex-1 text-sm truncate">
                      {item.description}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {new Date(item.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
              {activity.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
