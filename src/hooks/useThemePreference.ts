"use client";

import { useSyncExternalStore } from "react";

export type AppTheme =
  | "dark"
  | "light";

const themeStorageKey =
  "expense-tracker-theme";

const themeChangeEvent =
  "expense-tracker-theme-change";

function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.localStorage.getItem(themeStorageKey) === "light"
    ? "light"
    : "dark";
}

function getServerTheme(): AppTheme {
  return "dark";
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

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(themeChangeEvent, handleChange);
  };
}

export default function useThemePreference() {
  const theme =
    useSyncExternalStore(
      subscribeTheme,
      getStoredTheme,
      getServerTheme
    );

  function toggleTheme() {
    if (typeof window === "undefined") {
      return;
    }

    const nextTheme =
      theme === "dark"
        ? "light"
        : "dark";

    window.localStorage.setItem(themeStorageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  return {
    theme,
    toggleTheme,
  };
}
