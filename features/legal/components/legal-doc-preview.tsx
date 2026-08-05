"use client";

/**
 * Live preview of a `LegalDoc`, laid out the way the public site lays it out.
 *
 * This is a deliberate structural mirror of the web repo's
 * `components/legal/LegalArticle` + `legal-primitives`: same element order,
 * same masthead / intro / numbered sections / optional callout, same
 * two-column table. The point is that an admin can see the consequence of an
 * edit before publishing it, so structure fidelity matters more than pixel
 * fidelity -- the colours here come from the admin theme, not the public
 * site's `--paper` / `--ink` tokens, and the surrounding UI says so.
 *
 * Pure and presentational: no data fetching, no actions.
 */
import type { LegalBlock, LegalDoc } from "../types";

/** One content block, matching the public renderer's exhaustive switch. */
function BlockView({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="mb-3 text-sm leading-relaxed text-foreground/80">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="mb-3 list-disc space-y-1.5 pl-6">
          {block.items.map((item, i) => (
            // Blocks and their items have no identity beyond position here.
            <li key={i} className="text-sm leading-relaxed text-foreground/80">
              {item}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="mb-4 overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                {block.headers.map((header, i) => (
                  <th
                    key={i}
                    className="border-b px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map(([left, right], i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="w-[34%] px-3.5 py-2.5 align-top font-medium text-foreground">
                    {left}
                  </td>
                  <td className="px-3.5 py-2.5 leading-relaxed text-foreground/80">
                    {right}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/**
 * Render a full document preview.
 *
 * @param props.doc      - The document to render.
 * @param props.overline - Small-caps kicker above the title, as the public
 *   page passes to `LegalArticle` (e.g. "Legal").
 */
export function LegalDocPreview({
  doc,
  overline = "Legal",
}: {
  doc: LegalDoc;
  overline?: string;
}) {
  return (
    <article className="mx-auto max-w-3xl px-1 py-2">
      <header className="mb-9">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {overline}
        </p>
        <h1 className="mb-4 text-4xl font-semibold leading-tight tracking-tight text-foreground">
          {doc.title}
        </h1>
        <div className="space-y-0.5 font-mono text-[11.5px] leading-relaxed tracking-wide text-muted-foreground">
          {doc.meta.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </header>

      {doc.intro.map((text, i) => (
        <p key={i} className="mb-3 text-sm leading-relaxed text-foreground/80">
          {text}
        </p>
      ))}

      {doc.sections.map((section, si) => (
        <section key={si} className="mt-8">
          <h2 className="mb-2.5 text-[22px] font-semibold leading-snug text-foreground">
            {section.heading}
          </h2>
          {section.blocks.map((block, bi) => (
            <BlockView key={bi} block={block} />
          ))}
        </section>
      ))}

      {doc.callout && (
        // The public page renders this with a 1.5px #F4845F border and a 7%
        // tint of the same warm accent; `primary` is that accent in this theme.
        <aside className="mt-11 rounded-lg border-[1.5px] border-primary bg-primary/[0.07] px-6 py-6">
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
            {doc.callout.heading}
          </p>
          {doc.callout.paragraphs.map((text, i) => (
            <p key={i} className="mb-2.5 text-sm leading-relaxed text-foreground">
              {text}
            </p>
          ))}
        </aside>
      )}
    </article>
  );
}
