"use client";

/**
 * Client shell for the blog dashboard: owns editor visibility, the row being
 * edited, delete confirmation and bulk actions. Wires the Zod-validated
 * server actions to the editor/list components.
 */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BlogPostEditor, BlogPostList } from "@/features/blog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { EmptyState } from "@/components/empty-state";
import { BookOpenIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { BlogPost } from "@/features/blog/types";
import {
  createBlogPostAction,
  updateBlogPostAction,
  deleteBlogPostAction,
  bulkSetPublishedAction,
  bulkDeleteAction,
  type BlogActionState,
} from "./actions";

export function BlogPageClient({
  data,
  tagSuggestions,
}: {
  data: BlogPost[];
  tagSuggestions: string[];
}) {
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (item: BlogPost) => {
    setEditing(item);
    setShowEditor(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteBlogPostAction(deleteId);
        toast.success("Post deleted");
      } catch {
        toast.error("Delete failed");
      }
      setDeleteId(null);
    });
  };

  const handleSubmit = (fd: FormData): Promise<BlogActionState> =>
    editing ? updateBlogPostAction(fd) : createBlogPostAction(fd);

  const handleBulkPublish = (ids: string[], published: boolean) => {
    startTransition(async () => {
      try {
        await bulkSetPublishedAction(ids, published);
        toast.success(
          `${ids.length} post(s) ${published ? "published" : "unpublished"}`
        );
      } catch {
        toast.error("Bulk update failed");
      }
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    startTransition(async () => {
      try {
        await bulkDeleteAction(ids);
        toast.success(`${ids.length} post(s) deleted`);
      } catch {
        toast.error("Bulk delete failed");
      }
    });
  };

  const openNew = () => {
    setEditing(null);
    setShowEditor(true);
  };

  return (
    <div className="space-y-4">
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
          {showEditor ? "Hide Editor" : "New Post"}
        </Button>
      </div>

      {showEditor && (
        <BlogPostEditor
          editingItem={editing}
          tagSuggestions={tagSuggestions}
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
            icon={<BookOpenIcon className="size-12" />}
            title="Create your first post"
            description="Blog posts appear here. Write in Markdown, add SEO metadata, and publish or schedule for later."
          />
          <div className="flex justify-center">
            <Button onClick={openNew}>
              <PlusIcon className="mr-1 size-4" />
              New Post
            </Button>
          </div>
        </div>
      ) : (
        <BlogPostList
          data={data}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
          onBulkPublish={handleBulkPublish}
          onBulkDelete={handleBulkDelete}
        />
      )}

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Post"
        description="This will permanently delete this blog post. Type 'delete' to confirm."
        confirmText="delete"
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </div>
  );
}
