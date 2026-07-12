"use client";

import { useRef, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ModuleWithSubscribers } from "../types";
import { updateModuleDetailsAction } from "@/app/dashboard/content/actions";

/**
 * Dialog for editing a module's description and sample prompts. Kept
 * intentionally narrow: identity fields (slug, bridge_key, colors) are
 * shared with the live apps and stay read-only in the admin.
 */
export function ModuleEditDialog({
  module: mod,
  onOpenChange,
}: {
  module: ModuleWithSubscribers | null;
  onOpenChange: (open: boolean) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mod) return;
    const fd = new FormData(formRef.current!);
    fd.set("id", mod.id);

    startTransition(async () => {
      try {
        await updateModuleDetailsAction(fd);
        toast.success("Category updated");
        onOpenChange(false);
      } catch (err) {
        toast.error(
          `Update failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    });
  };

  return (
    <Dialog open={!!mod} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {mod?.name}</DialogTitle>
          <DialogDescription>
            Description and sample prompts are shown to users in the web and
            mobile apps.
          </DialogDescription>
        </DialogHeader>
        {mod && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-4"
            key={mod.id}
          >
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={mod.description}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample_prompts">
                Sample prompts (one per line)
              </Label>
              <Textarea
                id="sample_prompts"
                name="sample_prompts"
                rows={4}
                defaultValue={mod.sample_prompts.join("\n")}
                className="font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
