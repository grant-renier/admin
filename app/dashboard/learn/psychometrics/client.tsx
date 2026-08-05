"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PsychometricScalesTable, PsychometricScaleForm } from "@/features/learn";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { PsychometricScaleRow } from "@/features/learn/types";
import {
  createScaleAction,
  updateScaleAction,
  deleteScaleAction,
} from "../actions";

export function PsychometricsPageClient({
  data,
}: {
  data: PsychometricScaleRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PsychometricScaleRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (item: PsychometricScaleRow) => {
    setEditing(item);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteScaleAction(deleteId);
        toast.success("Scale deleted");
      } catch {
        toast.error("Delete failed");
      }
      setDeleteId(null);
    });
  };

  const handleSubmit = async (fd: FormData) => {
    if (editing) {
      await updateScaleAction(fd);
    } else {
      await createScaleAction(fd);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(!showForm);
          }}
        >
          <PlusIcon className="mr-1 size-4" />
          {showForm ? "Hide Form" : "New Scale"}
        </Button>
      </div>

      {showForm && (
        <PsychometricScaleForm
          // Remount when the row being edited changes. The form seeds its
          // fields from `editingItem` (uncontrolled defaultValue + useState),
          // so without a key React reuses the instance and "Edit A -> Edit B"
          // would submit A's scale under B's id, overwriting B.
          key={editing?.id ?? "new"}
          editingItem={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <PsychometricScalesTable
        data={data}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Scale"
        description="This will permanently delete this psychometric scale. Type 'delete' to confirm."
        confirmText="delete"
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </div>
  );
}
