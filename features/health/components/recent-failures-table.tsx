import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheckIcon } from "lucide-react";

import { formatAgo, formatLatency, formatTimestamp } from "../lib/format";
import type { FailureRow } from "../types";
import { StatusBadge } from "./status-badge";

/**
 * The most recent recorded checks that did not report `up`, with the detail
 * the probe captured at the time - which is usually the whole diagnosis
 * (HTTP status, timeout, stuck engine lock, rejected API key).
 */
export function RecentFailuresTable({ failures }: { failures: FailureRow[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Recent failures</CardTitle>
        <CardDescription>
          Every recorded check that came back degraded or down, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {failures.length === 0 ? (
          <EmptyState
            title="No recorded failures"
            description="Every check in the history table reported up."
            icon={<ShieldCheckIcon className="size-12" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map((failure) => (
                  <TableRow key={failure.id}>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium">
                        {formatAgo(failure.checkedAt)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatTimestamp(failure.checkedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {failure.service}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={failure.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatLatency(failure.latencyMs)}
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground break-words">
                      {failure.detail}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
