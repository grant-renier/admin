"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateAccessGateAction } from "@/app/dashboard/settings/actions";
import type { AccessGateConfig, AccessGateMode } from "../types";

const MODE_DESCRIPTIONS: Record<AccessGateMode, string> = {
  open: "Everyone can use the app. Normal operation.",
  paid_only:
    "KILL SWITCH: retires this free version — regular users see the upgrade screen; profiles with role admin/beta keep access.",
  maintenance: "Everyone (including the team) sees the maintenance screen.",
};

/**
 * Access-gate editor for the settings page. Writes reach live web
 * clients within ~60s (they poll app_config).
 */
export function AccessGateForm({ initial }: { initial: AccessGateConfig }) {
  const [mode, setMode] = useState<AccessGateMode>(initial.mode);
  const [registrations, setRegistrations] = useState(
    initial.registrations_enabled
  );
  const [message, setMessage] = useState(initial.message ?? "");
  const [upgradeUrl, setUpgradeUrl] = useState(initial.upgrade_url ?? "");
  const [entitlementsEnforced, setEntitlementsEnforced] = useState(
    initial.entitlements_enforced
  );
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("mode", mode);
        fd.set("registrations_enabled", String(registrations));
        fd.set("message", message);
        fd.set("upgrade_url", upgradeUrl);
        fd.set("entitlements_enforced", String(entitlementsEnforced));
        await updateAccessGateAction(fd);
        toast.success("Access gate saved — live clients update within a minute");
      } catch {
        toast.error("Save failed — is migration 0004_app_config applied?");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gate-mode">Gate mode</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as AccessGateMode)}>
          <SelectTrigger id="gate-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="paid_only">Paid only (retire free version)</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{MODE_DESCRIPTIONS[mode]}</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
        <div>
          <p className="text-sm font-medium">New registrations</p>
          <p className="text-xs text-muted-foreground">
            Off hides the sign-up tab on the login page.
          </p>
        </div>
        <Switch checked={registrations} onCheckedChange={setRegistrations} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
        <div>
          <p className="text-sm font-medium">
            Enforce entitlements (paywall gating)
          </p>
          <p className="text-xs text-muted-foreground">
            On activates the web client&apos;s add-on locks, hour ceilings, and
            category access checks. Off (default) keeps everything unlocked.
          </p>
        </div>
        <Switch
          checked={entitlementsEnforced}
          onCheckedChange={setEntitlementsEnforced}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gate-message">Message (optional)</Label>
        <Textarea
          id="gate-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Shown on the upgrade/maintenance screen and the closed-signup notice."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gate-upgrade-url">Upgrade URL (optional)</Label>
        <Input
          id="gate-upgrade-url"
          value={upgradeUrl}
          onChange={(e) => setUpgradeUrl(e.target.value)}
          placeholder="https://… (CTA target on the upgrade screen)"
        />
      </div>

      <Button onClick={save} disabled={isPending}>
        {isPending ? "Saving…" : "Save access gate"}
      </Button>
    </div>
  );
}
