import { CircleSlashIcon, PlugZapIcon, TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { StripeConnectionStatus } from "../types";

/**
 * Discloses whether the page is enriched with live Stripe data.
 *
 * The panel renders entirely from Supabase by design - `STRIPE_SECRET_KEY` is
 * optional. What is NOT acceptable is showing Supabase-only numbers while
 * implying they were reconciled against Stripe, so the state is always stated
 * explicitly rather than inferred from an absent badge.
 *
 * @module features/billing/components/stripe-connection-note
 */

export function StripeConnectionNote({
  status,
}: {
  status: StripeConnectionStatus;
}) {
  if (!status.configured) {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <CircleSlashIcon className="size-3" />
        Supabase only - STRIPE_SECRET_KEY not configured
      </Badge>
    );
  }

  if (!status.reachable) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600"
      >
        <TriangleAlertIcon className="size-3" />
        Stripe configured but unreachable - showing Supabase data
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
    >
      <PlugZapIcon className="size-3" />
      Stripe connected{status.mode === "test" ? " (test mode)" : ""}
    </Badge>
  );
}
