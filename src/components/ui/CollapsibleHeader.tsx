"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "./styles";

interface CollapsibleHeaderProps {
  eyebrow?: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  titleClassName?: string;
}

export default function CollapsibleHeader({
  eyebrow,
  title,
  isOpen,
  onToggle,
  className = "",
  titleClassName = "text-2xl font-bold",
}: CollapsibleHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            {eyebrow}
          </p>
        )}
        <h2 className={cn("truncate text-white", titleClassName)}>
          {title}
        </h2>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse section" : "Expand section"}
        title={isOpen ? "Collapse section" : "Expand section"}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 transition",
          "hover:border-zinc-500 hover:bg-zinc-800 hover:text-white",
          "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        )}
      >
        <ChevronDown
          size={18}
          className={cn("transition-transform", isOpen && "rotate-180")}
        />
      </button>
    </div>
  );
}
