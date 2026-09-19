"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { getSyncStates, subscribeSync, type SyncState } from "@/utils/syncStatus";
const empty: SyncState[] = [];
export default function SyncStatus() {
  const states = useSyncExternalStore(subscribeSync, getSyncStates, () => empty);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const timer = setTimeout(update, 0);
    window.addEventListener("offline", update); window.addEventListener("online", update);
    return () => { clearTimeout(timer); window.removeEventListener("offline", update); window.removeEventListener("online", update); };
  }, []);
  if (!offline && !states.length) return null;
  return <aside aria-live="polite" className="relative z-[60] space-y-2 border-b border-amber-400/30 bg-zinc-950 px-4 py-2 text-sm text-amber-300">
    {offline && <p className="flex items-center gap-2"><WifiOff size={16} />Offline. Changes are not confirmed in the cloud.</p>}
    {states.map(state => <div key={state.key} className="flex items-center justify-between gap-3"><p className="min-w-0 break-words">{state.key.replaceAll("_", " ")}: {state.error || "Saving to cloud..."}</p>{state.error && <button className="shrink-0 p-2" title="Retry sync" aria-label={`Retry ${state.key}`} onClick={state.retry}><RefreshCw size={18} /></button>}</div>)}
  </aside>;
}
