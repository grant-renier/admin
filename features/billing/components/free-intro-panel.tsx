import { SparklesIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  FREE_INTRO_DAYS,
  FREE_INTRO_MINUTES,
  formatMinutes,
} from "../lib/pricing";
import type { FreeIntroSummary } from "../types";

/**
 * The invite-led free introduction and how much of it turns into paid.
 *
 * "Converted" means the user holds a live paid subscription item *today* - an
 * operational read for support, not a cohort study. Someone who paid for a
 * month and churned counts as lapsed here, which is deliberately the pessimistic
 * reading.
 *
 * @module features/billing/components/free-intro-panel
 */

export function FreeIntroPanel({ summary }: { summary: FreeIntroSummary }) {
  const convertedPct = Math.min(100, Math.max(0, summary.conversionPct));

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-4" />
          Free Introduction
        </CardTitle>
        <CardDescription>
          {formatMinutes(FREE_INTRO_MINUTES)} over a {FREE_INTRO_DAYS}-day
          window, one per customer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">Ever offered</p>
            <p className="text-2xl font-bold tabular-nums">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">Converted to paid</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">
              {summary.converted}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Conversion</span>
            <span className="font-medium tabular-nums">
              {convertedPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${convertedPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Windows still open</span>
          <span className="tabular-nums">{summary.stillOpen}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Lapsed without subscribing
          </span>
          <span className="tabular-nums">{summary.lapsed}</span>
        </div>
      </CardContent>
    </Card>
  );
}
