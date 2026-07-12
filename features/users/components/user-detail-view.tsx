import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/metric-card";
import {
  MicIcon,
  MessageSquareIcon,
  FolderIcon,
  ClockIcon,
} from "lucide-react";
import type { UserDetail } from "../types";
import Link from "next/link";
import { formatCategoryLabel } from "@/lib/utils";

export function UserDetailView({ user }: { user: UserDetail }) {
  const totalMins = user.sessions.reduce(
    (sum, s) => sum + (s.duration ?? 0),
    0
  );

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {user.display_name || "Unnamed User"}
          </h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{user.role}</Badge>
          {user.onboarded ? (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
            >
              Onboarded
            </Badge>
          ) : (
            <Badge variant="outline">Not onboarded</Badge>
          )}
          <Badge variant="outline">
            {user.subscriptionPlan ?? "Free"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
        <MetricCard
          title="Sessions"
          value={user.sessions.length}
          icon={MicIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Audio Time"
          value={`${Math.round(totalMins / 60)} min`}
          icon={ClockIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="Projects"
          value={user.projectCount}
          icon={FolderIcon}
          accent="emerald"
          compact
        />
        <MetricCard
          title="Messages"
          value={user.totalMessages}
          icon={MessageSquareIcon}
          accent="amber"
          compact
        />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>
            Last {user.sessions.length} sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {user.sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MicIcon className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.module_slug
                          ? formatCategoryLabel(s.module_slug)
                          : "No category"}{" "}
                        &middot;{" "}
                        {Math.round(s.duration / 60)} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        s.status === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : ""
                      }
                    >
                      {s.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="font-mono text-xs mt-1">{user.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Joined</dt>
              <dd className="mt-1">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="mt-1">
                {new Date(user.updated_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Subscription</dt>
              <dd className="mt-1">
                {user.subscriptionPlan ?? "Free"}{" "}
                {user.subscriptionStatus && `(${user.subscriptionStatus})`}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
