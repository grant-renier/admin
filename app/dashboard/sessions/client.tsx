"use client";

import { useState, useTransition } from "react";
import { SessionsTable } from "@/features/sessions";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { toast } from "sonner";
import type { SessionWithUser } from "@/features/sessions/types";
import { deleteSessionAction } from "./actions";

/**
 * Client shell for the sessions list: renders the table with per-row delete
 * and gates the destructive action behind a typed ConfirmationDialog.
 */
export function SessionsPageClient({ data }: { data: SessionWithUser[] }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteSessionAction(deleteId);
        toast.success("Session deleted");
      } catch {
        toast.error("Delete failed");
      }
      setDeleteId(null);
    });
  };

  return (
    <>
      <SessionsTable data={data} onDelete={setDeleteId} />
      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Session"
        description="This will permanently delete this session along with its transcript, assessments, analyses, warmup and chat data. This cannot be undone."
        confirmText="delete"
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </>
  );
}
