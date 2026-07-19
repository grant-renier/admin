/**
 * Data-access layer for the blog authoring feature. All reads/writes go
 * through the service-role admin client (RLS blocks client writes). Pure and
 * React-free so it can be unit-tested and reused by server actions.
 */
import { supabaseAdmin } from "@/lib/supabase/client";
import type { BlogPost, BlogPostInsert, BlogPostUpdate } from "./types";

/** Storage bucket that holds uploaded blog thumbnails (public read). */
export const BLOG_THUMBNAIL_BUCKET = "blog-thumbnails";

/** List all posts, newest first (draft + published both included). */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Fetch a single post by primary key, or null when absent. */
export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Fetch a single post by its unique slug, or null when absent. */
export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

/** Insert a new post and return the created row. */
export async function createBlogPost(post: BlogPostInsert): Promise<BlogPost> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .insert(post)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Patch an existing post; server-managed columns are stripped defensively. */
export async function updateBlogPost(
  id: string,
  updates: BlogPostUpdate
): Promise<BlogPost> {
  const { id: _id, ...safe } = updates;
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .update(safe)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Permanently delete a post by id. */
export async function deleteBlogPost(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("blog_posts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * Ensure `slug` is unique across `blog_posts`. When a collision exists (other
 * than the row being edited, identified by `excludeId`), a numeric suffix is
 * appended until the slug is free. Returns the final, safe slug.
 */
export async function ensureUniqueSlug(
  slug: string,
  excludeId?: string
): Promise<string> {
  let candidate = slug;
  let n = 1;
  // Loop until no other row owns the candidate slug. Bounded in practice by
  // the small number of posts sharing a title.
  for (;;) {
    const { data } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === excludeId) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
  }
}

/**
 * Return the sorted set of distinct tags used across all posts, powering the
 * tag-input autocomplete. Flattens the per-row `tags` arrays.
 */
export async function getDistinctBlogTags(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("blog_posts").select("tags");
  const set = new Set<string>();
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) set.add(tag);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Upload a thumbnail image to the public blog bucket and return its public
 * URL. Mirrors the storage upload pattern in `features/config/queries.ts`.
 */
export async function uploadBlogThumbnail(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BLOG_THUMBNAIL_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { url: null, error: error.message };
  const { data } = supabaseAdmin.storage
    .from(BLOG_THUMBNAIL_BUCKET)
    .getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
