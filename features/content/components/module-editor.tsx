"use client";

import { useState } from "react";
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
import type { ModuleWithSubscribers } from "../types";
import { UsersIcon, MicIcon } from "lucide-react";

export function ModuleEditor({
  modules,
}: {
  modules: ModuleWithSubscribers[];
}) {
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleToggle(moduleId: string, currentActive: boolean) {
    setToggling(moduleId);
    try {
      await fetch(`/api/auth/login`, { method: "HEAD" }).catch(() => {});
      // In production this would call an API route to update the module
    } finally {
      setToggling(null);
    }
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
              <Switch
                checked={mod.is_active}
                disabled={toggling === mod.id}
                onCheckedChange={() => handleToggle(mod.id, mod.is_active)}
              />
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
    </div>
  );
}
