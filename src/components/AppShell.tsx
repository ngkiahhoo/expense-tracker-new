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
import { isSupabaseConfigured } from "@/lib/supabase";
import useGymThemePreference from "@/hooks/useGymThemePreference";

const ToolsContext = createContext<{ activeTool: BottomTool | null; setActiveTool: Dispatch<SetStateAction<BottomTool | null>> } | null>(null);
export function useAppTools() {
  const context = useContext(ToolsContext);
  if (!context) throw new Error("App tools require AppShell");
  return context;
}

export default function AppShell({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 flex items-center justify-center">
    <section className="max-w-xl rounded-2xl border border-emerald-800 bg-slate-900 p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Connect your existing database</h1>
      <p>This local installation is missing its Supabase configuration. Your saved data has not been changed.</p>
      <p>Restore your project’s <code>.env.local</code> file in the project root with these settings, then restart the development server:</p>
      <ul className="list-disc pl-5 break-all"><li><code>NEXT_PUBLIC_SUPABASE_URL</code></li><li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li></ul>
      <p>Use the existing project’s public URL and anon key, not a service-role secret.</p>
    </section>
  </main>;
  return <ConfiguredAppShell>{children}</ConfiguredAppShell>;
}

function ConfiguredAppShell({ children }: { children: ReactNode }) {
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
  const gymTheme = useGymThemePreference();
  useButtonClickSounds(buttonSoundsEnabled);
  useEffect(() => {
    document.documentElement.classList.toggle("light-theme", theme === "light");
  }, [theme]);
  useEffect(() => {
    const themeClass = `gym-theme-${gymTheme.color}`;
    if (pathname === "/gym") document.body.classList.add(themeClass);
    return () => document.body.classList.remove(themeClass);
  }, [gymTheme.color, pathname]);
  return <ToolsContext.Provider value={{ activeTool, setActiveTool }}>
    <div className={`${theme === "light" ? "light-theme" : ""} gym-theme-${gymTheme.color} min-h-screen app-background pb-[calc(7rem+env(safe-area-inset-bottom))]`}>
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
          }} theme={theme} themeMode={themeMode} themeTimeZone={themeTimeZone} onThemeModeChange={setThemeMode} onThemeTimeZoneChange={setThemeTimeZone} buttonSoundsEnabled={buttonSoundsEnabled} onButtonSoundsEnabledChange={setButtonSoundsEnabled} onNavigate={() => setActiveTool(null)} gymThemeColor={gymTheme.selectedColor} gymThemeAuto={gymTheme.auto} onGymThemeColorChange={gymTheme.setColor} onGymThemeAutoChange={gymTheme.setAuto} />
      </Suspense>
    </div>
  </ToolsContext.Provider>;
}
