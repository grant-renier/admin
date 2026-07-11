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
import type { EducationalContentRow } from "../types";

interface BlogEditorProps {
  editingItem?: EducationalContentRow | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
}

export function BlogEditor({
  editingItem,
  onSubmit,
  onCancel,
}: BlogEditorProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [published, setPublished] = useState(
    editingItem?.is_published ?? false
  );
  const [preview, setPreview] = useState(false);
  const [body, setBody] = useState(editingItem?.content_body ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("type", "article");
    fd.set("is_published", String(published));
    fd.set("content_body", body);
    if (editingItem) fd.set("id", editingItem.id);

    startTransition(async () => {
      try {
        await onSubmit(fd);
        toast.success(editingItem ? "Article updated" : "Article created");
        if (!editingItem) {
          formRef.current?.reset();
          setBody("");
        }
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
        <div className="flex items-center justify-between">
          <CardTitle>
            {editingItem ? "Edit Article" : "New Blog Article"}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Edit" : "Preview"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={editingItem?.title ?? ""}
                placeholder="How to improve your communication score"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={editingItem?.tags?.join(", ") ?? ""}
                placeholder="tips, communication, scoring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Summary</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={editingItem?.description ?? ""}
              placeholder="Brief description shown in the article card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content_body">
              Article Body (Markdown)
            </Label>
            {preview ? (
              <div className="min-h-[300px] rounded-md border bg-muted/30 p-4 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {body || "Nothing to preview."}
              </div>
            ) : (
              <Textarea
                id="content_body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                placeholder="# Your article title&#10;&#10;Write your article content here using Markdown..."
                className="font-mono text-sm"
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                name="thumbnail_url"
                type="url"
                defaultValue={editingItem?.thumbnail_url ?? ""}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="module_slug">Module (optional)</Label>
              <Input
                id="module_slug"
                name="module_slug"
                defaultValue={editingItem?.module_slug ?? ""}
                placeholder="executives, golf911, etc."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch
              id="is_published"
              checked={published}
              onCheckedChange={setPublished}
            />
            <Label htmlFor="is_published" className="cursor-pointer">
              Published
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : editingItem
                  ? "Update Article"
                  : "Publish Article"}
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
