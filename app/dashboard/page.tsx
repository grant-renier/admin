import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/client";
import { MetricCard } from "@/components/metric-card";
import { CostEstimateNote } from "@/components/cost-estimate-note";
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
  RadioIcon,
  PlugZapIcon,
  WebhookIcon,
  ScaleIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  calculateDeepgramCost,
  calculateAIChatCost,
  calculateBridgeCost,
  estimateTokenSplit,
} from "@/features/costs/lib/cost-calculator";
// Imported from each feature's `queries.ts` rather than its barrel, matching
// every other route in this app. The barrels re-export "use client"
// components, and queries.ts pulls in the `server-only` service-role client --
// routing these through the barrel would put that client on a path a client
// component can import.
import { getHealthSnapshot } from "@/features/health/queries";
import { getWebhookHealth } from "@/features/billing/queries";
import { getLegalDocuments } from "@/features/legal/queries";
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

  // With single-digit weekly counts a week-over-week percentage is noise
  // (2 -> 1 sessions reads as an alarming -50%), so flag the badge to
  // render neutrally until there is enough volume to trend.
  const GROWTH_SAMPLE_FLOOR = 5;
  const userGrowthSparse =
    (usersThisWeek ?? 0) < GROWTH_SAMPLE_FLOOR ||
    (usersLastWeek ?? 0) < GROWTH_SAMPLE_FLOOR;
  const sessionGrowthSparse =
    (sessionsThisWeek ?? 0) < GROWTH_SAMPLE_FLOOR ||
    (sessionsLastWeek ?? 0) < GROWTH_SAMPLE_FLOOR;

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers,
    userGrowth,
    userGrowthSparse,
    totalSessions: totalSessions ?? 0,
    sessionsThisWeek: sessionsThisWeek ?? 0,
    sessionGrowth,
    sessionGrowthSparse,
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

/* -------------------------------------------------------------------------
 * Operational snapshot
 *
 * Four at-a-glance tiles that link into the Sessions, Health, Billing and
 * Legal sections. Each tile is resolved independently and every failure --
 * a thrown query, a missing table, a feature module that changed its return
 * shape -- degrades that one tile to "Unavailable". An operations console
 * that 500s because one subsystem is down is worse than useless, since a
 * subsystem being down is exactly when it gets opened.
 * ---------------------------------------------------------------------- */

/** Visual severity of an ops tile. `muted` covers both idle and unavailable. */
type OpsTone = "ok" | "warn" | "bad" | "muted";

interface OpsTile {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  tone: OpsTone;
}

/** A session left in `recording` this long is stuck, not live. */
const STALE_SESSION_MS = 2 * 60 * 60 * 1000;
/** A health row older than this means the checker itself stopped reporting. */
const STALE_HEALTH_MS = 15 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Container keys a feature query might wrap its list in. */
const LIST_CONTAINER_KEYS = [
  "services",
  "documents",
  "docs",
  "items",
  "rows",
  "data",
];

/**
 * Coerces an unknown feature-query result into a list of records, accepting a
 * bare array, a snapshot object wrapping one (`{ services: [...] }`), or an
 * object keyed by id/slug. The health, billing and legal modules are owned by
 * other feature teams; reading them structurally means a shape change there
 * costs one tile rather than the whole page.
 */
function toRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  for (const key of LIST_CONTAINER_KEYS) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested.filter(isRecord);
  }
  // Arrays are excluded here: a bare array value would be a nested list we
  // already failed to recognise, not a single entity.
  return Object.values(value).filter(
    (v): v is Record<string, unknown> => isRecord(v) && !Array.isArray(v)
  );
}

/** Narrows a nested property to a record, for reading `{ webhooks: {...} }`. */
function readRecord(
  source: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  if (!source) return null;
  const value = source[key];
  return isRecord(value) && !Array.isArray(value) ? value : null;
}

/** First key that holds a string. Tries aliases so casing changes survive. */
function readString(
  source: Record<string, unknown> | null,
  ...keys: string[]
): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** First key that holds a finite number. */
function readNumber(
  source: Record<string, unknown> | null,
  ...keys: string[]
): number | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

/** First key that holds a boolean. */
function readBoolean(
  source: Record<string, unknown> | null,
  ...keys: string[]
): boolean | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

