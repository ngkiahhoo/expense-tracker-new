import type { ReactNode } from "react";
import { cn, ui } from "./styles";

export type TextVariant = "body" | "muted" | "faint" | "subtle" | "danger" | "success" | "info" | "accent" | "balance";

export function Text({
  children,
  variant = "muted",
  className = "",
}: {
  children: ReactNode;
  variant?: TextVariant;
  className?: string;
}) {
  return (
    <span className={cn(ui.text[variant], className)}>
      {children}
    </span>
  );
}
