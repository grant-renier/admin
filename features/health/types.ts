/**
 * Types for the service uptime / health monitoring feature.
 *
 * Everything here mirrors the live `service_health_checks` table. That table
 * is NOT present in `types/supabase.ts` (a shared file owned outside this
 * feature), so the minimal schema slice this feature needs is declared here
 * and the shared client is cast to it in `queries.ts`. Delete
 * `HealthDatabase` once the table lands in `types/supabase.ts`.
 */

/** Services accepted by the `service_health_checks.service` CHECK constraint. */
export type HealthService =
  | "web"
  | "bridge"
  | "engine"
  | "supabase"
  | "stripe"
  | "deepgram";

/** Statuses accepted by the `service_health_checks.status` CHECK constraint. */
export type HealthStatus = "up" | "degraded" | "down";

/**
 * The subset of services this page actually probes.
 *
 * `engine` and `deepgram` are deliberately absent: we have no direct probe
 * for either. Engine liveness is reported *by* the bridge (`engineRunning` /
 * `lastEngineRun`) and is surfaced on the bridge card rather than
 * synthesised into a row that would look like an independent measurement.
 */
export const MONITORED_SERVICES = [
  "bridge",
  "supabase",
  "stripe",
  "web",
] as const;

export type MonitoredService = (typeof MONITORED_SERVICES)[number];

/** Human labels for the status cards, in probe order. */
export const SERVICE_LABELS: Record<MonitoredService, string> = {
  bridge: "Bridge (FastAPI → .NET engine)",
  supabase: "Supabase (Postgres)",
  stripe: "Stripe API",
  web: "Web app",
};

/**
 * A probe result can also be "not configured".
 *
 * This is deliberately NOT a `HealthStatus`: the DB CHECK constraint rejects
 * it, and - more importantly - an optional dependency with no credentials in
 * this environment is not an outage. Reporting it as `down` would poison
 * every uptime percentage on the page.
 */
export type ProbeStatus = HealthStatus | "not_configured";

/** Free-form probe payload persisted into `service_health_checks.detail`. */
export type ProbeDetail = Record<string, unknown>;

/** Body returned by the bridge's `GET /health`. */
export interface BridgeHealthPayload {
  status: string;
  queueDepth: number;
  uptime: string;
  lastEngineRun: string | null;
  engineRunning: boolean;
  bridgeVersion: string;
}

/** One dependency probe, before it is written to the database. */
export interface ProbeOutcome {
  service: MonitoredService;
  status: ProbeStatus;
  /** Round-trip milliseconds, or null when the probe never left the process. */
  latencyMs: number | null;
  detail: ProbeDetail;
}

/**
 * A persisted row of `service_health_checks`.
 *
 * Declared as a type alias, not an interface, on purpose: `HealthDatabase`
 * below must satisfy supabase-js's `GenericSchema`, whose `Row` is
 * `Record<string, unknown>` - and only type aliases get TypeScript's
 * implicit index signature. An interface here makes every query resolve to
 * `never`.
 */
export type ServiceHealthCheckRow = {
  id: string;
  service: HealthService;
  status: HealthStatus;
  latency_ms: number | null;
  detail: ProbeDetail | null;
  checked_at: string;
};

/** What a status card renders. */
export interface ServiceStatusView extends ProbeOutcome {
  label: string;
  checkedAt: string;
}

/** Result of one probe round plus whether it was persisted. */
export interface HealthSnapshot {
  services: ServiceStatusView[];
  /** ISO timestamp the probes in `services` were taken. */
  checkedAt: string;
  /** True when this round was written to `service_health_checks`. */
  recorded: boolean;
}

/**
 * Measured availability for one service. `pct` is null when nothing has been
 * recorded in the window - the page renders "no data", never a placeholder
 * number.
 */
export interface UptimeWindowStat {
  total: number;
  up: number;
  /** Percentage of recorded checks that reported `up`, or null with no data. */
  pct: number | null;
}

