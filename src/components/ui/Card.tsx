import type { HTMLAttributes, ReactNode } from "react";
import { cardStyles, cn } from "./styles";

export type CardVariant = keyof typeof cardStyles.variants;
export type CardPadding = keyof typeof cardStyles.padding;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        cardStyles.base,
        cardStyles.variants[variant],
        cardStyles.padding[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
