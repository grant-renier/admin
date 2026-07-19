"use client";

/**
 * Full blog authoring editor: content, live markdown preview, SEO/scheduling
 * metadata, thumbnail upload, tag autocomplete and an unsaved-changes guard.
 * Submits via FormData to the Zod-validated server actions and surfaces any
 * returned field errors inline.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { MarkdownPreview } from "@/components/markdown-preview";
import { ModuleSelect, ALL_MODULES_VALUE } from "@/components/module-select";
import { TagInput } from "@/components/tag-input";
import { MarkdownToolbar } from "./markdown-toolbar";
import { toast } from "sonner";
import { slugify, estimateReadingTime } from "@/lib/utils";
import { Loader2, UploadCloud } from "lucide-react";
import type { BlogPost } from "../types";
import type { BlogActionState } from "@/app/dashboard/blog/actions";
import { uploadThumbnailAction } from "@/app/dashboard/blog/actions";

interface BlogPostEditorProps {
  editingItem?: BlogPost | null;
  /** Existing distinct tags, feeding the tag autocomplete. */
  tagSuggestions?: string[];
  /** Submit handler: returns the action result so errors can be shown. */
  onSubmit: (formData: FormData) => Promise<BlogActionState>;
  onCancel?: () => void;
}

/** Convert an ISO timestamp to the value shape a datetime-local input wants. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function BlogPostEditor({
  editingItem,
  tagSuggestions = [],
  onSubmit,
  onCancel,
}: BlogPostEditorProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Controlled state so we can compute slug/reading-time live and guard exit.
  const [title, setTitle] = useState(editingItem?.title ?? "");
  const [slug, setSlug] = useState(editingItem?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!editingItem);
  const [summary, setSummary] = useState(editingItem?.summary ?? "");
  const [body, setBody] = useState(editingItem?.body ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(
    editingItem?.thumbnail_url ?? ""
  );
  const [moduleSlug, setModuleSlug] = useState(
    editingItem?.module_slug ?? ALL_MODULES_VALUE
  );
  const [tags, setTags] = useState<string[]>(editingItem?.tags ?? []);
  const [author, setAuthor] = useState(editingItem?.author ?? "");
  const [metaDescription, setMetaDescription] = useState(
    editingItem?.meta_description ?? ""
  );
  const [canonicalUrl, setCanonicalUrl] = useState(
    editingItem?.canonical_url ?? ""
  );
  const [published, setPublished] = useState(
    editingItem?.is_published ?? false
  );
  const [publishedAt, setPublishedAt] = useState(
    toLocalInput(editingItem?.published_at)
  );
  const [scheduledFor, setScheduledFor] = useState(
    toLocalInput(editingItem?.scheduled_for)
  );
  const [preview, setPreview] = useState(false);

  // Keep slug in sync with title until the user hand-edits it.
  const effectiveSlug = slugTouched ? slug : slugify(title);
  const readingTime = useMemo(() => estimateReadingTime(body), [body]);

  /** Mark the form dirty on any field change. */
  const touch = useCallback(() => setDirty(true), []);

  // Warn before leaving/closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleCancel = () => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onCancel?.();
  };

  const handleThumbnail = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const { url, error } = await uploadThumbnailAction(fd);
      if (error || !url) {
        toast.error(`Upload failed: ${error ?? "unknown error"}`);
        return;
      }
      setThumbnailUrl(url);
      setDirty(true);
      toast.success("Thumbnail uploaded");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const fd = new FormData();
    fd.set("title", title);
    fd.set("slug", effectiveSlug);
    fd.set("summary", summary);
    fd.set("body", body);
    fd.set("thumbnail_url", thumbnailUrl);
    fd.set("module_slug", moduleSlug === ALL_MODULES_VALUE ? "" : moduleSlug);
    fd.set("tags", tags.join(","));
    fd.set("author", author);
    fd.set("meta_description", metaDescription);
    fd.set("canonical_url", canonicalUrl);
    fd.set("is_published", String(published));
    fd.set("published_at", publishedAt);
    fd.set("scheduled_for", scheduledFor);
    if (editingItem) fd.set("id", editingItem.id);

    setSaving(true);
    try {
      const result = await onSubmit(fd);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        toast.error("Please fix the highlighted fields");
        return;
      }
      setDirty(false);
      toast.success(editingItem ? "Post updated" : "Post created");
      onCancel?.();
    } catch (err) {
      toast.error(
        `Failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  };

  /** Render a small red validation message under a field. */
  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="text-xs text-destructive">{errors[key]}</p>
    ) : null;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{editingItem ? "Edit Post" : "New Blog Post"}</CardTitle>
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
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* --- Content --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  touch();
                }}
                placeholder="How to improve your communication score"
              />
              {fieldError("title")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                  touch();
                }}
                placeholder="auto-generated-from-title"
              />
              {fieldError("slug")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                touch();
              }}
              rows={2}
              placeholder="Brief description shown in the post card"
            />
            {fieldError("summary")}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Body (Markdown)</Label>
              <span className="text-xs text-muted-foreground">
                ~{readingTime} min read
              </span>
            </div>
            {!preview && (
              <MarkdownToolbar
                textareaRef={bodyRef}
                value={body}
                onChange={(next) => {
                  setBody(next);
                  touch();
                }}
              />
            )}
            {preview ? (
              <MarkdownPreview
                source={body}
                aria-label="Markdown preview"
              />
            ) : (
              <Textarea
                id="body"
                ref={bodyRef}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  touch();
                }}
                rows={16}
                placeholder="# Your post title&#10;&#10;Write your content in Markdown..."
                className="font-mono text-sm"
              />
            )}
          </div>

          {/* --- Thumbnail --- */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                id="thumbnail_url"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => {
                  setThumbnailUrl(e.target.value);
                  touch();
                }}
                placeholder="https://... or upload"
                className="flex-1 min-w-[200px]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() =>
                  document.getElementById("thumb-file")?.click()
                }
              >
                {uploading ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-1 size-4" />
                )}
                Upload
              </Button>
              <input
                id="thumb-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleThumbnail(e.target.files?.[0])}
              />
            </div>
            {thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                className="mt-2 h-24 rounded-md border object-cover"
              />
            )}
            {fieldError("thumbnail_url")}
          </div>

          {/* --- Taxonomy --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="module_slug">Module</Label>
              <ModuleSelect
                id="module_slug"
                value={moduleSlug}
                onValueChange={(v) => {
                  setModuleSlug(v);
                  touch();
                }}
              />
              {fieldError("module_slug")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <TagInput
                id="tags"
                value={tags}
                onChange={(t) => {
                  setTags(t);
                  touch();
                }}
                suggestions={tagSuggestions}
              />
            </div>
          </div>

          {/* --- SEO --- */}
          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">SEO</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => {
                    setAuthor(e.target.value);
                    touch();
                  }}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canonical_url">Canonical URL</Label>
                <Input
                  id="canonical_url"
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => {
                    setCanonicalUrl(e.target.value);
                    touch();
                  }}
                  placeholder="https://intuality.ai/blog/..."
                />
                {fieldError("canonical_url")}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                value={metaDescription}
                onChange={(e) => {
                  setMetaDescription(e.target.value);
                  touch();
                }}
                rows={2}
                placeholder="Up to ~160 characters for search snippets"
              />
              {fieldError("meta_description")}
            </div>
          </fieldset>

          {/* --- Publishing --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="published_at">Published At</Label>
              <Input
                id="published_at"
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => {
                  setPublishedAt(e.target.value);
                  touch();
                }}
              />
              {fieldError("published_at")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_for">Scheduled For</Label>
              <Input
                id="scheduled_for"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => {
                  setScheduledFor(e.target.value);
                  touch();
                }}
              />
              {fieldError("scheduled_for")}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switch
              id="is_published"
              checked={published}
              onCheckedChange={(v) => {
                setPublished(v);
                touch();
              }}
            />
            <Label htmlFor="is_published" className="cursor-pointer">
              Published
            </Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingItem
                  ? "Update Post"
                  : "Publish Post"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
