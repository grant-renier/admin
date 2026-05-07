"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { FileTextIcon } from "lucide-react";

export function AppCopyEditor() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>App Copy Management</CardTitle>
        <CardDescription>
          Edit frontend copy strings used in the mobile app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Coming soon"
          description="App copy management will be available once a copy table is added to Supabase."
          icon={<FileTextIcon className="size-12" />}
        />
      </CardContent>
    </Card>
  );
}
