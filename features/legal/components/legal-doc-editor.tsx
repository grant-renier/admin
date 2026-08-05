"use client";

/**
 * The legal document editor.
 *
 * Four views over one draft: a structured Content editor, a raw JSON escape
 * hatch, a live Preview laid out the way the public page lays it out, and the
 * Version history.
 *
 * Two invariants drive the design:
 *
 * 1. **The draft is always a valid `LegalDoc`, or it is null.** There is no
 *    "partially valid" state. The structured editor can only ever produce
 *    valid shapes, and the JSON tab refuses to hand over anything that does
 *    not parse. When the *stored* payload is malformed the draft starts null,
 *    the structured editor and preview are disabled, and the JSON tab is the
 *    documented way back.
 * 2. **Saving and publishing are separate acts.** Editing a published document
 *    changes what visitors see the moment you press save, so the header says
 *    so; publishing is its own button with its own audit entry.
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CodeIcon,
  EyeIcon,
  FileTextIcon,
  HistoryIcon,
  PlusIcon,
  PowerIcon,
  SaveIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";

import { formatLegalTimestamp } from "../format";
import { moveItem } from "../reorder";
import {
  LEGAL_SLUG_PUBLIC_PATH,
  type LegalDoc,
  type LegalDocumentRow,
  type LegalDocumentVersionRow,
  type PublishLegalDocHandler,
  type RestoreLegalVersionHandler,
  type SaveLegalDocHandler,
} from "../types";
import {
  collectLegalDocWarnings,
  normalizeLegalDoc,
  parseLegalDoc,
} from "../validation";
import { LegalDocPreview } from "./legal-doc-preview";
import { LegalJsonEditor } from "./legal-json-editor";
import { LegalSectionEditor } from "./legal-section-editor";
import { LegalVersionHistory } from "./legal-version-history";

/** The editor's four views. */
type TabId = "content" | "json" | "preview" | "history";

interface LegalDocEditorProps {
  documentRow: LegalDocumentRow;
  versions: LegalDocumentVersionRow[];
  onSave: SaveLegalDocHandler;
  onPublish: PublishLegalDocHandler;
  onUnpublish: PublishLegalDocHandler;
  onRestore: RestoreLegalVersionHandler;
}

/** Serialise the editable state so dirtiness is a string comparison. */
function snapshotOf(doc: LegalDoc | null, effectiveDate: string): string {
  return JSON.stringify({ doc, effectiveDate });
}

/** A textarea's line-per-entry value from a string array. */
function toLines(values: string[]): string {
  return values.join("\n");
}

