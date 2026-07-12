import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCategoryLabel } from "@/lib/utils";
import type { TemplateWithUsage } from "../types";

export function TemplatePreview({
  template,
}: {
  template: TemplateWithUsage;
}) {
  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>
              {template.description ?? "No description"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {template.is_system && (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary"
              >
                System
              </Badge>
            )}
            <Badge variant="outline">
              {template.module_slug
                ? formatCategoryLabel(template.module_slug)
                : "Global"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            Metrics ({template.metrics.length})
          </h4>
          <div className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
            {template.metrics.map((m) => (
              <div
                key={m.key}
                className="rounded-lg border border-border/50 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{m.label}</span>
                  <code className="text-xs text-muted-foreground font-mono">
                    {m.key}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Used in {template.projectCount} project(s)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
