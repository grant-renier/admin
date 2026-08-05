"use server";

import { auditLog, requireAdmin } from "@/lib/require-admin";

import { revalidatePath } from "next/cache";
import {
  createEducationalContent,
  updateEducationalContent,
  deleteEducationalContent,
  createPsychometricScale,
  updatePsychometricScale,
  deletePsychometricScale,
} from "@/features/learn/queries";

export async function createContentAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const content = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    type: ((formData.get("type") as string) || "article") as "video" | "article" | "guide",
    content_url: (formData.get("content_url") as string) || null,
    content_body: (formData.get("content_body") as string) || null,
    thumbnail_url: (formData.get("thumbnail_url") as string) || null,
    module_slug: (formData.get("module_slug") as string) || null,
    tags: (formData.get("tags") as string)
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [],
    display_order: parseInt(formData.get("display_order") as string) || 0,
    is_published: formData.get("is_published") === "true",
  };
  await createEducationalContent(content);
  revalidatePath("/dashboard/learn/educational");
  revalidatePath("/dashboard/learn/blogs");
}

export async function updateContentAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const id = formData.get("id") as string;
  const updates = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    type: ((formData.get("type") as string) || "article") as "video" | "article" | "guide",
    content_url: (formData.get("content_url") as string) || null,
    content_body: (formData.get("content_body") as string) || null,
    thumbnail_url: (formData.get("thumbnail_url") as string) || null,
    module_slug: (formData.get("module_slug") as string) || null,
    tags: (formData.get("tags") as string)
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [],
    display_order: parseInt(formData.get("display_order") as string) || 0,
    is_published: formData.get("is_published") === "true",
  };
  await updateEducationalContent(id, updates);
  revalidatePath("/dashboard/learn/educational");
  revalidatePath("/dashboard/learn/blogs");
}

export async function deleteContentAction(id: string) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "learn.delete", String(id));
  await deleteEducationalContent(id);
  revalidatePath("/dashboard/learn/educational");
  revalidatePath("/dashboard/learn/blogs");
}

export async function createScaleAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const scale = {
    key: formData.get("key") as string,
    label: formData.get("label") as string,
    description: (formData.get("description") as string) || null,
    anchor_low: (formData.get("anchor_low") as string) || "",
    anchor_high: (formData.get("anchor_high") as string) || "",
    category: (formData.get("category") as string) || null,
    is_system: formData.get("is_system") === "true",
    created_by: null,
  };
  await createPsychometricScale(scale);
  revalidatePath("/dashboard/learn/psychometrics");
}

export async function updateScaleAction(formData: FormData) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  await requireAdmin();
  const id = formData.get("id") as string;
  const updates = {
    key: formData.get("key") as string,
    label: formData.get("label") as string,
    description: (formData.get("description") as string) || null,
    anchor_low: (formData.get("anchor_low") as string) || "",
    anchor_high: (formData.get("anchor_high") as string) || "",
    category: (formData.get("category") as string) || null,
    is_system: formData.get("is_system") === "true",
  };
  await updatePsychometricScale(id, updates);
  revalidatePath("/dashboard/learn/psychometrics");
}

export async function deleteScaleAction(id: string) {
  // Authorization is enforced HERE, not only in middleware: this action
  // mutates via the service-role key, which bypasses RLS entirely.
  const actor = await requireAdmin();
  auditLog(actor, "scale.delete", String(id));
  await deletePsychometricScale(id);
  revalidatePath("/dashboard/learn/psychometrics");
}
