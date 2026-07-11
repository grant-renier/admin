"use client";

import { useRef, useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { PsychometricScaleRow } from "../types";

interface PsychometricScaleFormProps {
  editingItem?: PsychometricScaleRow | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
}

export function PsychometricScaleForm({
  editingItem,
  onSubmit,
  onCancel,
}: PsychometricScaleFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isSystem, setIsSystem] = useState(editingItem?.is_system ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("is_system", String(isSystem));
    if (editingItem) fd.set("id", editingItem.id);

    startTransition(async () => {
      try {
        await onSubmit(fd);
        toast.success(editingItem ? "Scale updated" : "Scale created");
        if (!editingItem) formRef.current?.reset();
        onCancel?.();
      } catch (err) {
        toast.error(
          `Failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>
          {editingItem ? "Edit Scale" : "Create Psychometric Scale"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                name="label"
                required
                defaultValue={editingItem?.label ?? ""}
                placeholder="Confidence Projection"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Key *</Label>
              <Input
                id="key"
                name="key"
                required
                defaultValue={editingItem?.key ?? ""}
                placeholder="confidence_projection"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={editingItem?.description ?? ""}
              placeholder="How confidently the speaker projects their ideas"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="anchor_low">Anchor Low (1)</Label>
              <Input
                id="anchor_low"
                name="anchor_low"
                defaultValue={editingItem?.anchor_low ?? ""}
                placeholder="Hesitant, uncertain"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anchor_high">Anchor High (10)</Label>
              <Input
                id="anchor_high"
                name="anchor_high"
                defaultValue={editingItem?.anchor_high ?? ""}
                placeholder="Decisive, commanding"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                defaultValue={editingItem?.category ?? ""}
                placeholder="communication, cognitive, emotional"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch
              id="is_system"
              checked={isSystem}
              onCheckedChange={setIsSystem}
            />
            <Label htmlFor="is_system" className="cursor-pointer">
              System Scale (built-in, non-deletable by users)
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : editingItem
                  ? "Update Scale"
                  : "Create Scale"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
