"use client";

/**
 * Persona authoring editor: identity fields, leadership/communication context,
 * an editable list of exactly five scored metrics, and a publish toggle.
 * Submits via FormData to the Zod-validated server actions and surfaces any
 * returned field errors inline. Mirrors the blog editor's shape and guards.
 */
import { useCallback, useEffect, useState } from "react";
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
import { slugify } from "@/lib/utils";
import type { Persona, PersonaMetric } from "../types";
import type { PersonaActionState } from "@/app/dashboard/personas/actions";

/** Fixed number of metric rows every persona carries. */
const METRIC_COUNT = 5;

/** An empty metric row used to pad the editable list up to METRIC_COUNT. */
const EMPTY_METRIC: PersonaMetric = { key: "", label: "", description: "" };

interface PersonaEditorProps {
  editingItem?: Persona | null;
  /** Submit handler: returns the action result so errors can be shown. */
  onSubmit: (formData: FormData) => Promise<PersonaActionState>;
  onCancel?: () => void;
}

/** Pad (or trim) the persisted metrics to exactly METRIC_COUNT rows. */
function normaliseMetrics(metrics: PersonaMetric[] | undefined): PersonaMetric[] {
  const base = metrics ?? [];
  return Array.from(
    { length: METRIC_COUNT },
    (_, i) => base[i] ?? { ...EMPTY_METRIC }
  );
}

export function PersonaEditor({
  editingItem,
  onSubmit,
  onCancel,
}: PersonaEditorProps) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Controlled state so we can compute the slug live and guard exit.
  const [name, setName] = useState(editingItem?.name ?? "");
  const [slug, setSlug] = useState(editingItem?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!editingItem);
  const [archetypeTitle, setArchetypeTitle] = useState(
    editingItem?.archetype_title ?? ""
  );
  const [summary, setSummary] = useState(editingItem?.summary ?? "");
  const [leadershipContext, setLeadershipContext] = useState(
    editingItem?.leadership_context ?? ""
  );
  const [communicationStyle, setCommunicationStyle] = useState(
    editingItem?.communication_style ?? ""
  );
  const [displayOrder, setDisplayOrder] = useState(
    String(editingItem?.display_order ?? 0)
  );
  const [published, setPublished] = useState(
    editingItem?.is_published ?? true
  );
  const [metrics, setMetrics] = useState<PersonaMetric[]>(
    normaliseMetrics(editingItem?.metrics)
  );

  // Keep slug in sync with the name until the user hand-edits it.
  const effectiveSlug = slugTouched ? slug : slugify(name);

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

  /** Update a single field on a single metric row by index. */
  const updateMetric = (
    index: number,
    field: keyof PersonaMetric,
    value: string
  ) => {
    setMetrics((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
    touch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    // Drop fully-empty trailing rows; keep any row that carries a key.
    const cleanedMetrics = metrics.filter((m) => m.key.trim() !== "");
    const fd = new FormData();
    fd.set("name", name);
    fd.set("slug", effectiveSlug);
    fd.set("archetype_title", archetypeTitle);
    fd.set("summary", summary);
    fd.set("leadership_context", leadershipContext);
    fd.set("communication_style", communicationStyle);
    fd.set("display_order", displayOrder);
    fd.set("is_published", String(published));
    fd.set("metrics", JSON.stringify(cleanedMetrics));
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
      toast.success(editingItem ? "Persona updated" : "Persona created");
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
        <CardTitle>
          {editingItem ? "Edit Persona" : "New Persona"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* --- Identity --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  touch();
                }}
                placeholder="The Strategist"
              />
              {fieldError("name")}
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
                placeholder="auto-generated-from-name"
              />
              {fieldError("slug")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="archetype_title">Archetype Title</Label>
              <Input
                id="archetype_title"
                value={archetypeTitle}
                onChange={(e) => {
                  setArchetypeTitle(e.target.value);
                  touch();
                }}
                placeholder="The Visionary Architect"
              />
              {fieldError("archetype_title")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => {
                  setDisplayOrder(e.target.value);
                  touch();
                }}
                placeholder="0"
              />
              {fieldError("display_order")}
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
              rows={3}
              placeholder="One-paragraph overview of this persona."
            />
            {fieldError("summary")}
          </div>

          {/* --- Context --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leadership_context">Leadership Context</Label>
              <Textarea
                id="leadership_context"
                value={leadershipContext}
                onChange={(e) => {
                  setLeadershipContext(e.target.value);
                  touch();
                }}
                rows={5}
                placeholder="How this persona shows up in a leadership setting."
              />
              {fieldError("leadership_context")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="communication_style">Communication Style</Label>
              <Textarea
                id="communication_style"
                value={communicationStyle}
                onChange={(e) => {
                  setCommunicationStyle(e.target.value);
                  touch();
                }}
                rows={5}
                placeholder="How this persona tends to communicate."
              />
              {fieldError("communication_style")}
            </div>
          </div>

          {/* --- Metrics (fixed set of five) --- */}
          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">
              Metrics (5)
            </legend>
            {fieldError("metrics")}
            {metrics.map((metric, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-md border border-border/50 p-3 sm:grid-cols-3"
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`metric-key-${i}`} className="text-xs">
                    Key {i + 1}
                  </Label>
                  <Input
                    id={`metric-key-${i}`}
                    value={metric.key}
                    onChange={(e) => updateMetric(i, "key", e.target.value)}
                    placeholder="influence"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`metric-label-${i}`} className="text-xs">
                    Label
                  </Label>
                  <Input
                    id={`metric-label-${i}`}
                    value={metric.label}
                    onChange={(e) => updateMetric(i, "label", e.target.value)}
                    placeholder="Influence"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`metric-description-${i}`}
                    className="text-xs"
                  >
                    Description
                  </Label>
                  <Input
                    id={`metric-description-${i}`}
                    value={metric.description}
                    onChange={(e) =>
                      updateMetric(i, "description", e.target.value)
                    }
                    placeholder="Drives outcomes through persuasion"
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Rows left with an empty key are dropped on save. Every saved
              metric needs a non-empty key.
            </p>
          </fieldset>

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
                  ? "Update Persona"
                  : "Create Persona"}
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
