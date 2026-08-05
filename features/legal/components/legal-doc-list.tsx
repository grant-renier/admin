/**
 * The three managed legal documents, with slug, title, version, published
 * state and last-updated.
 *
 * Server component - it is a table of links with no interactivity, so there is
 * no reason to ship it to the browser.
 *
 * Rows are driven by `LEGAL_SLUGS`, not by what came back from the query: the
 * `legal_documents.slug` CHECK constraint says there are exactly three
 * documents, so a slug with no row is a seeding gap and is reported as one
 * rather than silently disappearing from the list.
 */
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PencilIcon, TriangleAlertIcon } from "lucide-react";

import { formatLegalDate, formatLegalTimestamp } from "../format";
import {
  LEGAL_SLUGS,
  LEGAL_SLUG_LABELS,
  LEGAL_SLUG_PUBLIC_PATH,
  type LegalDocumentRow,
} from "../types";
import { parseLegalDoc } from "../validation";

export function LegalDocList({
  documents,
}: {
  documents: LegalDocumentRow[];
}) {
  const bySlug = new Map(documents.map((doc) => [doc.slug, doc]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal documents</CardTitle>
        <CardDescription>
          Edited here and rendered directly by the public site. Only published
          documents are readable by anyone but an admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Document</th>
                <th className="px-4 py-2.5 font-medium">Slug</th>
                <th className="px-4 py-2.5 font-medium">Version</th>
                <th className="px-4 py-2.5 font-medium">State</th>
                <th className="px-4 py-2.5 font-medium">Effective</th>
                <th className="px-4 py-2.5 font-medium">Last updated</th>
                <th className="px-4 py-2.5 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {LEGAL_SLUGS.map((slug) => {
                const doc = bySlug.get(slug);

                if (!doc) {
                  return (
                    <tr key={slug} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium text-muted-foreground">
                        {LEGAL_SLUG_LABELS[slug]}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono">
                          {slug}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground" colSpan={5}>
                        <span className="flex items-center gap-1.5">
                          <TriangleAlertIcon className="size-3.5" />
                          No row in <code className="font-mono">
                            legal_documents
                          </code>{" "}
                          - seed it before it can be edited here.
                        </span>
                      </td>
                    </tr>
                  );
                }

                const valid = parseLegalDoc(doc.doc).ok;

                return (
                  <tr
                    key={slug}
                    className="border-b last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/legal/${slug}`}
                        className="font-medium hover:underline"
                      >
                        {doc.title || LEGAL_SLUG_LABELS[slug]}
                      </Link>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {LEGAL_SLUG_PUBLIC_PATH[slug]}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">
                        {slug}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono">
                        v{doc.version}
                      </Badge>
                    </td>
                    <td className="space-x-1.5 whitespace-nowrap px-4 py-3">
                      {doc.published ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unpublished</Badge>
                      )}
                      {!valid && (
                        <Badge variant="destructive">Malformed</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatLegalDate(doc.effective_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatLegalTimestamp(doc.updated_at)}
                      {doc.updated_by ? (
                        <span className="block text-[11px]">
                          by {doc.updated_by}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/dashboard/legal/${slug}`} />}
                      >
                        <PencilIcon className="mr-1 size-3.5" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
