"use client";

import type { ButtonHTMLAttributes } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "./styles";

export type ActionIconButtonKind =
  | "edit"
  | "delete"
  | "back"
  | "close";

interface ActionIconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind: ActionIconButtonKind;
}

const icons = {
  edit: Pencil,
  delete: Trash2,
  back: ArrowLeft,
  close: X,
};

const labels = {
  edit: "Edit",
  delete: "Delete",
  back: "Back",
  close: "Close",
};

const tones = {
  edit: "border-white bg-white text-black hover:bg-zinc-100",
  delete: "border-red-600 bg-red-600 text-white hover:bg-red-500",
  back: "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white",
  close: "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white",
};

export default function ActionIconButton({
  kind,
  className = "",
  type = "button",
  title,
  "aria-label": ariaLabel,
  ...props
}: ActionIconButtonProps) {
  const Icon = icons[kind];
  const label = labels[kind];

  return (
    <button
      {...props}
      type={type}
      title={title || label}
      aria-label={ariaLabel || label}
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
        tones[kind],
        className
      )}
    >
      <Icon size={18} />
    </button>
  );
}
