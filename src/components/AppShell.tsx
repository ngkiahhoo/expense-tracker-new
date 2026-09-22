"use client";

import { Suspense, createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, WalletCards } from "lucide-react";
import BottomActionBar, { type BottomTool } from "./BottomActionBar";
import useButtonClickSounds from "@/hooks/useButtonClickSounds";
import useSoundPreference from "@/hooks/useSoundPreference";
import useThemePreference from "../hooks/useThemePreference";
import SyncStatus from "./SyncStatus";
import { confirmPanelClose } from "@/hooks/useUnsavedChanges";

const ToolsContext = createContext<{ activeTool: BottomTool | null; setActiveTool: Dispatch<SetStateAction<BottomTool | null>> } | null>(null);
export function useAppTools() {
  const context = useContext(ToolsContext);
  if (!context) throw new Error("App tools require AppShell");
  return context;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [activeTool, setActiveTool] = useState<BottomTool | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const {
    theme,
    mode: themeMode,
    timeZone: themeTimeZone,
    setThemeMode,
    setThemeTimeZone,
  } = useThemePreference();
  const {
    buttonSoundsEnabled,
    setButtonSoundsEnabled,
  } = useSoundPreference();
  useButtonClickSounds(buttonSoundsEnabled);
  useEffect(() => {
    document.documentElement.classList.toggle("light-theme", theme === "light");
  }, [theme]);
  return <ToolsContext.Provider value={{ activeTool, setActiveTool }}>
    <div className={`${theme === "light" ? "light-theme" : ""} min-h-screen app-background pb-[calc(7rem+env(safe-area-inset-bottom))]`}>
      <SyncStatus />
      <button
        type="button"
        className={`app-settings-trigger ${pathname === "/gym" ? "app-settings-trigger-gym" : ""}`}
        aria-label={pathname === "/gym" ? "Go to Money" : "Go to Gym"}
        title={pathname === "/gym" ? "Money" : "Gym"}
        onClick={() => {
          if (!confirmPanelClose()) return;
          setActiveTool(null);
          router.push(pathname === "/gym" ? "/" : "/gym");
        }}
      >
        {pathname === "/gym"
          ? <WalletCards className="size-5" aria-hidden="true" />
          : <Dumbbell className="size-5" aria-hidden="true" />}
      </button>
      {children}
      <Suspense fallback={null}>
        <BottomActionBar key={pathname} activeTool={pathname === "/" ? activeTool : null}
          onToggle={tool => {
            if (activeTool && !confirmPanelClose()) return;
            setActiveTool(current => pathname === "/" && current === tool ? null : tool);
            if (pathname !== "/") router.push("/");
          }} theme={theme} themeMode={themeMode} themeTimeZone={themeTimeZone} onThemeModeChange={setThemeMode} onThemeTimeZoneChange={setThemeTimeZone} buttonSoundsEnabled={buttonSoundsEnabled} onButtonSoundsEnabledChange={setButtonSoundsEnabled} onNavigate={() => setActiveTool(null)} />
      </Suspense>
    </div>
  </ToolsContext.Provider>;
}
