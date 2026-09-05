import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

type ButtonProps =
  | (ButtonBaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" })
  | (ButtonBaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a" });

function classes(variant: ButtonVariant, size: ButtonSize, fullWidth?: boolean) {
  return [
    "sm-btn",
    `sm-btn--${variant}`,
    `sm-btn--${size}`,
    fullWidth ? "sm-btn--full" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    fullWidth,
    children,
    className,
    ...rest
  } = props as ButtonBaseProps & { className?: string; as?: "button" | "a" };

  const cls = [classes(variant, size, fullWidth), className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {leadingIcon ? <span className="sm-btn__icon">{leadingIcon}</span> : null}
      <span className="sm-btn__label">{children}</span>
      {trailingIcon ? <span className="sm-btn__icon">{trailingIcon}</span> : null}
    </>
  );

  if (props.as === "a") {
    const anchorRest = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a className={cls} {...anchorRest}>
        {content}
      </a>
    );
  }
  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={cls} type={buttonRest.type ?? "button"} {...buttonRest}>
      {content}
    </button>
  );
}
