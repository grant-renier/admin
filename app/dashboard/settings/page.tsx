import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsIcon, DatabaseIcon, KeyIcon, ServerIcon, PowerIcon } from "lucide-react";

import { AccessGateForm } from "@/features/config/components/access-gate-form";
import { getAccessGate } from "@/features/config/queries";

// The access gate must show the CURRENT row, not a build-time snapshot —
// this is a kill switch, stale reads are dangerous.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const gate = await getAccessGate();
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasJwtSecret = !!process.env.ADMIN_JWT_SECRET;

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <SettingsIcon className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>
                Configuration and environment status
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
              <div className="flex items-center gap-3">
                <DatabaseIcon className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Supabase URL</p>
                  <p className="text-xs text-muted-foreground">
                    NEXT_PUBLIC_SUPABASE_URL
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  hasSupabase
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }
              >
                {hasSupabase ? "Configured" : "Missing"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
              <div className="flex items-center gap-3">
                <KeyIcon className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Service Role Key</p>
                  <p className="text-xs text-muted-foreground">
                    SUPABASE_SERVICE_ROLE_KEY
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  hasServiceKey
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }
              >
                {hasServiceKey ? "Configured" : "Missing"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
              <div className="flex items-center gap-3">
                <ServerIcon className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">JWT Secret</p>
                  <p className="text-xs text-muted-foreground">
                    ADMIN_JWT_SECRET
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  hasJwtSecret
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                }
              >
                {hasJwtSecret ? "Configured" : "Dev mode (no auth)"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-destructive/15 to-destructive/5 ring-1 ring-destructive/10">
              <PowerIcon className="size-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Access Gate (version kill switch)</CardTitle>
              <CardDescription>
                Controls whether the current web version stays usable. Live
                clients poll this every minute.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AccessGateForm initial={gate} />
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Application</dt>
              <dd className="font-medium mt-1">IntualityAI Admin</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Framework</dt>
              <dd className="font-medium mt-1">Next.js 16 (App Router)</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">UI</dt>
              <dd className="font-medium mt-1">shadcn/ui + Tailwind CSS v4</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Database</dt>
              <dd className="font-medium mt-1">Supabase (PostgreSQL)</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
