"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { refreshBillingAction } from "@/app/dashboard/billing/actions";

/**
 * Re-reads the billing page from Supabase.
 *
 * Operationally this matters after replaying a failed Stripe event: the
 * operator needs to see it clear without wondering whether they are looking at
 * a cached render.
 *
 * @module features/billing/components/refresh-billing-button
 */
export function RefreshBillingButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        await refreshBillingAction();
        router.refresh();
        toast.success("Billing data refreshed");
      } catch {
        toast.error("Could not refresh billing data");
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className="gap-2"
    >
      <RefreshCwIcon className={`size-4 ${isPending ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}
