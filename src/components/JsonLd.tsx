import type { ReactElement } from "react";

/**
 * Renders one or more schema.org JSON-LD blocks as native <script> tags —
 * the pattern recommended by the Next.js JSON-LD guide (structured data is
 * not executable code, so next/script is the wrong tool).
 *
 * The `</` escaping follows the official Next.js snippet: it prevents a
 * literal "</script>" sequence inside string values from terminating the
 * tag early.
 */
export function JsonLd({ data }: { data: object | object[] }): ReactElement {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
