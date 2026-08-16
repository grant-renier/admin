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
import { PlusIcon, Trash2Icon } from "lucide-react";
import { MODULES } from "@/lib/modules";
import type { TemplateWithUsage } from "../types";

/** Sentinel Select value for "no module" (the DB column is nullable/blank). */
const GLOBAL_MODULE = "__global__";

/** One entry in the metric_templates.metrics jsonb array (shared with the live apps). */
interface MetricDraft {
  key: string;
  label: string;
  description: string;
}

interface TemplateFormProps {
  editingItem?: TemplateWithUsage | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
}

/**
 * Create/edit form for metric templates with a dynamic metrics list editor.
 * Metrics are serialized to JSON in a single form field; keys must be
 * unique and non-empty because the live web + mobile apps index by key.
 */
export function TemplateForm({
  editingItem,
  onSubmit,
  onCancel,
}: TemplateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isSystem, setIsSystem] = useState(editingItem?.is_system ?? true);
  const [metrics, setMetrics] = useState<MetricDraft[]>(
    editingItem?.metrics ?? [{ key: "", label: "", description: "" }]
  );
  // Radix Select is not a native <select> - it does not participate in
  // FormData on its own (see access-gate-form.tsx for the same pattern),
  // so it's controlled state written into the FormData explicitly below.
  const [moduleSlug, setModuleSlug] = useState(
    editingItem?.module_slug ?? GLOBAL_MODULE
  );

  function updateMetric(index: number, patch: Partial<MetricDraft>) {
    setMetrics((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
    );
  }

  /** Returns an error message, or null when the metrics list is valid. */
  function validateMetrics(): string | null {
    if (metrics.length === 0) return "Add at least one metric";
    const seen = new Set<string>();
    for (const m of metrics) {
      const key = m.key.trim();
      if (!key) return "Every metric needs a non-empty key";
      if (seen.has(key)) return `Duplicate metric key: ${key}`;
      seen.add(key);
    }
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const metricsError = validateMetrics();
    if (metricsError) {
      toast.error(metricsError);
      return;
    }
    const fd = new FormData(formRef.current!);
    fd.set("metrics", JSON.stringify(metrics));
    fd.set("is_system", String(isSystem));
    fd.set("module_slug", moduleSlug === GLOBAL_MODULE ? "" : moduleSlug);
    if (editingItem) fd.set("id", editingItem.id);

    startTransition(async () => {
      try {
        await onSubmit(fd);
        toast.success(editingItem ? "Template updated" : "Template created");
        if (!editingItem) {
          formRef.current?.reset();
          setMetrics([{ key: "", label: "", description: "" }]);
          setModuleSlug(GLOBAL_MODULE);
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
          {editingItem ? `Edit ${editingItem.name}` : "Create Template"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editingItem?.name ?? ""}
                placeholder="Executive Presence"
              />
            </div>
            <div className="space-y-2">
              {/* Field keeps the module_slug DB column name; only the
                  user-facing label says Category. A <Select> bound to
                  MODULES (not free text) because this column is read by
                  the bridge's scoring prompts and both live clients - a
                  typo'd slug silently detaches the template from every
                  module it was meant to serve. */}
              <Label htmlFor="module_slug">Category</Label>
              <Select
                value={moduleSlug}
                onValueChange={(v) => setModuleSlug(v ?? GLOBAL_MODULE)}
              >
                <SelectTrigger id="module_slug" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GLOBAL_MODULE}>
                    Global (all modules)
                  </SelectItem>
                  {MODULES.map((m) => (
                    <SelectItem key={m.slug} value={m.slug}>
                      {m.label}
                    </SelectItem>
                  ))}
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
              placeholder="What this template measures"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Metrics *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setMetrics((prev) => [
                    ...prev,
                    { key: "", label: "", description: "" },
                  ])
                }
              >
                <PlusIcon className="mr-1 size-3" />
                Add metric
              </Button>
            </div>
            <div className="space-y-2">
              {metrics.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_2fr_auto] items-start gap-2 rounded-md border border-border/50 p-2"
                >
                  <Input
                    value={m.key}
                    onChange={(e) => updateMetric(i, { key: e.target.value })}
                    placeholder="key"
                    aria-label={`Metric ${i + 1} key`}
                    className="font-mono text-xs"
                  />
                  <Input
                    value={m.label}
                    onChange={(e) => updateMetric(i, { label: e.target.value })}
                    placeholder="Label"
                    aria-label={`Metric ${i + 1} label`}
                  />
                  <Input
                    value={m.description}
                    onChange={(e) =>
                      updateMetric(i, { description: e.target.value })
                    }
                    placeholder="Description"
                    aria-label={`Metric ${i + 1} description`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setMetrics((prev) => prev.filter((_, j) => j !== i))
                    }
                    aria-label={`Remove metric ${i + 1}`}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {!editingItem && (
            <div className="flex items-center gap-2">
              <Switch
                id="is_system"
                checked={isSystem}
                onCheckedChange={setIsSystem}
              />
              <Label htmlFor="is_system">
                System template (visible to all users)
              </Label>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : editingItem
                  ? "Save changes"
                  : "Create template"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
