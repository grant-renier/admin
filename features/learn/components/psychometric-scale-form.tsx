"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PlusCircleIcon } from "lucide-react";

export function PsychometricScaleForm() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Create Psychometric Scale</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Scale editor"
          description="Form for creating and editing psychometric scales will be wired to Supabase mutations."
          icon={<PlusCircleIcon className="size-12" />}
        />
      </CardContent>
    </Card>
  );
}
