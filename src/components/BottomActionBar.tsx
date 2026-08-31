"use client";

import {
  CalendarSync,
  ClipboardList,
  FolderTree,
  Plus,
} from "lucide-react";

import BottomBarButton from "@/components/BottomBarButton";

export type BottomTool =
  | "expense"
  | "recurring"
  | "categories"
  | "records"
  | "income";

interface BottomActionBarProps {
  activeTool:BottomTool | null;
  onToggle:(tool:Exclude<BottomTool, "income">) => void;
}

export default function BottomActionBar({
  activeTool,
  onToggle,
}:BottomActionBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bottom-glow-bar px-3 pb-[env(safe-area-inset-bottom)] lg:px-6">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2 py-3 md:max-w-2xl lg:max-w-2xl">
        <BottomBarButton
          active={activeTool === "expense"}
          onClick={() => onToggle("expense")}
          icon={Plus}
          label="Add"
          description="Expense"
        />

        <BottomBarButton
          active={activeTool === "recurring"}
          onClick={() => onToggle("recurring")}
          icon={CalendarSync}
          label="Repeat"
          description="Monthly"
        />

        <BottomBarButton
          active={activeTool === "categories"}
          onClick={() => onToggle("categories")}
          icon={FolderTree}
          label="Cat"
          description="CRUD"
        />

        <BottomBarButton
          active={activeTool === "records"}
          onClick={() => onToggle("records")}
          icon={ClipboardList}
          label="Records"
          description="History"
        />
      </div>
    </nav>
  );
}
