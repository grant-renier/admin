import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OnboardingStep } from "../types";

export function OnboardingFunnel({ steps }: { steps: OnboardingStep[] }) {
  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3">
      <CardHeader>
        <CardTitle>Onboarding Funnel</CardTitle>
        <CardDescription>User activation stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={step.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {step.count} ({step.pct}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    step.pct >= 70
                      ? "bg-primary"
                      : step.pct >= 30
                        ? "bg-primary/60"
                        : "bg-destructive/60"
                  }`}
                  style={{ width: `${step.pct}%` }}
                />
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground">
                    {steps[i + 1].count > 0
                      ? `${Math.round((steps[i + 1].count / step.count) * 100)}% conversion`
                      : "0% conversion"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
