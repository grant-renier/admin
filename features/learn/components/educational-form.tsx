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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleSelect, ALL_MODULES_VALUE } from "@/components/module-select";
import { MarkdownPreview } from "@/components/markdown-preview";
import { toast } from "sonner";
import type { EducationalContentRow } from "../types";

interface EducationalFormProps {
  editingItem?: EducationalContentRow | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
}

export function EducationalForm({
  editingItem,
  onSubmit,
  onCancel,
}: EducationalFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<string>(editingItem?.type ?? "article");
  const [moduleSlug, setModuleSlug] = useState<string>(
    editingItem?.module_slug ?? ALL_MODULES_VALUE
  );
  const [published, setPublished] = useState(
    editingItem?.is_published ?? false
  );
  // Live markdown preview for the body, mirroring the blog editor (P0 fix).
  const [body, setBody] = useState(editingItem?.content_body ?? "");
  const [preview, setPreview] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("type", type);
    fd.set("module_slug", moduleSlug === ALL_MODULES_VALUE ? "" : moduleSlug);
    fd.set("content_body", body);
    fd.set("is_published", String(published));
    if (editingItem) fd.set("id", editingItem.id);

    startTransition(async () => {
      try {
        await onSubmit(fd);
        toast.success(editingItem ? "Content updated" : "Content created");
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
        <CardTitle>
          {editingItem ? "Edit Content" : "Create Educational Content"}
        </CardTitle>
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
                placeholder="Getting started with IntualityAI"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={editingItem?.description ?? ""}
              placeholder="Short summary shown on the card"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="content_url">Content URL</Label>
              <Input
                id="content_url"
                name="content_url"
                type="url"
                defaultValue={editingItem?.content_url ?? ""}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content_body">Content Body (Markdown)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={preview}
                onClick={() => setPreview((p) => !p)}
              >
                {preview ? "Edit" : "Preview"}
              </Button>
            </div>
            {preview ? (
              <MarkdownPreview source={body} aria-label="Markdown preview" />
            ) : (
              <Textarea
                id="content_body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Markdown content for articles and guides..."
                className="font-mono text-sm"
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="module_slug">Category</Label>
              <ModuleSelect
                id="module_slug"
                value={moduleSlug}
                onValueChange={setModuleSlug}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={editingItem?.tags?.join(", ") ?? ""}
                placeholder="beginner, voice, scoring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                defaultValue={editingItem?.display_order ?? 0}
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
                  ? "Update Content"
                  : "Create Content"}
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
