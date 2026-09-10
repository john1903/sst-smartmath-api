import { useMemo } from "react";
import katex from "katex";

interface Segment {
  kind: "text" | "math";
  content: string;
  displayMode?: boolean;
}

const DOUBLE = "$$";
const SINGLE = "$";

function tokenize(input: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < input.length) {
    if (input.startsWith(DOUBLE, i)) {
      const end = input.indexOf(DOUBLE, i + DOUBLE.length);
      if (end === -1) {
        out.push({ kind: "text", content: input.slice(i) });
        break;
      }
      const content = input.slice(i + DOUBLE.length, end);
      out.push({ kind: "math", content, displayMode: true });
      i = end + DOUBLE.length;
      continue;
    }
    if (input[i] === SINGLE) {
      const end = input.indexOf(SINGLE, i + 1);
      if (end === -1) {
        out.push({ kind: "text", content: input.slice(i) });
        break;
      }
      const content = input.slice(i + 1, end);
      out.push({ kind: "math", content, displayMode: false });
      i = end + 1;
      continue;
    }
    let next = i;
    while (next < input.length && input[next] !== SINGLE) next++;
    out.push({ kind: "text", content: input.slice(i, next) });
    i = next;
  }
  return out;
}

function renderMath(content: string, displayMode: boolean): string {
  try {
    return katex.renderToString(content, {
      throwOnError: false,
      displayMode,
      errorColor: "var(--sm-danger)",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `<span style="color:var(--sm-danger)">${msg}</span>`;
  }
}

export function LatexPreview({ value }: { value: string }) {
  const html = useMemo(() => {
    if (!value) return "";
    return tokenize(value)
      .map((seg) =>
        seg.kind === "math"
          ? renderMath(seg.content, seg.displayMode ?? false)
          : escapeHtml(seg.content),
      )
      .join("");
  }, [value]);

  if (!value) return null;

  return (
    <div
      className="latex-preview"
      // KaTeX-generated markup is sanitised by KaTeX itself.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br />");
}