/** Compact age label ("4m ago") for a timestamp, or null if unparseable. */
function formatAge(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** The degraded form of a tile: readable, linked, and honest about why. */
function unavailableTile(
  base: Pick<OpsTile, "label" | "href" | "icon">,
  reason: string
): OpsTile {
  return { ...base, value: "Unavailable", detail: reason, tone: "muted" };
}

/**
 * Resolves a tile, converting any thrown error into an "Unavailable" tile.
 * Errors are logged so a silently degraded tile is still traceable in the
 * server logs.
 */
async function resolveTile(
  base: Pick<OpsTile, "label" | "href" | "icon">,
  load: () => Promise<OpsTile>
): Promise<OpsTile> {
  try {
    return await load();
  } catch (error) {
    console.error(`[dashboard] ops tile "${base.label}" failed`, error);
    return unavailableTile(base, "Could not be read");
  }
}

/** Sessions still open (recording or paused) right now. */
async function getLiveSessionsTile(): Promise<OpsTile> {
  const base = {
    label: "Live Sessions",
    href: "/dashboard/sessions",
    icon: RadioIcon,
  };
  return resolveTile(base, async () => {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("status, updated_at")
      .in("status", ["recording", "paused"]);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const recording = rows.filter((r) => r.status === "recording").length;
    const paused = rows.length - recording;
    const staleCutoff = Date.now() - STALE_SESSION_MS;
    const stale = rows.filter(
      (r) => new Date(r.updated_at).getTime() < staleCutoff
    ).length;

    return {
      ...base,
      value: String(rows.length),
      detail:
        rows.length === 0
          ? "Nothing in progress"
          : stale > 0
            ? `${recording} recording · ${stale} idle >2h`
            : `${recording} recording · ${paused} paused`,
      // A session stuck open never bills or finalises, so surface it as a
      // warning rather than counting it as healthy activity.
      tone: stale > 0 ? "warn" : rows.length > 0 ? "ok" : "muted",
    };
  });
}

/** Latest recorded status of the IntualityAI bridge. */
async function getBridgeStatusTile(): Promise<OpsTile> {
  const base = {
    label: "Bridge Status",
    href: "/dashboard/health",
    icon: PlugZapIcon,
  };
  return resolveTile(base, async () => {
    // getHealthSnapshot() probes the dependencies live (each bounded by a 4s
    // timeout, all in parallel) and rate limits its own history writes, so
    // this reads current truth without polluting the uptime denominators.
    const services = toRecords(await getHealthSnapshot());
    const bridge = services.find(
      (s) => readString(s, "service", "name", "key") === "bridge"
    );
    if (!bridge) return unavailableTile(base, "No bridge check recorded");

    const status = readString(bridge, "status", "state");
    if (!status) return unavailableTile(base, "Check has no status");

    const latency = readNumber(bridge, "latency_ms", "latencyMs");
    const checkedAt = readString(bridge, "checked_at", "checkedAt");
    const age = formatAge(checkedAt);
    const stale =
      checkedAt !== null &&
      Date.now() - new Date(checkedAt).getTime() > STALE_HEALTH_MS;

    const tone: OpsTone =
      status === "up"
        ? stale
          ? "warn"
          : "ok"
        : status === "degraded"
          ? "warn"
          : status === "down"
            ? "bad"
            : "muted";

    const parts = [
      latency !== null ? `${Math.round(latency)} ms` : null,
      age ? `checked ${age}` : null,
      // Guards the day this snapshot is served from recorded history rather
      // than a live probe: an "up" reading nobody refreshed in 15 minutes is
      // not evidence the bridge is up, only that the checker stopped running.
      stale ? "check is stale" : null,
    ].filter((p): p is string => p !== null);

    // Probe statuses use snake_case ("not_configured"); render them as words.
    const words = status.replace(/_/g, " ");

    return {
      ...base,
      value: words.charAt(0).toUpperCase() + words.slice(1),
      detail: parts.length > 0 ? parts.join(" · ") : "Last recorded check",
      tone,
    };
  });
}

/**
 * Stripe webhook deliveries that errored -- over the last 24h when the
 * billing summary reports a windowed count, otherwise overall.
 */
async function getFailedWebhooksTile(): Promise<OpsTile> {
  const base = {
    label: "Failed Webhooks",
    href: "/dashboard/billing",
    icon: WebhookIcon,
  };
  return resolveTile(base, async () => {
    const summary = await getWebhookHealth();
    const record = isRecord(summary) ? summary : null;
    // Tolerates the count sitting at the top level or nested under a
    // `webhooks` key, in case the billing summary is later widened.
    const nested = readRecord(record, "webhooks");

    // Only a key that names the window proves the count is windowed. Falling
    // back to a lifetime failure count means dropping the "last 24h" claim
    // rather than asserting a window that was never applied.
    const windowed = readNumber(
      record,
      "failedWebhooks24h",
      "failed_webhooks_24h",
      "webhookFailures24h"
    );
    const overall =
      readNumber(record, "failedCount", "failed_count", "failedWebhooks") ??
      readNumber(nested, "failedCount", "failed_count", "failedWebhooks");
    const failed = windowed ?? overall;
    if (failed === null) {
      return unavailableTile(base, "Not reported by billing summary");
    }

    const pending =
      readNumber(record, "pendingCount", "pending_count") ??
      readNumber(nested, "pendingCount", "pending_count");
    const scope = windowed !== null ? "Last 24h" : "All time";

    return {
      ...base,
      value: String(failed),
      detail:
        failed > 0
          ? `${scope} · charged, not applied`
          : pending !== null && pending > 0
            ? `${scope} · ${pending} still pending`
            : `${scope} · all processed`,
      // A failed webhook means Stripe took money this system never applied,
      // so it is never merely a warning.
      tone: failed > 0 ? "bad" : "ok",
    };
  });
}

/** Legal documents whose current edit is not live for end users yet. */
async function getLegalDraftsTile(): Promise<OpsTile> {
  const base = {
    label: "Legal Drafts",
    href: "/dashboard/legal",
    icon: ScaleIcon,
  };
  return resolveTile(base, async () => {
    const docs = toRecords(await getLegalDocuments());
    if (docs.length === 0) return unavailableTile(base, "No documents found");

    const drafts = docs.filter((doc) => {
      // Either an explicit "has unpublished changes" flag from the feature
      // module, or -- failing that -- a row that simply is not published.
      const pending = readBoolean(
        doc,
        "hasUnpublishedChanges",
        "has_unpublished_changes"
      );
      if (pending !== null) return pending;
      return readBoolean(doc, "published", "isPublished") === false;
    });

    const slugs = drafts
      .map((doc) => readString(doc, "slug", "title"))
      .filter((s): s is string => s !== null);

    return {
      ...base,
      value: String(drafts.length),
      detail:
        drafts.length === 0
          ? `All ${docs.length} published`
          : slugs.length > 0
            ? slugs.join(", ")
            : "Unpublished changes",
      tone: drafts.length === 0 ? "ok" : "warn",
    };
  });
}

const OPS_TONE_STYLES: Record<OpsTone, { dot: string; icon: string; card: string }> = {
  ok: {
    dot: "bg-emerald-500",
    icon: "text-emerald-500 bg-emerald-500/10",
    card: "hover:border-emerald-500/30",
  },
  warn: {
    dot: "bg-amber-500",
    icon: "text-amber-500 bg-amber-500/10",
    card: "hover:border-amber-500/30",
  },
  bad: {
    dot: "bg-rose-500",
    icon: "text-rose-500 bg-rose-500/10",
    card: "hover:border-rose-500/30",
  },
  muted: {
    dot: "bg-muted-foreground/40",
    icon: "text-muted-foreground bg-muted",
    card: "hover:border-primary/20",
  },
};

/** One operational status tile, linking into its owning section. */
function OpsStatusTile({ tile }: { tile: OpsTile }) {
  const styles = OPS_TONE_STYLES[tile.tone];
  return (
    <Link href={tile.href}>
      <Card
        className={`group/ops relative h-full overflow-hidden border-border/50 py-3 transition-all duration-300 hover:shadow-md ${styles.card}`}
      >
        <CardContent className="flex items-center gap-3 px-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
          >
            <tile.icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`size-1.5 shrink-0 rounded-full ${styles.dot}`}
                aria-hidden
              />
              <p className="text-xs text-muted-foreground truncate">
                {tile.label}
              </p>
            </div>
            <p className="text-lg font-bold tabular-nums leading-tight truncate">
              {tile.value}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {tile.detail}
            </p>
          </div>
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover/ops:translate-x-0.5 group-hover/ops:text-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
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
  // Every ops tile resolves to a value or to "Unavailable" -- none of them
  // reject -- so this Promise.all cannot fail the page.
  const [metrics, activity, opsTiles] = await Promise.all([
    getOverviewMetrics(),
    getRecentActivity(),
    Promise.all([
      getLiveSessionsTile(),
      getBridgeStatusTile(),
      getFailedWebhooksTile(),
      getLegalDraftsTile(),
    ]),
  ]);

  return (
    <>
      <div className="px-4 lg:px-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Operational Status
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4 -mt-3">
        {opsTiles.map((tile) => (
          <OpsStatusTile key={tile.label} tile={tile} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <Link href="/dashboard/users">
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers}
            change={metrics.userGrowth !== 0 ? metrics.userGrowth : undefined}
            changeNeutral={metrics.userGrowthSparse}
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
            changeNeutral={metrics.sessionGrowthSparse}
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
            title="Total Cost (Estimated)"
            value={`$${metrics.totalCost.toFixed(2)}`}
            subtitle="All providers combined"
            icon={DollarSignIcon}
            accent="rose"
            compact
          />
        </Link>
        <Link href="/dashboard/costs/deepgram">
          <MetricCard
            title="Deepgram (Estimated)"
            value={`$${metrics.deepgramCost.toFixed(2)}`}
            subtitle="Speech-to-text"
            icon={AudioWaveformIcon}
            accent="blue"
            compact
          />
        </Link>
        <Link href="/dashboard/costs/ai-chat">
          <MetricCard
            title="AI Chat (Estimated)"
            value={`$${metrics.aiChatCost.toFixed(2)}`}
            subtitle="OpenRouter LLM"
            icon={BrainCircuitIcon}
            accent="amber"
            compact
          />
        </Link>
        <Link href="/dashboard/costs/bridge">
          <MetricCard
            title="Bridge (Estimated)"
            value={`$${metrics.bridgeCost.toFixed(2)}`}
            subtitle="LLM scoring (OpenRouter)"
            icon={ZapIcon}
            accent="emerald"
            compact
          />
        </Link>
      </div>
      <div className="px-4 lg:px-6 -mt-1">
        <CostEstimateNote />
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