export function LegalDocEditor({
  documentRow,
  versions,
  onSave,
  onPublish,
  onUnpublish,
  onRestore,
}: LegalDocEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const storedParse = useMemo(
    () => parseLegalDoc(documentRow.doc),
    [documentRow.doc]
  );

  const [doc, setDoc] = useState<LegalDoc | null>(
    storedParse.ok ? storedParse.doc : null
  );
  const [effectiveDate, setEffectiveDate] = useState(
    documentRow.effective_date ?? ""
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshotOf(storedParse.ok ? storedParse.doc : null, documentRow.effective_date ?? "")
  );
  const [actionErrors, setActionErrors] = useState<string[]>([]);
  const [tab, setTab] = useState<TabId>(storedParse.ok ? "content" : "json");
  // Tracks which server version the local draft was seeded from, so a refresh
  // that actually advanced the row can re-seed without clobbering a draft on
  // every unrelated re-render.
  const [syncedVersion, setSyncedVersion] = useState(documentRow.version);

  // Re-seed from the server row whenever its version advances -- our own save,
  // a restore, or another admin's edit landing under us. Without this a
  // restore would leave the editor showing the superseded text.
  //
  // This is React's "adjusting state when a prop changes" pattern: setting
  // state during render (guarded so it runs once per new version) rather than
  // in an effect, which would commit the stale draft first and then re-render.
  if (documentRow.version !== syncedVersion) {
    const parsed = parseLegalDoc(documentRow.doc);
    const nextDoc = parsed.ok ? parsed.doc : null;
    const nextDate = documentRow.effective_date ?? "";
    setSyncedVersion(documentRow.version);
    setDoc(nextDoc);
    setEffectiveDate(nextDate);
    setSavedSnapshot(snapshotOf(nextDoc, nextDate));
    if (!parsed.ok) setTab("json");
  }

  const dirty = snapshotOf(doc, effectiveDate) !== savedSnapshot;

  // Unsaved legal copy is expensive to retype; guard the tab close.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const warnings = doc ? collectLegalDocWarnings(doc) : [];

  /** Merge a shallow patch into the draft document. */
  const patchDoc = (patch: Partial<LegalDoc>) =>
    setDoc((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSave = () => {
    if (!doc) {
      toast.error("Fix the document JSON before saving");
      setTab("json");
      return;
    }
    // Normalise before sending so what is stored is exactly what the preview
    // showed after the save, with no stray blank bullets.
    const normalized = normalizeLegalDoc(doc);
    const formData = new FormData();
    formData.set("slug", documentRow.slug);
    formData.set("doc", JSON.stringify(normalized));
    formData.set("effective_date", effectiveDate);

    startTransition(async () => {
      try {
        const result = await onSave(formData);
        if (!result.ok) {
          setActionErrors(result.errors ?? ["Save was rejected."]);
          toast.error("Save rejected - see the errors above");
          return;
        }
        setActionErrors([]);
        setDoc(normalized);
        setSavedSnapshot(snapshotOf(normalized, effectiveDate));
        toast.success(
          result.version
            ? `Saved as version ${result.version}`
            : "Document saved"
        );
        router.refresh();
      } catch (err) {
        toast.error(
          `Save failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    });
  };

  const handleTogglePublish = () => {
    // Unpublishing is a one-click takedown of live legal terms: the public
    // page 404s for every visitor the moment it lands. It stays a single
    // button (it must keep working when the stored doc is the problem), but
    // it does not fire on a mis-click.
    if (
      documentRow.published &&
      !window.confirm(
        `Unpublish "${documentRow.title}"? ${LEGAL_SLUG_PUBLIC_PATH[documentRow.slug]} ` +
          "will stop rendering for every visitor until it is published again."
      )
    ) {
      return;
    }
    if (
      !documentRow.published &&
      dirty &&
      !window.confirm(
        "You have unsaved changes. Publishing makes the LAST SAVED version " +
          "live, not what is on screen. Continue?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const result = documentRow.published
          ? await onUnpublish(documentRow.slug)
          : await onPublish(documentRow.slug);
        if (!result.ok) {
          setActionErrors(result.errors ?? ["The action was rejected."]);
          toast.error("Publish state unchanged - see the errors above");
          return;
        }
        setActionErrors([]);
        toast.success(
          documentRow.published
            ? "Unpublished - the public page will 404 for visitors"
            : "Published - this document is now live"
        );
        router.refresh();
      } catch (err) {
        toast.error(
          `Failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    });
  };

  const handleRestore = (versionId: string) => {
    if (
      dirty &&
      !window.confirm(
        "Restoring replaces the draft you are editing. Your unsaved changes " +
          "will be lost. Continue?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await onRestore(documentRow.slug, versionId);
        if (!result.ok) {
          setActionErrors(result.errors ?? ["Restore was rejected."]);
          toast.error("Restore rejected - see the errors above");
          return;
        }
        setActionErrors([]);
        toast.success(
          result.version
            ? `Restored - now version ${result.version}`
            : "Version restored"
        );
        router.refresh();
      } catch (err) {
        toast.error(
          `Restore failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    });
  };

  const tabs: { id: TabId; label: string; icon: typeof FileTextIcon; disabled?: boolean }[] = [
    { id: "content", label: "Content", icon: FileTextIcon, disabled: !doc },
    { id: "json", label: "Raw JSON", icon: CodeIcon },
    { id: "preview", label: "Preview", icon: EyeIcon, disabled: !doc },
    {
      id: "history",
      label: `History (${versions.length})`,
      icon: HistoryIcon,
    },
  ];

  return (
    <div className="space-y-4">
      {/* --- Header: identity, state, and the two privileged buttons --- */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <CardTitle className="truncate">
                {doc?.title || documentRow.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="font-mono">
                  {documentRow.slug}
                </Badge>
                <Badge variant="outline" className="font-mono">
                  v{documentRow.version}
                </Badge>
                {documentRow.published ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Published
                  </Badge>
                ) : (
                  <Badge variant="secondary">Unpublished</Badge>
                )}
                {dirty && <Badge variant="destructive">Unsaved changes</Badge>}
              </div>
              <CardDescription>
                Last updated {formatLegalTimestamp(documentRow.updated_at)}
                {documentRow.updated_by ? ` by ${documentRow.updated_by}` : ""} ·
                serves{" "}
                <span className="font-mono">
                  {LEGAL_SLUG_PUBLIC_PATH[documentRow.slug]}
                </span>
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant={documentRow.published ? "outline" : "secondary"}
                disabled={pending}
                onClick={handleTogglePublish}
              >
                <PowerIcon className="mr-1.5 size-4" />
                {documentRow.published ? "Unpublish" : "Publish"}
              </Button>
              <Button
                type="button"
                disabled={pending || !dirty || !doc}
                onClick={handleSave}
              >
                <SaveIcon className="mr-1.5 size-4" />
                {pending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {documentRow.published && (
          <CardContent className="pt-0">
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              This document is live. Saving changes updates what every visitor
              reads - there is no separate draft copy.
            </p>
          </CardContent>
        )}
      </Card>

      {/* --- Blocking errors from the stored payload or the last action --- */}
      {!storedParse.ok && !doc && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-destructive">
            <TriangleAlertIcon className="size-4" />
            The stored document does not match the contract the public page
            renders. Repair it in the Raw JSON tab.
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
            {storedParse.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {actionErrors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-destructive">
            <TriangleAlertIcon className="size-4" />
            The server rejected this write
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
            {actionErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <details className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
          <summary className="cursor-pointer text-sm font-medium">
            {warnings.length} content warning{warnings.length === 1 ? "" : "s"}{" "}
            (does not block saving)
          </summary>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      {/* --- View switcher --- */}
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={tab === item.id ? "secondary" : "ghost"}
            disabled={item.disabled}
            onClick={() => setTab(item.id)}
          >
            <item.icon className="mr-1.5 size-4" />
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "content" && doc && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document header</CardTitle>
              <CardDescription>
                Title, the metadata lines under it, and the paragraphs that run
                before section 1.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="legal-title">Title</Label>
                  <Input
                    id="legal-title"
                    value={doc.title}
                    onChange={(e) => patchDoc({ title: e.target.value })}
                    placeholder="Privacy Policy"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Also written to the row&apos;s <code>title</code> column, so
                    the two can never drift apart.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="legal-effective">Effective date</Label>
                  <Input
                    id="legal-effective"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Stored on the row. The date visitors read comes from the
                    meta lines below - keep them consistent.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="legal-meta">Meta lines (one per line)</Label>
                <Textarea
                  id="legal-meta"
                  rows={5}
                  value={toLines(doc.meta)}
                  onChange={(e) =>
                    patchDoc({ meta: e.target.value.split("\n") })
                  }
                  placeholder={"Effective Date: July 9, 2026\nProvider: ..."}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="legal-intro">
                  Intro paragraphs (one per line)
                </Label>
                <Textarea
                  id="legal-intro"
                  rows={5}
                  value={toLines(doc.intro)}
                  onChange={(e) =>
                    patchDoc({ intro: e.target.value.split("\n") })
                  }
                  placeholder="This Privacy Policy explains how..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sections ({doc.sections.length})</CardTitle>
              <CardDescription>
                Order matters - legal copy cross-references itself by section
                number. Expand a section to edit its blocks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {doc.sections.map((section, index) => (
                <LegalSectionEditor
                  // Sections have no id; position is their identity and any
                  // reorder replaces the whole array.
                  key={index}
                  section={section}
                  index={index}
                  canMoveUp={index > 0}
                  canMoveDown={index < doc.sections.length - 1}
                  onChange={(next) =>
                    patchDoc({
                      sections: doc.sections.map((s, i) =>
                        i === index ? next : s
                      ),
                    })
                  }
                  onRemove={() =>
                    patchDoc({
                      sections: doc.sections.filter((_, i) => i !== index),
                    })
                  }
                  onMove={(direction) =>
                    patchDoc({
                      sections: moveItem(doc.sections, index, direction),
                    })
                  }
                />
              ))}
              {doc.sections.length === 0 && (
                <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  No sections yet.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  patchDoc({
                    sections: [
                      ...doc.sections,
                      { heading: "", blocks: [{ kind: "p", text: "" }] },
                    ],
                  })
                }
              >
                <PlusIcon className="mr-1 size-4" />
                Add section
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Closing callout</CardTitle>
              <CardDescription>
                Optional highlighted block at the end of the document - the
                EULA uses it for the user disclaimer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc.callout ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="legal-callout-heading">Heading</Label>
                    <Input
                      id="legal-callout-heading"
                      value={doc.callout.heading}
                      onChange={(e) =>
                        patchDoc({
                          callout: {
                            heading: e.target.value,
                            paragraphs: doc.callout?.paragraphs ?? [],
                          },
                        })
                      }
                      placeholder="USER DISCLAIMER"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="legal-callout-body">
                      Paragraphs (one per line)
                    </Label>
                    <Textarea
                      id="legal-callout-body"
                      rows={5}
                      value={toLines(doc.callout.paragraphs)}
                      onChange={(e) =>
                        patchDoc({
                          callout: {
                            heading: doc.callout?.heading ?? "",
                            paragraphs: e.target.value.split("\n"),
                          },
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      // Remove the key entirely rather than setting it empty:
                      // the public type is `callout?`, and an empty callout
                      // would render as a stray accent box.
                      setDoc((prev) => {
                        if (!prev) return prev;
                        const next = { ...prev };
                        delete next.callout;
                        return next;
                      })
                    }
                  >
                    <Trash2Icon className="mr-1 size-4" />
                    Remove callout
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    patchDoc({ callout: { heading: "", paragraphs: [""] } })
                  }
                >
                  <PlusIcon className="mr-1 size-4" />
                  Add callout
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "json" && (
        <Card>
          <CardHeader>
            <CardTitle>Raw JSON</CardTitle>
            <CardDescription>
              Paste a whole document, or repair one the structured editor
              cannot open. Nothing here touches the draft until you apply it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LegalJsonEditor
              // Mounted only while this tab is active, so the textarea is
              // re-seeded from the current draft on every visit rather than
              // resurrecting a stale copy from an earlier one.
              initialJson={JSON.stringify(doc ?? documentRow.doc, null, 2)}
              // Only surface the stored payload's errors while it is still
              // the thing in the textarea; once a valid doc has been applied
              // they describe text that is no longer on screen.
              initialErrors={
                !doc && !storedParse.ok ? storedParse.errors : []
              }
              onApply={(next) => {
                setDoc(next);
                setActionErrors([]);
                toast.success("JSON applied to the draft");
                setTab("content");
              }}
            />
          </CardContent>
        </Card>
      )}

      {tab === "preview" && doc && (
        <Card>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <CardDescription>
              The current draft, laid out the way{" "}
              <span className="font-mono">
                {LEGAL_SLUG_PUBLIC_PATH[documentRow.slug]}
              </span>{" "}
              lays it out. Structure is exact; typography and colour follow the
              admin theme, not the public site.
            </CardDescription>
          </CardHeader>
          <CardContent className="border-t bg-muted/20 pt-6">
            <LegalDocPreview doc={doc} />
          </CardContent>
        </Card>
      )}

      {tab === "history" && (
        <LegalVersionHistory
          versions={versions}
          currentVersion={documentRow.version}
          onRestore={handleRestore}
          restoring={pending}
        />
      )}
    </div>
  );
}
