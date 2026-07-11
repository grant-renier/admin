"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { ModuleWithSubscribers } from "../types";
import { UsersIcon, MicIcon, PencilIcon } from "lucide-react";
import { toggleModuleAction } from "@/app/dashboard/content/actions";
import { ModuleEditDialog } from "./module-edit-dialog";

/**
 * Grid of module cards with a live is_active toggle (optimistic, persisted
 * through a server action) and an edit dialog for description and prompts.
 */
export function ModuleEditor({
  modules,
}: {
  modules: ModuleWithSubscribers[];
}) {
  // Optimistic overrides keyed by module id; the server value wins again
  // once revalidatePath refreshes the page data.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<ModuleWithSubscribers | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(mod: ModuleWithSubscribers) {
    const next = !(overrides[mod.id] ?? mod.is_active);
    setOverrides((prev) => ({ ...prev, [mod.id]: next }));
    startTransition(async () => {
      try {
        await toggleModuleAction(mod.id, next);
        toast.success(`${mod.name} ${next ? "activated" : "deactivated"}`);
      } catch {
        // Roll back the optimistic flip so the UI matches the database.
        setOverrides((prev) => ({ ...prev, [mod.id]: !next }));
        toast.error(`Failed to update ${mod.name}`);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
      {modules.map((mod) => (
        <Card
          key={mod.id}
          className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all hover:shadow-md"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-lg text-white text-lg"
                  style={{ backgroundColor: mod.primary_color }}
                >
                  {mod.icon_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-base">{mod.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {mod.slug} &middot; {mod.bridge_key}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(mod)}
                  aria-label={`Edit ${mod.name}`}
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Switch
                  checked={overrides[mod.id] ?? mod.is_active}
                  onCheckedChange={() => handleToggle(mod)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {mod.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UsersIcon className="size-3" />
                {mod.subscriberCount} subscribers
              </span>
              <span className="flex items-center gap-1">
                <MicIcon className="size-3" />
                {mod.sessionCount} sessions
              </span>
              <Badge variant="outline" className="text-xs">
                Order: {mod.display_order}
              </Badge>
            </div>
            {mod.metrics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {mod.metrics.map((m) => (
                  <Badge key={m.key} variant="outline" className="text-xs">
                    {m.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <ModuleEditDialog
        module={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
