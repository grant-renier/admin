"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TemplatesTable, TemplateForm } from "@/features/templates";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { TemplateWithUsage } from "@/features/templates/types";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "./actions";

/**
 * Client shell for the Templates page: toggles the create/edit form,
 * routes table actions to server actions, and gates deletes behind a
 * typed ConfirmationDialog (templates are shared with the live apps).
 */
export function TemplatesPageClient({ data }: { data: TemplateWithUsage[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TemplateWithUsage | null>(null);
  const [deleting, setDeleting] = useState<TemplateWithUsage | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (item: TemplateWithUsage) => {
    setEditing(item);
    setShowForm(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      try {
        await deleteTemplateAction(deleting.id);
        toast.success("Template deleted");
      } catch {
        toast.error("Delete failed");
      }
      setDeleting(null);
    });
  };

  const handleSubmit = async (fd: FormData) => {
    if (editing) {
      await updateTemplateAction(fd);
    } else {
      await createTemplateAction(fd);
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
          {showForm ? "Hide Form" : "New Template"}
        </Button>
      </div>

      {showForm && (
        <TemplateForm
          // Remount when switching between create and edit so field
          // defaults reflect the selected template.
          key={editing?.id ?? "new"}
          editingItem={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <TemplatesTable data={data} onEdit={handleEdit} onDelete={setDeleting} />

      <ConfirmationDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Template"
        description={
          deleting && deleting.projectCount > 0
            ? `"${deleting.name}" is used by ${deleting.projectCount} project(s) in the live apps. Deleting it may break those projects.`
            : `This will permanently delete "${deleting?.name ?? "this template"}" for the web and mobile apps.`
        }
        confirmText="delete"
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </div>
  );
}