export interface UptimeStat {
  service: MonitoredService;
  label: string;
  last24h: UptimeWindowStat;
  last7d: UptimeWindowStat;
}

/** One hourly bucket of the latency chart; values are null when unsampled. */
export interface LatencyPoint {
  bucket: string;
  bridge: number | null;
  supabase: number | null;
  stripe: number | null;
  web: number | null;
}

/** One hourly bucket of bridge queue depth. */
export interface QueueDepthPoint {
  bucket: string;
  avgQueueDepth: number;
  maxQueueDepth: number;
}

/** Both chart series, derived from one read of the history table. */
export interface HealthHistory {
  latency: LatencyPoint[];
  queueDepth: QueueDepthPoint[];
  /** Rows the series were built from - shown so a thin sample stays legible. */
  sampleCount: number;
  /** True when the window held more rows than one PostgREST page returns. */
  truncated: boolean;
}

/** A non-`up` check surfaced in the recent-failures list. */
export interface FailureRow {
  id: string;
  service: HealthService;
  status: HealthStatus;
  latencyMs: number | null;
  checkedAt: string;
  /** Pre-flattened, human-readable reason pulled out of `detail`. */
  detail: string;
}

/**
 * Current live-session load against the engine's serialized capacity.
 *
 * The .NET engine processes one chunk at a time behind a global lock, so
 * sustained capacity is roughly (chunk window / engine seconds per chunk).
 */
export interface LiveSessionLoad {
  /** Sessions currently in `status = 'recording'`. */
  concurrent: number;
  /** Estimated sustained ceiling - see CONCURRENT_SESSION_CEILING. */
  ceiling: number;
  /** Concurrent / ceiling, uncapped so overload reads > 1. */
  ratio: number;
}

/* ------------------------------------------------------------------ */
/*  Capacity model                                                     */
/* ------------------------------------------------------------------ */

/** Transcript chunk window the web and mobile clients post on, in seconds. */
export const CHUNK_WINDOW_SECONDS = 15;

/**
 * Wall-clock seconds one 15s chunk occupies the .NET engine.
 *
 * ESTIMATE, not a measurement - the engine does not report per-chunk timing
 * today. It is the one number on this page that is not measured, which is
 * why it is named, commented, and shown to the operator as an estimate
 * rather than folded silently into a "capacity" figure. Replace it with real
 * timing the moment the bridge exposes it.
 */
export const ENGINE_SECONDS_PER_CHUNK_ESTIMATE = 3.5;

/**
 * Sustained concurrent live sessions the engine can keep up with (~4).
 *
 * Every live session posts one chunk per CHUNK_WINDOW_SECONDS, and the
 * engine is serialized behind a single global lock, so throughput is
 * chunk-window / engine-seconds-per-chunk. Past this, queue depth grows
 * without bound and scores arrive late.
 */
export const CONCURRENT_SESSION_CEILING = Math.floor(
  CHUNK_WINDOW_SECONDS / ENGINE_SECONDS_PER_CHUNK_ESTIMATE
);

/** Fraction of the ceiling at which the UI starts warning (75%). */
export const CAPACITY_WARN_RATIO = 0.75;

/* ------------------------------------------------------------------ */
/*  Local schema slice                                                 */
/* ------------------------------------------------------------------ */

/**
 * The one table this feature reads and writes, shaped like the shared
 * `Database` interface so `SupabaseClient<HealthDatabase>` type-checks.
 */
export interface HealthDatabase {
  public: {
    Tables: {
      service_health_checks: {
        Row: ServiceHealthCheckRow;
        Insert: {
          service: HealthService;
          status: HealthStatus;
          latency_ms?: number | null;
          detail?: ProbeDetail | null;
          checked_at?: string;
        };
        Update: Partial<
          HealthDatabase["public"]["Tables"]["service_health_checks"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
