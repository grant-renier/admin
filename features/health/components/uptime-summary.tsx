import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatUptimePct } from "../lib/format";
import type {
  MonitoredService,
  ServiceStatusView,
  UptimeStat,
  UptimeWindowStat,
} from "../types";

interface UptimeSummaryProps {
  stats: UptimeStat[];
  /** Current probe results, used to tell "not configured" from "no data". */
  services: ServiceStatusView[];
}

/** Colours a measured percentage; unmeasured windows stay muted. */
function pctClass(pct: number | null): string {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 99) return "text-emerald-600";
  if (pct >= 95) return "text-amber-600";
  return "text-destructive";
}

/** One window cell: the measured percentage plus its sample size. */
function WindowCell({
  window,
  unconfigured,
}: {
  window: UptimeWindowStat;
  unconfigured: boolean;
}) {
  if (window.total === 0) {
    return (
      <TableCell className="text-right text-xs text-muted-foreground">
        {unconfigured ? "Not configured" : "No checks recorded"}
      </TableCell>
    );
  }
  return (
    <TableCell className="text-right">
      <span className={`font-medium tabular-nums ${pctClass(window.pct)}`}>
        {formatUptimePct(window.pct)}
      </span>
      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
        {window.up}/{window.total} checks
      </span>
    </TableCell>
  );
}

/**
 * Measured availability per service.
 *
 * The percentage is `up / recorded checks` in the window and the sample size
 * is always shown beside it, because "100% over 3 checks" and "100% over
 * 1,400 checks" are very different claims. A window with no samples renders
 * as "No checks recorded" - never as a placeholder number.
 */
export function UptimeSummary({ stats, services }: UptimeSummaryProps) {
  const unconfigured = new Set<MonitoredService>(
    services.filter((s) => s.status === "not_configured").map((s) => s.service)
  );

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Measured availability</CardTitle>
        <CardDescription>
          Share of recorded checks reporting `up`. Computed only from rows in
          `service_health_checks` - history begins the first time this page was
          opened, so early windows are thin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Last 24h</TableHead>
              <TableHead className="text-right">Last 7d</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((stat) => (
              <TableRow key={stat.service}>
                <TableCell className="font-medium">{stat.label}</TableCell>
                <WindowCell
                  window={stat.last24h}
                  unconfigured={unconfigured.has(stat.service)}
                />
                <WindowCell
                  window={stat.last7d}
                  unconfigured={unconfigured.has(stat.service)}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
