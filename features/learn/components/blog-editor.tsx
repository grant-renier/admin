"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PenToolIcon } from "lucide-react";

export function BlogEditor() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Blog Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Rich text editor"
          description="Markdown/rich text editor for blog articles will be integrated here."
          icon={<PenToolIcon className="size-12" />}
        />
      </CardContent>
    </Card>
  );
}
