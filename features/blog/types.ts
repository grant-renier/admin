/**
 * Type surface for the standalone blog authoring feature. Rows are sourced
 * from the `blog_posts` table (see the web repo migration); insert/update
 * shapes derive from the generated Supabase types so queries stay type-safe.
 */
import type { Database } from "@/types/supabase";

/** A fully-hydrated blog post row as read from Supabase. */
export type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];

/** Fields accepted when creating a post (id/timestamps are server-managed). */
export type BlogPostInsert =
  Database["public"]["Tables"]["blog_posts"]["Insert"];

/** Partial patch accepted when editing an existing post. */
export type BlogPostUpdate =
  Database["public"]["Tables"]["blog_posts"]["Update"];
