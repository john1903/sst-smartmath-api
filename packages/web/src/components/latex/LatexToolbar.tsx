import type { RefObject } from "react";

type TargetEl = HTMLInputElement | HTMLTextAreaElement;

interface Snippet {
  label: string;
  title: string;
  snippet: string;
  caret: number;
}

const SNIPPETS: (Snippet | "gap")[] = [
  { label: "$$…$$", title: "Display math", snippet: "$$$SEL$$", caret: 2 },
  "gap",
  { label: "√", title: "Square root", snippet: "\\sqrt{$SEL}", caret: 6 },
  { label: "ⁿ√", title: "Nth root", snippet: "\\sqrt[$SEL]{}", caret: 6 },
  { label: "x²", title: "Superscript", snippet: "^{$SEL}", caret: 2 },
  { label: "xₙ", title: "Subscript", snippet: "_{$SEL}", caret: 2 },
  { label: "½", title: "One half", snippet: "\\frac{1}{2}", caret: 11 },
  "gap",
  { label: "∫", title: "Integral", snippet: "\\int_{$SEL}^{}", caret: 5 },
  { label: "∑", title: "Sum", snippet: "\\sum_{$SEL}^{}", caret: 5 },
  { label: "lim", title: "Limit", snippet: "\\lim_{x \\to $SEL}", caret: 12 },
  "gap",
  { label: "π", title: "pi", snippet: "\\pi", caret: 3 },
  { label: "α", title: "alpha", snippet: "\\alpha", caret: 6 },
  { label: "β", title: "beta", snippet: "\\beta", caret: 5 },
  { label: "θ", title: "theta", snippet: "\\theta", caret: 6 },
  { label: "Δ", title: "Delta", snippet: "\\Delta", caret: 6 },
  "gap",
  { label: "ℝ", title: "Real numbers", snippet: "\\mathbb{R}", caret: 10 },
  { label: "ℤ", title: "Integers", snippet: "\\mathbb{Z}", caret: 10 },
  { label: "ℕ", title: "Natural numbers", snippet: "\\mathbb{N}", caret: 10 },
  { label: "ℚ", title: "Rationals", snippet: "\\mathbb{Q}", caret: 10 },
  { label: "∅", title: "Empty set", snippet: "\\emptyset", caret: 9 },
  "gap",
  { label: "∈", title: "Element of", snippet: "\\in", caret: 3 },
  { label: "∉", title: "Not element of", snippet: "\\notin", caret: 6 },
  { label: "∪", title: "Union", snippet: "\\cup", caret: 4 },
  { label: "∩", title: "Intersection", snippet: "\\cap", caret: 4 },
  { label: "⊆", title: "Subset or equal", snippet: "\\subseteq", caret: 9 },
  "gap",
  { label: "⇒", title: "Implies", snippet: "\\Rightarrow", caret: 11 },
  { label: "⇔", title: "If and only if", snippet: "\\Leftrightarrow", caret: 15 },
  { label: "∧", title: "Logical and", snippet: "\\land", caret: 5 },
  { label: "∨", title: "Logical or", snippet: "\\lor", caret: 4 },
  "gap",
  { label: "=", title: "Equals", snippet: "=", caret: 1 },
  { label: "≤", title: "Less than or equal", snippet: "\\le", caret: 3 },
  { label: "≥", title: "Greater than or equal", snippet: "\\ge", caret: 3 },
  { label: "≠", title: "Not equal", snippet: "\\ne", caret: 3 },
  { label: "≈", title: "Approximately equal", snippet: "\\approx", caret: 7 },
  { label: "±", title: "Plus/minus", snippet: "\\pm", caret: 3 },
  { label: "·", title: "Times (dot)", snippet: "\\cdot", caret: 5 },
  { label: "∞", title: "Infinity", snippet: "\\infty", caret: 6 },
  "gap",
  { label: "∠", title: "Angle", snippet: "\\angle ", caret: 7 },
  { label: "°", title: "Degrees", snippet: "^{\\circ}", caret: 8 },
  { label: "|x|", title: "Absolute value", snippet: "|$SEL|", caret: 1 },
  "gap",
  { label: "sin", title: "Sine", snippet: "\\sin($SEL)", caret: 5 },
  { label: "cos", title: "Cosine", snippet: "\\cos($SEL)", caret: 5 },
  { label: "tg", title: "Tangent (tg)", snippet: "\\operatorname{tg}($SEL)", caret: 18 },
  { label: "ctg", title: "Cotangent (ctg)", snippet: "\\operatorname{ctg}($SEL)", caret: 19 },
  { label: "log", title: "Logarithm", snippet: "\\log_{$SEL}", caret: 6 },
  { label: "ln", title: "Natural log", snippet: "\\ln($SEL)", caret: 4 },
];

interface Props {
  targetRef: RefObject<TargetEl | null>;
  value: string;
  onChange: (v: string) => void;
}

function isInsideMath(text: string, pos: number): boolean {
  const before = text.slice(0, pos);
  const doubleCount = (before.match(/\$\$/g) ?? []).length;
  if (doubleCount % 2 === 1) return true;
  const stripped = before.replace(/\$\$/g, "");
  const singleCount = (stripped.match(/\$/g) ?? []).length;
  return singleCount % 2 === 1;
}

function isWrapSnippet(s: Snippet): boolean {
  return s.snippet.startsWith("$") || s.snippet.startsWith("$$");
}

export function LatexToolbar({ targetRef, value, onChange }: Props) {
  function insert(s: Snippet) {
    const el = targetRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const selected = value.slice(start, end);
    let insertText = s.snippet.replace("$SEL", selected);
    let caretOffset = selected ? insertText.length : s.caret;

    if (!isWrapSnippet(s) && !isInsideMath(value, start)) {
      insertText = `$${insertText}$`;
      caretOffset += 1;
    }

    const next = value.slice(0, start) + insertText + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const t = targetRef.current;
      if (!t) return;
      t.focus();
      t.selectionStart = t.selectionEnd = start + caretOffset;
    });
  }

  return (
    <div className="latex-toolbar" role="toolbar" aria-label="Insert math">
      {SNIPPETS.map((s, i) =>
        s === "gap" ? (
          <span key={i} className="latex-toolbar__gap" aria-hidden="true" />
        ) : (
          <button
            key={i}
            type="button"
            className="latex-toolbar__btn"
            title={s.title}
            onMouseDown={(e) => {
              e.preventDefault();
              insert(s);
            }}
          >
            {s.label}
          </button>
        ),
      )}
    </div>
  );
}
