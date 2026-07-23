"use client";

/**
 * Uploads the single shared Persona Atlas PDF to Storage (upsert at a stable
 * key) and shows a link to the current file. Mirrors the blog editor's
 * thumbnail-upload control, adapted for a PDF and a fixed object key.
 */
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { uploadAtlasPdfAction } from "@/app/dashboard/personas/actions";

interface AtlasPdfUploaderProps {
  /** Public URL of the currently-stored Atlas PDF, if any. */
  currentUrl: string | null;
}

export function AtlasPdfUploader({ currentUrl }: AtlasPdfUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(currentUrl);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("File must be a PDF");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const { url: next, error } = await uploadAtlasPdfAction(fd);
      if (error || !next) {
        toast.error(`Upload failed: ${error ?? "unknown error"}`);
        return;
      }
      // Bust any cached view of the stable key so the link reflects the new PDF.
      setUrl(`${next}?t=${Date.now()}`);
      toast.success("Atlas PDF uploaded");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Persona Atlas PDF</CardTitle>
        <CardDescription>
          The shared Atlas document surfaced in the web app. Uploading replaces
          the current file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <FileText className="size-4" />
              View current Atlas PDF
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">
              No Atlas PDF uploaded yet.
            </span>
          )}
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => document.getElementById("atlas-pdf-file")?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-1 size-4" />
            )}
            {url ? "Replace PDF" : "Upload PDF"}
          </Button>
          <input
            id="atlas-pdf-file"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </CardContent>
    </Card>
  );
}
