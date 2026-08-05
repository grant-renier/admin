import { TriangleAlertIcon } from "lucide-react";

import type { BridgeHealthPayload, LiveSessionLoad } from "../types";

/** Coloured callout used for both capacity warnings. */
function Alert({
  severity,
  children,
}: {
  severity: "warn" | "critical";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
        severity === "critical"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500"
      }`}
    >
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

interface CapacityAlertsProps {
  load: LiveSessionLoad;
  /** Bridge `/health` payload, or null when the bridge is unreachable. */
  bridge: BridgeHealthPayload | null;
  /** Live-session count at which the warning (not the critical) alert fires. */
  warnAt: number;
}

/**
 * Visible warnings when live sessions approach or pass the engine's
 * serialized capacity, plus the stuck-lock signature.
 *
 * Renders nothing when there is nothing to warn about - a permanent banner
 * that is usually green trains operators to ignore it.
 */
export function CapacityAlerts({ load, bridge, warnAt }: CapacityAlertsProps) {
  const atCeiling = load.concurrent >= load.ceiling;
  const approaching = !atCeiling && load.concurrent >= warnAt;
  // Queued work with an idle engine is the signature of a stuck global lock,
  // not of ordinary backlog.
  const stuckLock = bridge !== null && bridge.queueDepth > 0 && !bridge.engineRunning;

  if (!atCeiling && !approaching && !stuckLock) return null;

  return (
    <div className="space-y-2">
      {atCeiling && (
        <Alert severity="critical">
          {load.concurrent} concurrent live sessions is at or past the estimated
          ceiling of {load.ceiling}. Chunks will queue behind the global engine
          lock and scores will arrive late.
        </Alert>
      )}
      {approaching && (
        <Alert severity="warn">
          {load.concurrent} concurrent live sessions is approaching the
          estimated ceiling of {load.ceiling}. Watch bridge queue depth - it
          climbs first.
        </Alert>
      )}
      {stuckLock && bridge && (
        <Alert severity="critical">
          {bridge.queueDepth} chunk(s) are queued but the engine reports idle.
          That combination is the signature of a stuck global engine lock, not
          of normal backlog.
        </Alert>
      )}
    </div>
  );
}
