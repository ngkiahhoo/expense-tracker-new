"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  Home,
  CalendarSync,
  CalendarClock,
  CalendarRange,
  ClipboardCopy,
  ClipboardList,
  Download,
  Dumbbell,
  FolderTree,
  Bell,
  Volume2,
  VolumeX,
  MonitorCog,
  Moon,
  Plus,
  ScrollText,
  History,
  Library,
  ListChecks,
  RotateCw,
  Settings,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import BottomBarButton from "@/components/BottomBarButton";
import { Select } from "@/components/ui/Field";
import type { AppTheme, ThemeMode } from "@/hooks/useThemePreference";
import { getWorkoutState, workoutStorageKey } from "@/services/workoutService";
import { copyTextToClipboard } from "@/utils/clipboard";
import { formatWorkoutAIExport } from "@/utils/formatWorkoutAIExport";
import { createSupabaseBackup, downloadSupabaseBackup } from "@/utils/supabaseBackup";

export type BottomTool =
  "expense" | "recurring" | "payments" | "categories" | "records" | "income" | "reminders" | "reminderLogs";

const BOTTOM_BUTTONS_PER_ROW = 3;
const EXPORTING_STATUS = "Exporting...";
const COPYING_STATUS = "Copying...";

const timeZoneOptions = [
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Hong_Kong",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Jakarta",
  "Asia/Manila",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

const workoutLinks = [
  { href: "/gym?tab=library", icon: Library, label: "Exercise" },
  { href: "/gym?tab=plans", icon: ListChecks, label: "Plan" },
  { href: "/gym?tab=routines", icon: RotateCw, label: "Routine" },
  { href: "/gym?tab=history", icon: History, label: "History" },
] as const;

const actionTools = [
  { tool: "expense", icon: Plus, label: "Add" },
  { tool: "recurring", icon: CalendarSync, label: "Repeat" },
  { tool: "categories", icon: FolderTree, label: "Category" },
  { tool: "records", icon: ClipboardList, label: "Records" },
  { tool: "payments", icon: CalendarClock, label: "Pay Later" },
] as const;

const actionRows = Array.from(
  { length: Math.ceil(actionTools.length / BOTTOM_BUTTONS_PER_ROW) },
  (_, row) =>
    actionTools.slice(
      row * BOTTOM_BUTTONS_PER_ROW,
      (row + 1) * BOTTOM_BUTTONS_PER_ROW,
    ),
).reverse();

interface BottomActionBarProps {
  activeTool: BottomTool | null;
  onToggle: (tool: Exclude<BottomTool, "income">) => void;
  theme: AppTheme;
  themeMode: ThemeMode;
  themeTimeZone: string;
  onThemeModeChange: (mode: ThemeMode) => void;
  onThemeTimeZoneChange: (timeZone: string) => void;
  buttonSoundsEnabled: boolean;
  onButtonSoundsEnabledChange: (enabled: boolean) => void;
  onNavigate: () => void;
}

export default function BottomActionBar({
  activeTool,
  onToggle,
  theme,
  themeMode,
  themeTimeZone,
  onThemeModeChange,
  onThemeTimeZoneChange,
  buttonSoundsEnabled,
  onButtonSoundsEnabledChange,
  onNavigate,
}: BottomActionBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeMenu, setActiveMenu] = useState<"actions" | "plans" | "workout" | "settings" | null>(
    null,
  );

  const isActionsOpen = activeMenu === "actions";
  const isPlansOpen = activeMenu === "plans";
  const isWorkoutOpen = activeMenu === "workout";
  const isSettingsOpen = activeMenu === "settings";
  const gymTab = searchParams.get("tab") || "home";
  const isGym = pathname === "/gym";
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [workoutExportStatus, setWorkoutExportStatus] = useState("");

  async function exportAllData() {
    setBackupStatus(EXPORTING_STATUS);
    try {
      downloadSupabaseBackup(await createSupabaseBackup());
      setBackupStatus("Backup downloaded");
    } catch (cause) {
      setBackupStatus(cause instanceof Error ? cause.message : "Backup failed.");
    }
  }

  async function copyWorkoutAIExport() {
    setWorkoutExportStatus(COPYING_STATUS);
    try {
      let state: unknown = null;
      try {
        state = await getWorkoutState();
      } catch {
        const raw = window.localStorage.getItem(workoutStorageKey);
        state = raw ? JSON.parse(raw) : null;
      }

      const copied = await copyTextToClipboard(formatWorkoutAIExport(state));
      setWorkoutExportStatus(copied ? "AI export copied" : "Copy failed");
    } catch (cause) {
      setWorkoutExportStatus(cause instanceof Error ? cause.message : "AI export failed.");
    }
  }

  const themePanel = themeSettingsOpen && (
    <div className="col-span-3 rounded-lg border border-white/10 bg-black/35 p-3 text-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Theme</p>
          <p className="text-xs text-zinc-400">
            Auto uses light from 7 AM to 7 PM.
          </p>
        </div>
        <MonitorCog className="size-5 shrink-0 text-zinc-400" aria-hidden="true" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-zinc-300">
          Mode
          <Select
            fieldSize="md"
            className="mt-1"
            value={themeMode}
            onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Auto</option>
          </Select>
        </label>
        <label className="block text-xs font-medium text-zinc-300">
          Time zone
          <Select
            fieldSize="md"
            className="mt-1"
            value={themeTimeZone}
            onChange={(event) => onThemeTimeZoneChange(event.target.value)}
          >
            {!timeZoneOptions.includes(themeTimeZone) && (
              <option value={themeTimeZone}>{themeTimeZone}</option>
            )}
            {timeZoneOptions.map((timeZone) => (
              <option key={timeZone} value={timeZone}>{timeZone}</option>
            ))}
          </Select>
        </label>
      </div>
    </div>
  );

  return (
    <nav className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bottom-glow-bar px-3 pb-[env(safe-area-inset-bottom)] lg:px-6 ${isGym ? "gym-bottom-bar" : ""}`}>
      <div className="mx-auto max-w-md py-3 md:max-w-2xl lg:max-w-2xl">
        <div
          className={`
            grid
            overflow-hidden
            transition-[grid-template-rows,opacity,margin]
            duration-300
            ${
              isActionsOpen || isPlansOpen || isWorkoutOpen || isSettingsOpen
                ? "mb-3 grid-rows-[1fr] opacity-100"
                : "mb-0 grid-rows-[0fr] opacity-0"
            }
          `}
        >
          <div className="min-h-0 overflow-hidden">
            {!isGym && isActionsOpen && (
              <div className="flex flex-col gap-2">
                {actionRows.map((row) => (
                  <div key={row[0].tool} className="grid grid-cols-3 gap-2">
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

            {!isGym && isPlansOpen && (
              <div className="grid grid-cols-3 gap-2">
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
              </div>
            )}

            {isGym && isWorkoutOpen && (
              <div className="grid grid-cols-3 gap-2">
                {workoutLinks.map(({ href, icon, label }) => (
                  <BottomBarButton
                    key={href}
                    active={isGym && href.endsWith(`tab=${gymTab}`)}
                    href={href}
                    onClick={() => {
                      setActiveMenu(null);
                      onNavigate();
                    }}
                    icon={icon}
                    label={label}
                  />
                ))}
              </div>
            )}

            {isSettingsOpen && (
              <div className="grid grid-cols-3 gap-2">
                {themePanel}
                {!isGym && (
                  <>
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
                      active={false}
                      href="/gym"
                      icon={Dumbbell}
                      label="Gym"
                      onClick={() => {
                        setActiveMenu(null);
                        onNavigate();
                      }}
                    />
                  </>
                )}
                <BottomBarButton
                  active={themeSettingsOpen || themeMode === "auto" || theme === "light"}
                  onClick={() => {
                    setThemeSettingsOpen((current) => !current);
                  }}
                  icon={theme === "dark" ? Moon : Sun}
                  label={themeMode === "auto" ? "Auto theme" : "Theme"}
                />
                <BottomBarButton
                  active={buttonSoundsEnabled}
                  onClick={() => onButtonSoundsEnabledChange(!buttonSoundsEnabled)}
                  icon={buttonSoundsEnabled ? Volume2 : VolumeX}
                  label={buttonSoundsEnabled ? "Sound on" : "Sound off"}
                />
                {!isGym && (
                  <>
                    <BottomBarButton
                      active={activeTool === "reminders"}
                      onClick={() => {
                        onToggle("reminders");
                        setActiveMenu(null);
                      }}
                      icon={Bell}
                      label="Reminder"
                    />
                    <BottomBarButton
                      active={activeTool === "reminderLogs"}
                      onClick={() => {
                        onToggle("reminderLogs");
                        setActiveMenu(null);
                      }}
                      icon={ScrollText}
                      label="Logs"
                    />
                  </>
                )}
                <BottomBarButton
                  active={false}
                  onClick={() => void exportAllData()}
                  icon={Download}
                  label={backupStatus === EXPORTING_STATUS ? EXPORTING_STATUS : "Export all data"}
                />
                {isGym && (
                  <BottomBarButton
                    active={workoutExportStatus === "AI export copied"}
                    onClick={() => void copyWorkoutAIExport()}
                    icon={ClipboardCopy}
                    label={workoutExportStatus === COPYING_STATUS ? COPYING_STATUS : "Export for AI"}
                  />
                )}
                {isGym && (
                  <BottomBarButton
                    active={activeTool === "income"}
                    href="/"
                    onClick={() => {
                      setActiveMenu(null);
                      onNavigate();
                    }}
                    icon={WalletCards}
                    label="Money"
                  />
                )}
                {backupStatus && backupStatus !== EXPORTING_STATUS && <p role="status" className="col-span-3 rounded-xl bg-black/40 px-3 py-2 text-xs text-zinc-300">{backupStatus}</p>}
                {workoutExportStatus && workoutExportStatus !== COPYING_STATUS && <p role="status" className="col-span-3 rounded-xl bg-black/40 px-3 py-2 text-xs text-zinc-300">{workoutExportStatus}</p>}
              </div>
            )}
          </div>
        </div>

        {isGym ? (
          <div className="grid grid-cols-3 gap-2">
            <BottomBarButton
              active={isWorkoutOpen || gymTab !== "progress"}
              onClick={() =>
                setActiveMenu((current) =>
                  current === "workout" ? null : "workout",
                )
              }
              icon={Dumbbell}
              label="Workout"
            />

            <BottomBarButton
              active={gymTab === "progress"}
              href="/gym?tab=progress"
              onClick={() => {
                setActiveMenu(null);
                onNavigate();
              }}
              icon={TrendingUp}
              label="Progress"
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
        ) : (
          <div className="grid grid-cols-3 gap-2">
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
              active={isPlansOpen}
              onClick={() =>
                setActiveMenu((current) =>
                  current === "plans" ? null : "plans",
                )
              }
              icon={CalendarRange}
              label="Plan"
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
        )}
      </div>
    </nav>
  );
}
