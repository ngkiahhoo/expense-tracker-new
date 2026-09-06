"use client";

import { useState } from "react";

import {
  CalendarSync,
  ClipboardList,
  FolderTree,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
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
  theme:"dark" | "light";
  onToggleTheme:() => void;
}

export default function BottomActionBar({
  activeTool,
  onToggle,
  theme,
  onToggleTheme,
}:BottomActionBarProps) {
  const [activeMenu, setActiveMenu] =
    useState<"actions" | "settings" | null>(null);

  const isActionsOpen =
    activeMenu === "actions";

  const isSettingsOpen =
    activeMenu === "settings";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bottom-glow-bar px-3 pb-[env(safe-area-inset-bottom)] lg:px-6">
      <div className="mx-auto max-w-md py-3 md:max-w-2xl lg:max-w-2xl">
        <div
          className={`
            grid
            overflow-hidden
            transition-[grid-template-rows,opacity,margin]
            duration-300
            ${
              isActionsOpen || isSettingsOpen
                ? "mb-3 grid-rows-[1fr] opacity-100"
                : "mb-0 grid-rows-[0fr] opacity-0"
            }
          `}
        >
          <div className="min-h-0 overflow-hidden">
            {isActionsOpen && (
              <div className="grid grid-cols-4 gap-2">
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
            )}

            {isSettingsOpen && (
              <div className="grid grid-cols-1 gap-2">
                <BottomBarButton
                  active={theme === "light"}
                  onClick={onToggleTheme}
                  icon={theme === "dark" ? Moon : Sun}
                  label="Theme"
                  description={theme === "dark" ? "Dark" : "Light"}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <BottomBarButton
            active={isActionsOpen}
            onClick={() =>
              setActiveMenu((current) =>
                current === "actions"
                  ? null
                  : "actions"
              )
            }
            icon={Sparkles}
            label="Action"
            description="Tools"
          />

          <BottomBarButton
            active={isSettingsOpen}
            onClick={() =>
              setActiveMenu((current) =>
                current === "settings"
                  ? null
                  : "settings"
              )
            }
            icon={Settings}
            label="Settings"
            description="Theme"
          />
        </div>
      </div>
    </nav>
  );
}
