"use client";

import type { LucideIcon } from "lucide-react";

interface BottomBarButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  description: string;
}

export default function BottomBarButton({
  active,
  onClick,
  icon: Icon,
  label,
  description,
}: BottomBarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        min-h-16
        min-w-0
        rounded-2xl
        border
        p-2
        text-left
        transition
        sm:p-3
        md:p-4
        md:text-center
        ${
          active
            ? "border-white/90 bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.2)]"
            : "glass-surface border-white/10 text-white"
        }
      `}
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-2
          md:justify-center
        "
      >
        <Icon
          size={18}
          className="shrink-0"
        />

        <span
          className="
            min-w-0
            truncate
            text-xs
            font-bold
            leading-none
            sm:text-sm
          "
        >
          {label}
        </span>
      </div>

      <p
        className={`
          mt-1
          truncate
          text-[11px]
          leading-none
          ${
            active
              ? "text-zinc-700"
              : "text-zinc-500"
          }
        `}
      >
        {description}
      </p>
    </button>
  );
}
