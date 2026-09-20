"use client";

import { useEffect, useSyncExternalStore } from "react";

export type AppTheme =
  | "dark"
  | "light";

export type ThemeMode =
  | AppTheme
  | "auto";

const themeStorageKey =
  "expense-tracker-theme";

const themeTimezoneStorageKey =
  "expense-tracker-theme-timezone";

const themeChangeEvent =
  "expense-tracker-theme-change";

const autoLightStartHour = 7;
const autoDarkStartHour = 19;

type ThemeSnapshot = {
  mode: ThemeMode;
  theme: AppTheme;
  timeZone: string;
};

let cachedSnapshot: ThemeSnapshot | null = null;

const serverSnapshot: ThemeSnapshot = {
  mode: "dark",
  theme: "dark",
  timeZone: "Asia/Kuala_Lumpur",
};

function dispatchThemeChange() {
  window.dispatchEvent(new Event(themeChangeEvent));
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur";
  } catch {
    return "Asia/Kuala_Lumpur";
  }
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(themeStorageKey);
  return stored === "light" || stored === "auto" ? stored : "dark";
}

function getStoredTimeZone() {
  if (typeof window === "undefined") {
    return "Asia/Kuala_Lumpur";
  }

  return window.localStorage.getItem(themeTimezoneStorageKey) || getBrowserTimeZone();
}

function getHourInTimeZone(timeZone: string, date = new Date()) {
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(date);

    return Number(hour);
  } catch {
    return date.getHours();
  }
}

function resolveTheme(mode: ThemeMode, timeZone: string): AppTheme {
  if (mode !== "auto") {
    return mode;
  }

  const hour = getHourInTimeZone(timeZone);
  return hour >= autoLightStartHour && hour < autoDarkStartHour
    ? "light"
    : "dark";
}

function getSnapshot() {
  const mode = getStoredMode();
  const timeZone = getStoredTimeZone();
  const theme = resolveTheme(mode, timeZone);

  if (
    cachedSnapshot &&
    cachedSnapshot.mode === mode &&
    cachedSnapshot.theme === theme &&
    cachedSnapshot.timeZone === timeZone
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = { mode, theme, timeZone };
  return cachedSnapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function subscribeTheme(
  callback: () => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange =
    () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener(themeChangeEvent, handleChange);

  const timer = window.setInterval(handleChange, 60_000);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(themeChangeEvent, handleChange);
    window.clearInterval(timer);
  };
}

export default function useThemePreference() {
  const snapshot =
    useSyncExternalStore(
      subscribeTheme,
      getSnapshot,
      getServerSnapshot
    );

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !window.localStorage.getItem(themeTimezoneStorageKey)
    ) {
      window.localStorage.setItem(themeTimezoneStorageKey, getBrowserTimeZone());
      dispatchThemeChange();
    }
  }, []);

  function setThemeMode(mode: ThemeMode) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(themeStorageKey, mode);
    dispatchThemeChange();
  }

  function setThemeTimeZone(timeZone: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(themeTimezoneStorageKey, timeZone);
    dispatchThemeChange();
  }

  function toggleTheme() {
    setThemeMode(snapshot.theme === "dark" ? "light" : "dark");
  }

  return {
    ...snapshot,
    autoLightStartHour,
    autoDarkStartHour,
    setThemeMode,
    setThemeTimeZone,
    toggleTheme,
  };
}
