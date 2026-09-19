"use client";
import { useCallback, useSyncExternalStore, type SetStateAction } from "react";

const memory = new Map<string, string>();
const change = "workspace-session-state";
function read(key: string) {
  try { return sessionStorage.getItem(key) ?? memory.get(key) ?? null; }
  catch { return memory.get(key) ?? null; }
}
function subscribe(callback: () => void) {
  window.addEventListener(change, callback);
  return () => window.removeEventListener(change, callback);
}
/** Tab-local preferences and drafts survive panel unmounts without changing cloud data. */
export default function useSessionState<T>(key: string, initial: T) {
  const snapshot = useSyncExternalStore(subscribe, () => read(key), () => null);
  function parse(raw: string | null): T {
    try { return raw === null ? initial : JSON.parse(raw) as T; } catch { return initial; }
  }
  const value = parse(snapshot);
  const set = useCallback((next: SetStateAction<T>) => {
    let previous = initial;
    try { const raw = read(key); if (raw !== null) previous = JSON.parse(raw) as T; } catch { /* Use default if storage is damaged. */ }
    const updated = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
    const raw = JSON.stringify(updated);
    memory.set(key, raw);
    try { sessionStorage.setItem(key, raw); } catch { /* Keep in-memory state when storage is unavailable. */ }
    window.dispatchEvent(new Event(change));
  }, [key, initial]);
  return [value, set] as const;
}
