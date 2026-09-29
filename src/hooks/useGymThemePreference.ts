"use client";
import { useSyncExternalStore } from "react";

export type GymThemeColor = "green" | "purple" | "blue" | "orange";
export const gymThemeColors: Array<{ value: GymThemeColor; label: string }> = [
  { value: "green", label: "Green" }, { value: "purple", label: "Purple" },
  { value: "blue", label: "Blue" }, { value: "orange", label: "Warm orange" },
];
const colorKey = "expense-tracker-gym-theme-color";
const autoKey = "expense-tracker-gym-theme-auto";
const changeEvent = "expense-tracker-gym-theme-change";
type GymThemeSnapshot = { color: GymThemeColor; selectedColor: GymThemeColor; auto: boolean };
let cachedSnapshot: GymThemeSnapshot | null = null;
function readColor(): GymThemeColor {
  if (typeof window === "undefined") return "green";
  const value = window.localStorage.getItem(colorKey) as GymThemeColor | null;
  return gymThemeColors.some(option => option.value === value) ? value! : "green";
}
function readAuto() { return typeof window !== "undefined" && window.localStorage.getItem(autoKey) === "true"; }
function getSnapshot(): GymThemeSnapshot {
  const selectedColor = readColor(); const auto = readAuto();
  const day = Math.floor(Date.now() / 86_400_000);
  const color = auto ? gymThemeColors[day % gymThemeColors.length].value : selectedColor;
  if (cachedSnapshot?.color === color && cachedSnapshot.selectedColor === selectedColor && cachedSnapshot.auto === auto) return cachedSnapshot;
  cachedSnapshot = { color, selectedColor, auto };
  return cachedSnapshot;
}
const serverSnapshot = { color: "green" as GymThemeColor, selectedColor: "green" as GymThemeColor, auto: false };
function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback); window.addEventListener(changeEvent, callback);
  const timer = window.setInterval(callback, 60_000);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(changeEvent, callback); window.clearInterval(timer); };
}
export default function useGymThemePreference() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  function update(color: GymThemeColor, auto: boolean) { window.localStorage.setItem(colorKey, color); window.localStorage.setItem(autoKey, String(auto)); window.dispatchEvent(new Event(changeEvent)); }
  return { ...snapshot, setColor: (color: GymThemeColor) => update(color, false), setAuto: (auto: boolean) => update(snapshot.selectedColor, auto) };
}
