import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2Icon,
  CircleSlashIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react";

import type { ProbeStatus } from "../types";

const STATUS_STYLES: Record<
  ProbeStatus,
  { label: string; className: string; icon: typeof CheckCircle2Icon }
> = {
  up: {
    label: "Up",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    icon: CheckCircle2Icon,
  },
  degraded: {
    label: "Degraded",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    icon: TriangleAlertIcon,
  },
  down: {
    label: "Down",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircleIcon,
  },
  // Deliberately neutral: an optional dependency with no credentials in this
  // environment is not an outage and must not read like one.
  not_configured: {
    label: "Not configured",
    className: "text-muted-foreground",
    icon: CircleSlashIcon,
  },
};

/** Status pill shared by the service cards, uptime table and failures list. */
export function StatusBadge({ status }: { status: ProbeStatus }) {
  const { label, className, icon: Icon } = STATUS_STYLES[status];
  return (
    <Badge variant="outline" className={className}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
