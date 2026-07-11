"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BlogList, BlogEditor } from "@/features/learn";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { EducationalContentRow } from "@/features/learn/types";
import {
  createContentAction,
  updateContentAction,
  deleteContentAction,
} from "../actions";

export function BlogsPageClient({
  data,
}: {
  data: EducationalContentRow[];
}) {
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<EducationalContentRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (item: EducationalContentRow) => {
    setEditing(item);
    setShowEditor(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteContentAction(deleteId);
        toast.success("Article deleted");
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
            setShowEditor(!showEditor);
          }}
        >
          <PlusIcon className="mr-1 size-4" />
          {showEditor ? "Hide Editor" : "New Article"}
        </Button>
      </div>

      {showEditor && (
        <BlogEditor
          editingItem={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowEditor(false);
            setEditing(null);
          }}
        />
      )}

      <BlogList data={data} onEdit={handleEdit} onDelete={handleDelete} />

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Article"
        description="This will permanently delete this blog article. Type 'delete' to confirm."
        confirmText="delete"
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </div>
  );
}
