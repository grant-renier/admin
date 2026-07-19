"use client";

/**
 * Renders markdown to real HTML via react-markdown + remark-gfm, replacing the
 * old fake `whitespace-pre-wrap` raw-text preview. Styling is applied with
 * scoped element selectors because the project has no @tailwindcss/typography
 * (`prose`) plugin installed.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  /** Raw markdown source to render. */
  source: string;
  /** Extra classes merged onto the scroll container. */
  className?: string;
}

export function MarkdownPreview({ source, className }: MarkdownPreviewProps) {
  return (
    <div
      className={cn(
        "min-h-[300px] overflow-auto rounded-md border bg-muted/30 p-4 text-sm",
        // Scoped typographic rhythm for common markdown blocks.
        "[&_h1]:mb-3 [&_h1]:mt-2 [&_h1]:text-2xl [&_h1]:font-bold",
        "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold",
        "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold",
        "[&_p]:mb-3 [&_p]:leading-relaxed",
        "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6",
        "[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_li]:mb-1",
        "[&_a]:text-primary [&_a]:underline",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
        "[&_pre]:mb-3 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs",
        "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        "[&_hr]:my-4 [&_hr]:border-border",
        "[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md",
        className
      )}
    >
      {source.trim() ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
      ) : (
        <p className="text-muted-foreground">Nothing to preview.</p>
      )}
    </div>
  );
}
