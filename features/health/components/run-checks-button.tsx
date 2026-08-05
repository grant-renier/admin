"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { runHealthChecksAction } from "@/app/dashboard/health/actions";

/**
 * Forces an immediate probe round and records it.
 *
 * The page already probes on every render; this exists so an operator can
 * take a deliberate, persisted sample while watching an incident - and so
 * the history table gets a data point at a moment of their choosing.
 *
 * Authorization lives in the action (`requireAdmin`), not here: a client
 * component is never a security boundary.
 */
export function RunChecksButton() {
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      try {
        const summary = await runHealthChecksAction();
        const problems = summary.down + summary.degraded;
        if (problems === 0) {
          toast.success(
            `All ${summary.up} probed service(s) reporting up${
              summary.notConfigured > 0
                ? ` · ${summary.notConfigured} not configured`
                : ""
            }`
          );
        } else {
          toast.error(
            `${summary.down} down · ${summary.degraded} degraded · ${summary.up} up`
          );
        }
      } catch {
        toast.error("Could not run checks - is your admin session still valid?");
      }
    });
  };

  return (
    <Button onClick={run} disabled={isPending} variant="outline">
      <RefreshCwIcon className={`size-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Running checks…" : "Run checks now"}
    </Button>
  );
}
