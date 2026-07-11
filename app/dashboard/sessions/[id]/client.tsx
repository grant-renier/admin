"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSessionAction } from "../actions";

/**
 * Destructive delete control for the session detail page. Confirms via the
 * shared ConfirmationDialog, then deletes the session and all child data and
 * redirects back to the sessions list.
 */
export function SessionDeleteButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const confirmDelete = () => {
    startTransition(async () => {
      try {
        await deleteSessionAction(sessionId);
        toast.success("Session deleted");
        router.push("/dashboard/sessions");
      } catch {
        toast.error("Delete failed");
        setOpen(false);
      }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Delete Session
      </Button>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Session"
        description="This will permanently delete this session along with its transcript, assessments, analyses, warmup and chat data. This cannot be undone."
        confirmText="delete"
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </>
  );
}
