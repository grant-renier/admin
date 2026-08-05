import Link from "next/link";
import { GaugeIcon } from "lucide-react";

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

import { NEAR_LIMIT_THRESHOLD, formatMinutes } from "../lib/pricing";
import type { MinuteRiskUser, MinuteUsageSummary } from "../types";
import { MinutePressureBadge, UsageKindBadge } from "./billing-badges";

/**
 * Customers at or near their minute limit.
 *
 * This is the page's early-warning list: a user with no minutes left cannot
 * start an assessment, and the first anyone hears about it is usually a ticket
 * saying "the app won't let me record". Blocked users are listed first,
 * then everyone past {@link NEAR_LIMIT_THRESHOLD} of their allowance.
 *
 * @module features/billing/components/minute-risk-panel
 */

function RiskTable({ users }: { users: MinuteRiskUser[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Allowance</TableHead>
            <TableHead className="text-right">Used</TableHead>
            <TableHead className="text-right">Left</TableHead>
            <TableHead className="text-right">Pressure</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={`${user.userId}-${user.periodEnd}`}>
              <TableCell>
                <Link
                  href={`/dashboard/users/${user.userId}`}
                  className="font-medium hover:underline"
                >
                  {user.email}
                </Link>
              </TableCell>
              <TableCell>
                <UsageKindBadge kind={user.kind} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMinutes(user.allowanceMinutes)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMinutes(user.consumedMinutes)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMinutes(user.remainingMinutes)}
              </TableCell>
              <TableCell className="text-right">
                <MinutePressureBadge pctUsed={user.pctUsed} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function MinuteRiskPanel({ minutes }: { minutes: MinuteUsageSummary }) {
  const nearPct = Math.round(NEAR_LIMIT_THRESHOLD * 100);
  const nothingToShow =
    minutes.atLimit.length === 0 && minutes.nearLimit.length === 0;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GaugeIcon className="size-4" />
          Minutes at Risk
        </CardTitle>
        <CardDescription>
          Across {minutes.openPeriods} open usage periods:{" "}
          {formatMinutes(minutes.includedMinutes)} included +{" "}
          {formatMinutes(minutes.purchasedMinutes)} purchased,{" "}
          {formatMinutes(minutes.consumedMinutes)} consumed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {nothingToShow ? (
          <p className="text-sm text-muted-foreground">
            Nobody is within {100 - nearPct}% of their allowance. Every customer
            with an open period can still start an assessment.
          </p>
        ) : (
          <>
            {minutes.atLimit.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Blocked now - {minutes.atLimit.length} customer
                  {minutes.atLimit.length === 1 ? "" : "s"} out of minutes
                </p>
                <RiskTable users={minutes.atLimit} />
              </div>
            )}
            {minutes.nearLimit.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Approaching the limit - over {nearPct}% consumed
                </p>
                <RiskTable users={minutes.nearLimit} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
