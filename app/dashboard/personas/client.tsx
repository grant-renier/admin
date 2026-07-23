"use client";

/**
 * Client shell for the personas dashboard: owns editor visibility, the row
 * being edited, delete confirmation and the publish toggle. Wires the
 * Zod-validated server actions to the editor/list components. Mirrors the
 * blog page client.
 */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  PersonaEditor,
  PersonaList,
  AtlasPdfUploader,
} from "@/features/personas";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { EmptyState } from "@/components/empty-state";
import { UsersRoundIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { Persona } from "@/features/personas/types";
import {
  createPersonaAction,
  updatePersonaAction,
  deletePersonaAction,
  setPersonaPublishedAction,
  type PersonaActionState,
} from "./actions";

export function PersonasPageClient({
  data,
  atlasPdfUrl,
}: {
  data: Persona[];
  atlasPdfUrl: string | null;
}) {
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Persona | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (item: Persona) => {
    setEditing(item);
    setShowEditor(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deletePersonaAction(deleteId);
        toast.success("Persona deleted");
      } catch {
        toast.error("Delete failed");
      }
      setDeleteId(null);
    });
  };

  const handleSubmit = (fd: FormData): Promise<PersonaActionState> =>
    editing ? updatePersonaAction(fd) : createPersonaAction(fd);

  const handleTogglePublish = (id: string, published: boolean) => {
    startTransition(async () => {
      try {
        await setPersonaPublishedAction(id, published);
        toast.success(published ? "Persona published" : "Persona unpublished");
      } catch {
        toast.error("Update failed");
      }
    });
  };

  const openNew = () => {
    setEditing(null);
    setShowEditor(true);
  };

  return (
    <div className="space-y-4">
      <AtlasPdfUploader currentUrl={atlasPdfUrl} />

      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (showEditor) {
              setShowEditor(false);
              setEditing(null);
            } else {
              openNew();
            }
          }}
        >
          <PlusIcon className="mr-1 size-4" />
          {showEditor ? "Hide Editor" : "New Persona"}
        </Button>
      </div>

      {showEditor && (
        <PersonaEditor
          editingItem={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowEditor(false);
            setEditing(null);
          }}
        />
      )}

      {data.length === 0 && !showEditor ? (
        <div className="rounded-lg border border-dashed border-border/60 py-4">
          <EmptyState
            icon={<UsersRoundIcon className="size-12" />}
            title="Create your first persona"
            description="Personas appear here. Define an archetype, its metrics, and publish it to the web app's Persona Atlas."
          />
          <div className="flex justify-center">
            <Button onClick={openNew}>
              <PlusIcon className="mr-1 size-4" />
              New Persona
            </Button>
          </div>
        </div>
      ) : (
        <PersonaList
          data={data}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
          onTogglePublish={handleTogglePublish}
        />
      )}

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Persona"
        description="This will permanently delete this persona. Type 'delete' to confirm."
        confirmText="delete"
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </div>
  );
}
