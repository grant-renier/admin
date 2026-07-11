"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EducationalList, EducationalForm } from "@/features/learn";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { EducationalContentRow } from "@/features/learn/types";
import {
  createContentAction,
  updateContentAction,
  deleteContentAction,
} from "../actions";

export function EducationalPageClient({
  data,
}: {
  data: EducationalContentRow[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EducationalContentRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (item: EducationalContentRow) => {
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
        await deleteContentAction(deleteId);
        toast.success("Content deleted");
      } catch {
        toast.error("Delete failed");
      }
      setDeleteId(null);
    });
  };

  const handleSubmit = async (fd: FormData) => {
    if (editing) {
      await updateContentAction(fd);
    } else {
      await createContentAction(fd);
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
          {showForm ? "Hide Form" : "New Content"}
        </Button>
      </div>

      {showForm && (
        <EducationalForm
          editingItem={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <EducationalList
        data={data}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Content"
        description="This will permanently delete this educational content. Type 'delete' to confirm."
        confirmText="delete"
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </div>
  );
}
