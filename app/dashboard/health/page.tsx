import { requireAdmin } from "@/lib/require-admin";
import {
  CapacityPanel,
  LatencyHistoryChart,
  QueueDepthChart,
  RecentFailuresTable,
  RunChecksButton,
  ServiceStatusCards,
  UptimeSummary,
} from "@/features/health";
import { formatTimestamp } from "@/features/health/lib/format";
import {
  getHealthHistory,
  getHealthSnapshot,
  getLiveSessionLoad,
  getRecentFailures,
  getUptimeStats,
} from "@/features/health/queries";

// A status page that renders a build-time snapshot is worse than no status
// page. Every load re-probes.
export const dynamic = "force-dynamic";

/**
 * Service uptime and health.
 *
 * Shows a live probe of every dependency, the engine-capacity picture the
 * owner is sizing against, and measured history from `service_health_checks`.
 * Nothing on this page is a hardcoded or assumed availability figure: a
 * window with no recorded checks says so.
 */
export default async function HealthPage() {
  // Defense in depth. Middleware already redirects anonymous visitors, but
  // rendering this page triggers authenticated outbound probes and writes
  // rows with the service-role key - so the render itself fails closed if
  // middleware is ever bypassed or its matcher stops covering this path.
  await requireAdmin();

  // The snapshot runs the probes; everything else is independent reads, so
  // none of them wait on the network round trips.
  const [snapshot, load, uptime, history, failures] = await Promise.all([
    getHealthSnapshot(),
    getLiveSessionLoad(),
    getUptimeStats(),
    getHealthHistory(),
    getRecentFailures(),
  ]);

  const bridge =
    snapshot.services.find((s) => s.service === "bridge") ?? snapshot.services[0];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h2 className="text-lg font-semibold">Service health</h2>
          <p className="text-xs text-muted-foreground">
            Probed live at {formatTimestamp(snapshot.checkedAt)} ·{" "}
            {snapshot.recorded
              ? "recorded to history"
              : "not recorded (a round was already stored within the last minute)"}
          </p>
        </div>
        <RunChecksButton />
      </div>

      <div className="px-4 lg:px-6">
        <CapacityPanel load={load} bridge={bridge} />
      </div>

      <div className="px-4 lg:px-6">
        <ServiceStatusCards services={snapshot.services} />
      </div>

      <div className="px-4 lg:px-6">
        <QueueDepthChart data={history.queueDepth} ceiling={load.ceiling} />
      </div>

      <div className="px-4 lg:px-6">
        <LatencyHistoryChart
          data={history.latency}
          sampleCount={history.sampleCount}
          truncated={history.truncated}
        />
      </div>

      <div className="px-4 lg:px-6">
        <UptimeSummary stats={uptime} services={snapshot.services} />
      </div>

      <div className="px-4 lg:px-6">
        <RecentFailuresTable failures={failures} />
      </div>
    </>
  );
}
