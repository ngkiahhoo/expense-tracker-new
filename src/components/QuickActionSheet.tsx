"use client";

import type {
  FocusEventHandler,
  ReactNode,
} from "react";

import ActionIconButton from "@/components/ui/ActionIconButton";
import {
  cn,
  overlayStyles,
} from "@/components/ui/styles";

interface QuickActionSheetProps {
  children:ReactNode;
  onClose:() => void;
  onFocusCapture?:FocusEventHandler<HTMLDivElement>;
  title:string;
  widthClass:string;
}

export default function QuickActionSheet({
  children,
  onClose,
  onFocusCapture,
  title,
  widthClass,
}:QuickActionSheetProps) {
  return (
    <div
      className={`
        fixed
        inset-x-0
        bottom-24
        z-40
        px-4
        md:bottom-28
        md:px-6
        lg:inset-x-auto
        lg:top-8
        lg:right-8
        lg:bottom-28
        lg:px-0
        lg:max-w-[calc(100vw-2rem)]
        ${widthClass}
      `}
      onFocusCapture={onFocusCapture}
    >
      <div
        className={cn(
          "mx-auto max-h-[68vh] w-full max-w-md overflow-y-auto md:max-w-2xl md:max-h-[72vh] lg:max-w-none lg:max-h-full",
          overlayStyles.sheetPanel,
          "rounded-3xl"
        )}
      >
        <div className={overlayStyles.stickyHeader}>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Quick Action
            </p>

            <h2 className="text-xl font-bold">
              {title}
            </h2>
          </div>

          <ActionIconButton
            kind="close"
            onClick={onClose}
            title="Close panel"
            aria-label="Close panel"
          />
        </div>

        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
