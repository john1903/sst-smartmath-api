import { useState, useRef, type Ref } from "react";
import { LatexPreview } from "./LatexPreview";
import { LatexToolbar } from "./LatexToolbar";

interface CommonProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement | null>;
}

type SingleLineProps = CommonProps & { multiline?: false; rows?: never };
type MultilineProps = CommonProps & { multiline: true; rows?: number };

type Props = SingleLineProps | MultilineProps;

function assignRef<T>(
  ref: Ref<T | null> | undefined,
  value: T | null,
): void {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as { current: T | null }).current = value;
}

export function LatexInput(props: Props) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const {
    value,
    onChange,
    placeholder,
    className,
    maxLength,
    onKeyDown,
    required,
    autoFocus,
    inputRef,
  } = props;

  const inputClass = ["field__input", className].filter(Boolean).join(" ");

  const setEl = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
    ref.current = el;
    assignRef(inputRef, el);
  };

  function handleBlur(e: React.FocusEvent) {
    const nextTarget = e.relatedTarget as Node | null;
    if (nextTarget && containerRef.current?.contains(nextTarget)) return;
    setFocused(false);
  }

  return (
    <div
      className="latex-input"
      ref={containerRef}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      <div className="latex-input__field">
        {props.multiline ? (
          <textarea
            ref={setEl}
            className={`${inputClass} field__input--multiline`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={props.rows ?? 3}
            onKeyDown={onKeyDown}
            required={required}
            autoFocus={autoFocus}
          />
        ) : (
          <input
            ref={setEl}
            type="text"
            className={inputClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            onKeyDown={onKeyDown}
            required={required}
            autoFocus={autoFocus}
          />
        )}
        {focused ? (
          <div className="latex-input__floating">
            <LatexToolbar targetRef={ref} value={value} onChange={onChange} />
          </div>
        ) : null}
      </div>
      <LatexPreview value={value} />
    </div>
  );
}
