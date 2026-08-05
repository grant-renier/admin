"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

/**
 * Server actions for blog authoring. Every mutation validates its FormData
 * with Zod (zod@4) before touching Supabase, returning structured field
 * errors the client can surface inline. Slugs are auto-generated from the
 * title (with a manual override) and de-duplicated against `blog_posts`.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  ensureUniqueSlug,
  uploadBlogThumbnail,
} from "@/features/blog/queries";
import type { BlogPostInsert } from "@/features/blog/types";
import { MODULE_SLUGS } from "@/lib/modules";
import { slugify, estimateReadingTime } from "@/lib/utils";

/** Standard action result: either field-level errors or the affected id. */
export interface BlogActionState {
  ok: boolean;
  errors?: Record<string, string>;
  id?: string;
}

/** Optional URL: empty string is allowed and normalised to null. */
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || z.string().url().safeParse(v).success, {
    message: "Must be a valid URL",
  });

/** Optional ISO datetime (from a datetime-local input) or empty. */
const optionalDateTime = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), {
    message: "Must be a valid date",
  });

/** Shared validation schema for both create and update. */
const blogSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title is too long"),
  slug: z.string().trim().max(200).optional().default(""),
  summary: z.string().trim().max(500).optional().default(""),
  body: z.string().optional().default(""),
  thumbnail_url: optionalUrl.optional().default(""),
  module_slug: z
    .string()
    .trim()
    .refine((v) => v === "" || MODULE_SLUGS.includes(v), {
      message: "Unknown module",
    })
    .optional()
    .default(""),
  tags: z.string().optional().default(""),
  author: z.string().trim().max(120).optional().default(""),
  meta_description: z.string().trim().max(320).optional().default(""),
  canonical_url: optionalUrl.optional().default(""),
  is_published: z.string().optional().default("false"),
  published_at: optionalDateTime.optional().default(""),
  scheduled_for: optionalDateTime.optional().default(""),
});

/** Collapse a ZodError into a flat `{ field: message }` map. */
function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Parse validated form fields into a Supabase-ready insert payload. */
function toPayload(
  fields: z.infer<typeof blogSchema>,
  finalSlug: string
): BlogPostInsert {
  const tags = fields.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const isPublished = fields.is_published === "true";
  return {
    slug: finalSlug,
    title: fields.title,
    summary: fields.summary || null,
    body: fields.body,
    thumbnail_url: fields.thumbnail_url || null,
    module_slug: fields.module_slug || null,
    tags,
    author: fields.author || null,
    meta_description: fields.meta_description || null,
    canonical_url: fields.canonical_url || null,
    reading_time: estimateReadingTime(fields.body),
    is_published: isPublished,
    // Stamp publish time when going live and none was supplied.
    published_at:
      fields.published_at ||
      (isPublished ? new Date().toISOString() : null),
    scheduled_for: fields.scheduled_for || null,
  };
}

/** Read raw FormData into the schema's plain-string shape. */
function readForm(formData: FormData) {
  return {
    title: (formData.get("title") as string) ?? "",
    slug: (formData.get("slug") as string) ?? "",
    summary: (formData.get("summary") as string) ?? "",
    body: (formData.get("body") as string) ?? "",
    thumbnail_url: (formData.get("thumbnail_url") as string) ?? "",
    module_slug: (formData.get("module_slug") as string) ?? "",
    tags: (formData.get("tags") as string) ?? "",
    author: (formData.get("author") as string) ?? "",
    meta_description: (formData.get("meta_description") as string) ?? "",
    canonical_url: (formData.get("canonical_url") as string) ?? "",
    is_published: (formData.get("is_published") as string) ?? "false",
    published_at: (formData.get("published_at") as string) ?? "",
    scheduled_for: (formData.get("scheduled_for") as string) ?? "",
  };
}

/** Create a new blog post from validated FormData. */
export async function createBlogPostAction(
  formData: FormData
): Promise<BlogActionState> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const parsed = blogSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }
  const base = slugify(parsed.data.slug || parsed.data.title);
  if (!base) return { ok: false, errors: { slug: "Could not derive a slug" } };
  const slug = await ensureUniqueSlug(base);
  const post = await createBlogPost(toPayload(parsed.data, slug));
  revalidatePath("/dashboard/blog");
  return { ok: true, id: post.id };
}

/** Update an existing blog post from validated FormData. */
export async function updateBlogPostAction(
  formData: FormData
): Promise<BlogActionState> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, errors: { form: "Missing post id" } };
  const parsed = blogSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }
  const base = slugify(parsed.data.slug || parsed.data.title);
  if (!base) return { ok: false, errors: { slug: "Could not derive a slug" } };
  const slug = await ensureUniqueSlug(base, id);
  await updateBlogPost(id, toPayload(parsed.data, slug));
  revalidatePath("/dashboard/blog");
  return { ok: true, id };
}

/** Delete a single blog post. */
export async function deleteBlogPostAction(id: string): Promise<void> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "blog.delete", String(id));
  await deleteBlogPost(id);
  revalidatePath("/dashboard/blog");
}

/** Bulk publish/unpublish a set of posts by id. */
export async function bulkSetPublishedAction(
  ids: string[],
  published: boolean
): Promise<void> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  await Promise.all(
    ids.map((id) =>
      updateBlogPost(id, {
        is_published: published,
        published_at: published ? new Date().toISOString() : null,
      })
    )
  );
  revalidatePath("/dashboard/blog");
}

/** Bulk delete a set of posts by id. */
export async function bulkDeleteAction(ids: string[]): Promise<void> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "blog.bulk_delete", String(ids.join(",")));
  await Promise.all(ids.map((id) => deleteBlogPost(id)));
  revalidatePath("/dashboard/blog");
}

/**
 * Upload a thumbnail file (from a multipart FormData) to Storage and return
 * its public URL. Called directly from the editor before the main save.
 */
export async function uploadThumbnailAction(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { url: null, error: "No file provided" };
  }
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "File must be an image" };
  }
  return uploadBlogThumbnail(file);
}
