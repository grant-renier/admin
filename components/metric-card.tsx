import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AccentColor = "primary" | "blue" | "emerald" | "amber" | "rose" | "default";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: AccentColor;
  compact?: boolean;
}

const accentStyles: Record<
  AccentColor,
  { card: string; icon: string; iconColor: string }
> = {
  primary: {
    card: "hover:border-primary/30 bg-gradient-to-br from-card via-card to-primary/5",
    icon: "bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10",
    iconColor: "text-primary",
  },
  blue: {
    card: "hover:border-blue-500/30 bg-gradient-to-br from-card via-card to-blue-500/5",
    icon: "bg-gradient-to-br from-blue-500/15 to-blue-500/5 ring-1 ring-blue-500/10",
    iconColor: "text-blue-500",
  },
  emerald: {
    card: "hover:border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5",
    icon: "bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 ring-1 ring-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  amber: {
    card: "hover:border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5",
    icon: "bg-gradient-to-br from-amber-500/15 to-amber-500/5 ring-1 ring-amber-500/10",
    iconColor: "text-amber-500",
  },
  rose: {
    card: "hover:border-rose-500/30 bg-gradient-to-br from-card via-card to-rose-500/5",
    icon: "bg-gradient-to-br from-rose-500/15 to-rose-500/5 ring-1 ring-rose-500/10",
    iconColor: "text-rose-500",
  },
  default: {
    card: "hover:border-primary/20",
    icon: "bg-muted",
    iconColor: "text-muted-foreground",
  },
};

export function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  accent = "default",
  compact = false,
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const TrendIcon = isPositive
    ? TrendingUpIcon
    : isNegative
      ? TrendingDownIcon
      : MinusIcon;
  const styles = accentStyles[accent];

  return (
    <Card
      className={`@container/card group/metric relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg card-glow ${styles.card} ${compact ? "p-3" : ""}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 transition-opacity duration-300 group-hover/metric:opacity-100 pointer-events-none" />

      <CardHeader className={`relative ${compact ? "p-0" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardDescription>{title}</CardDescription>
            <CardTitle
              className={`font-bold tabular-nums ${compact ? "text-xl" : "text-2xl @[250px]/card:text-3xl"}`}
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </CardTitle>
          </div>
          {Icon && (
            <div
              className={`flex shrink-0 items-center justify-center rounded-lg ${styles.icon} ${compact ? "size-8" : "size-10"}`}
            >
              <Icon
                className={`${compact ? "size-4" : "size-5"} ${styles.iconColor}`}
              />
            </div>
          )}
        </div>
        {change !== undefined && (
          <div className="absolute top-0 right-0">
            <Badge
              variant="outline"
              className={
                isPositive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : isNegative
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : ""
              }
            >
              <TrendIcon className="size-3" />
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}%
            </Badge>
          </div>
        )}
      </CardHeader>
      {subtitle && (
        <CardFooter
          className={`flex-col items-start gap-1.5 text-sm relative ${compact ? "p-0 pt-1" : ""}`}
        >
          <div
            className={`text-muted-foreground ${compact ? "text-xs" : ""}`}
          >
            {subtitle}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
