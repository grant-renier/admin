"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PlusCircleIcon } from "lucide-react";

export function TemplateForm() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Create Template</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Template builder"
          description="Form for creating metric templates with dynamic metric fields."
          icon={<PlusCircleIcon className="size-12" />}
        />
      </CardContent>
    </Card>
  );
}
