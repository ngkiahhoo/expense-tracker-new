"use client";

import { useState } from "react";

import {
  Home,
  CalendarSync,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  Download,
  FolderTree,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Target,
} from "lucide-react";

import BottomBarButton from "@/components/BottomBarButton";
import { createSupabaseBackup, downloadSupabaseBackup } from "@/utils/supabaseBackup";

export type BottomTool =
  "expense" | "recurring" | "payments" | "categories" | "records" | "income";

const ACTION_BUTTONS_PER_ROW = 2;

const actionTools = [
  { tool: "expense", icon: Plus, label: "Add" },
  { tool: "recurring", icon: CalendarSync, label: "Repeat" },
  { tool: "categories", icon: FolderTree, label: "Category" },
  { tool: "records", icon: ClipboardList, label: "Records" },
  { tool: "payments", icon: CalendarClock, label: "Pay Later" },
] as const;

// Match the two-column Action / Settings row; new tools add rows above it.
const actionRows = Array.from(
  { length: Math.ceil(actionTools.length / ACTION_BUTTONS_PER_ROW) },
  (_, row) =>
    actionTools.slice(
      row * ACTION_BUTTONS_PER_ROW,
      (row + 1) * ACTION_BUTTONS_PER_ROW,
    ),
).reverse();

interface BottomActionBarProps {
  activeTool: BottomTool | null;
  onToggle: (tool: Exclude<BottomTool, "income">) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onNavigate: () => void;
}

export default function BottomActionBar({
  activeTool,
  onToggle,
  theme,
  onToggleTheme,
  onNavigate,
}: BottomActionBarProps) {
  const [activeMenu, setActiveMenu] = useState<"actions" | "settings" | null>(
    null,
  );

  const isActionsOpen = activeMenu === "actions";

  const isSettingsOpen = activeMenu === "settings";
  const [backupStatus, setBackupStatus] = useState("");

  async function exportAllData() {
    setBackupStatus("Exporting…");
    try {
      downloadSupabaseBackup(await createSupabaseBackup());
      setBackupStatus("Backup downloaded");
    } catch (cause) {
      setBackupStatus(cause instanceof Error ? cause.message : "Backup failed.");
    }
  }

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
              <div className="flex flex-col gap-2">
                {actionRows.map((row) => (
                  <div key={row[0].tool} className="grid grid-cols-2 gap-2">
                    {row.map(({ tool, icon, label }) => (
                      <BottomBarButton
                        key={tool}
                        active={activeTool === tool}
                        onClick={() => {
                          onToggle(tool);
                          setActiveMenu(null);
                        }}
                        icon={icon}
                        label={label}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {isSettingsOpen && (
              <div className="grid grid-cols-2 gap-2">
                <BottomBarButton
                  active={false}
                  href="/"
                  icon={Home}
                  label="Dashboard"
                  onClick={() => {
                    setActiveMenu(null);
                    onNavigate();
                  }}
                />
                <BottomBarButton
                  active={theme === "light"}
                  onClick={() => {
                    onToggleTheme();
                    setActiveMenu(null);
                  }}
                  icon={theme === "dark" ? Moon : Sun}
                  label="Theme"
                />

                <BottomBarButton
                  active={false}
                  href="/savings-goals"
                  onClick={() => {
                    setActiveMenu(null);
                    onNavigate();
                  }}
                  icon={Target}
                  label="Goals"
                />
                <BottomBarButton
                  active={false}
                  href="/future-expense-plans"
                  onClick={() => {
                    setActiveMenu(null);
                    onNavigate();
                  }}
                  icon={ClipboardList}
                  label="Living Cost"
                />
                <BottomBarButton
                  active={false}
                  href="/financial-events"
                  onClick={() => {
                    setActiveMenu(null);
                    onNavigate();
                  }}
                  icon={CalendarRange}
                  label="Events"
                />
                <BottomBarButton
                  active={false}
                  onClick={() => void exportAllData()}
                  icon={Download}
                  label={backupStatus === "Exporting…" ? "Exporting…" : "Export all data"}
                />
                {backupStatus && backupStatus !== "Exporting…" && <p role="status" className="col-span-2 rounded-xl bg-black/40 px-3 py-2 text-xs text-zinc-300">{backupStatus}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <BottomBarButton
            active={isActionsOpen}
            onClick={() =>
              setActiveMenu((current) =>
                current === "actions" ? null : "actions",
              )
            }
            icon={Sparkles}
            label="Action"
          />

          <BottomBarButton
            active={isSettingsOpen}
            onClick={() =>
              setActiveMenu((current) =>
                current === "settings" ? null : "settings",
              )
            }
            icon={Settings}
            label="Settings"
          />
        </div>
      </div>
    </nav>
  );
}
