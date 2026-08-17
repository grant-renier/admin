"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updateUserBillingBypassAction } from "@/app/dashboard/users/actions";

interface BillingBypassToggleProps {
  userId: string;
  email: string;
  bypassed: boolean;
}

/**
 * Comp-account toggle: on, the web app grants this user every add-on and
 * unlimited minutes regardless of what they've actually purchased. The
 * lever for internal-team and beta-tester accounts that should never hit
 * the paywall - see `entitlements-server.ts`'s `isBillingBypassed` in the
 * IntualityWeb repo.
 */
export function BillingBypassToggle({
  userId,
  email,
  bypassed,
}: BillingBypassToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (next: boolean) => {
    startTransition(async () => {
      try {
        await updateUserBillingBypassAction(userId, next);
        toast.success(
          next
            ? `${email} now bypasses billing`
            : `${email} bills normally again`
        );
        router.refresh();
      } catch {
        toast.error("Failed to change billing bypass");
      }
    });
  };

  return (
    <Switch
      checked={bypassed}
      onCheckedChange={handleToggle}
      disabled={isPending}
      aria-label={`Bypass billing for ${email}`}
    />
  );
}
