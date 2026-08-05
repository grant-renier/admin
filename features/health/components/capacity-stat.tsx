import type { LucideIcon } from "lucide-react";

export interface CapacityStatProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  /** Escalates the value's colour without changing the layout. */
  tone?: "default" | "warn" | "critical";
}

const TONE_CLASS: Record<NonNullable<CapacityStatProps["tone"]>, string> = {
  default: "text-foreground",
  warn: "text-amber-600",
  critical: "text-destructive",
};

/** One labelled figure inside the capacity panel. */
export function CapacityStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: CapacityStatProps) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${TONE_CLASS[tone]}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
