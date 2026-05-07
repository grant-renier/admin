"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PlusCircleIcon } from "lucide-react";

export function EducationalForm() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Create Educational Content</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Content editor"
          description="Form for creating and editing educational content will be wired to Supabase mutations."
          icon={<PlusCircleIcon className="size-12" />}
        />
      </CardContent>
    </Card>
  );
}
