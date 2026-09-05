import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "plain" | "elevated" | "interactive";
export type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  children: ReactNode;
}

export function Card({
  variant = "plain",
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) {
  const cls = [
    "sm-card",
    `sm-card--${variant}`,
    `sm-card--pad-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
