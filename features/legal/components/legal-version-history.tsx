"use client";

/**
 * Version history for one legal document: every prior state snapshotted by the
 * `legal_documents` BEFORE UPDATE trigger, with the ability to preview a
 * version as the public site would render it and to restore it.
 *
 * Restoring is a normal edit, not a rewind: it writes the old payload back as
 * the current doc, which fires the same trigger and archives whatever was live
 * a moment ago. Nothing in the history is ever destroyed, which is exactly the
 * property you want from a legal-terms audit trail.
 */
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { EyeIcon, HistoryIcon, RotateCcwIcon, XIcon } from "lucide-react";

import { formatLegalDate, formatLegalTimestamp } from "../format";
import type { LegalDocumentVersionRow } from "../types";
import { parseLegalDoc } from "../validation";
import { LegalDocPreview } from "./legal-doc-preview";

interface LegalVersionHistoryProps {
  versions: LegalDocumentVersionRow[];
  /** The live document's current version number. */
  currentVersion: number;
  /** Restore handler; resolves when the server action has completed. */
  onRestore: (versionId: string) => void;
  /** True while a restore is in flight. */
  restoring: boolean;
}

export function LegalVersionHistory({
  versions,
  currentVersion,
  onRestore,
  restoring,
}: LegalVersionHistoryProps) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const viewing = versions.find((v) => v.id === viewingId) ?? null;
  const restoreTarget = versions.find((v) => v.id === restoreId) ?? null;
  const parsedViewing = viewing ? parseLegalDoc(viewing.doc) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4" />
            Version history
          </CardTitle>
          <CardDescription>
            Snapshots written automatically whenever the document body or title
            changes. The live document is version {currentVersion}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {versions.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No earlier versions yet - this document has not been edited since
              it was seeded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Version</th>
                    <th className="px-4 py-2 font-medium">Title</th>
                    <th className="px-4 py-2 font-medium">Effective</th>
                    <th className="px-4 py-2 font-medium">Replaced</th>
                    <th className="px-4 py-2 font-medium">By</th>
                    <th className="px-4 py-2 font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => {
                    const valid = parseLegalDoc(version.doc).ok;
                    return (
                      <tr
                        key={version.id}
                        className="border-b last:border-b-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="font-mono">
                            v{version.version}
                          </Badge>
                        </td>
                        <td className="max-w-[16rem] truncate px-4 py-2.5">
                          {version.title}
                          {!valid && (
                            <Badge variant="destructive" className="ml-2">
                              Malformed
                            </Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {formatLegalDate(version.effective_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {formatLegalTimestamp(version.created_at)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {version.updated_by ?? "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setViewingId((id) =>
                                  id === version.id ? null : version.id
                                )
                              }
                            >
                              <EyeIcon className="mr-1 size-3.5" />
                              {viewingId === version.id ? "Hide" : "View"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={restoring}
                              onClick={() => setRestoreId(version.id)}
                            >
                              <RotateCcwIcon className="mr-1 size-3.5" />
                              Restore
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {viewing && parsedViewing && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Version {viewing.version} preview</CardTitle>
                <CardDescription>
                  Replaced {formatLegalTimestamp(viewing.created_at)}
                  {viewing.updated_by ? ` by ${viewing.updated_by}` : ""}.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close preview"
                onClick={() => setViewingId(null)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {parsedViewing.ok ? (
              <LegalDocPreview doc={parsedViewing.doc} />
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <p className="mb-1 font-medium text-destructive">
                    This archived version does not match the current document
                    contract, so it cannot be previewed.
                  </p>
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
                    {parsedViewing.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
                <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(viewing.doc, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmationDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreId(null)}
        title={`Restore version ${restoreTarget?.version ?? ""}`}
        description={
          "This replaces the live document with this archived version. The " +
          "current text is archived first, so nothing is lost - but if the " +
          "document is published, the change is visible to end users " +
          "immediately. Type 'restore' to confirm."
        }
        confirmText="restore"
        loading={restoring}
        loadingLabel="Restoring..."
        onConfirm={() => {
          if (restoreId) onRestore(restoreId);
          setRestoreId(null);
        }}
      />
    </div>
  );
}
