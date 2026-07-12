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
    editingItem?.module_slug ?? "all"
  );
  const [published, setPublished] = useState(
    editingItem?.is_published ?? false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("type", type);
    fd.set("module_slug", moduleSlug === "all" ? "" : moduleSlug);
    fd.set("is_published", String(published));
    if (editingItem) fd.set("id", editingItem.id);

    startTransition(async () => {
      try {
        await onSubmit(fd);
        toast.success(editingItem ? "Content updated" : "Content created");
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
            <Label htmlFor="content_body">Content Body</Label>
            <Textarea
              id="content_body"
              name="content_body"
              rows={8}
              defaultValue={editingItem?.content_body ?? ""}
              placeholder="Markdown content for articles and guides..."
              className="font-mono text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="module_slug">Category</Label>
              <Select
                value={moduleSlug}
                onValueChange={(v) => v && setModuleSlug(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="golf911">Golf 911</SelectItem>
                  <SelectItem value="executives">Executives</SelectItem>
                  <SelectItem value="dating">Dating</SelectItem>
                  <SelectItem value="politics">Politics</SelectItem>
                  <SelectItem value="markets">Markets</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                </SelectContent>
              </Select>
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
