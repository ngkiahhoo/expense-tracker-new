"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { FutureExpenseLibrary } from "../types/futureExpense";
import { emptyExpenseLibrary } from "../utils/futureExpense";
import { assertExpenseLibrary, mergeLegacyLibrary } from "../utils/expenseStorage";
import { reportSyncState } from "../utils/syncStatus";
import useUnsavedChanges from "./useUnsavedChanges";

const legacyKey = "expense-tracker-future-planning-v2";
const backupKey = "expense-tracker-expense-pending-v1";
const table = "future_expense_workspace";
type Row = { library: FutureExpenseLibrary; revision: number; imported_ids: string[] };

export default function useFutureExpensePlans() {
  const [library, setLibrary] = useState(emptyExpenseLibrary);
  const [loading, setLoading] = useState(true);
  const [storageError, setError] = useState("");
  const [status, setStatus] = useState("Loading plans from database…");
  const [hasBackup, setHasBackup] = useState(false);
  useUnsavedChanges(hasBackup);
  const worker = useRef<() => void>(() => {});
  const state = useRef<{ row: Row | null; pending: FutureExpenseLibrary | null; busy: boolean; generation: number }>({ row: null, pending: null, busy: false, generation: 0 });
  useEffect(() => { reportSyncState({ key: "Living Cost", pending: hasBackup, error: storageError, retry: () => worker.current() }); }, [hasBackup, storageError]);

  useEffect(() => {
    let alive = true;
    const s = state.current;
    async function sync() {
      if (s.busy) return;
      s.busy = true;
      let succeeded = false;
      try {
        setError("");
        if (s.pending && s.row) {
          setStatus("Saving to database…");
          while (s.pending) {
            const next: FutureExpenseLibrary = s.pending;
            const { data, error } = await supabase.from(table).update({ library: next, revision: s.row.revision + 1 }).eq("id", 1).eq("revision", s.row.revision).select("library,revision,imported_ids").maybeSingle();
            if (error) throw error;
            if (!data) throw new Error("Another device changed these plans. Your edits are preserved in this browser. Reload to fetch the latest version before editing again.");
            s.row = data as Row;
            if (s.pending === next) s.pending = null;
          }
          try { localStorage.removeItem(backupKey); } catch { /* Database save succeeded. */ }
          if (alive) setHasBackup(false);
        } else {
          const generation = s.generation;
          const { data, error } = await supabase.from(table).select("library,revision,imported_ids").eq("id", 1).single();
          if (error) throw error;
          const row = data as Row;
          assertExpenseLibrary(row.library);
          if (generation !== s.generation) { succeeded = true; return; }
          if (!s.row) {
            let raw: string | null = null;
            try { raw = localStorage.getItem(legacyKey); } catch { /* Cloud works without browser storage. */ }
            if (raw) {
              const legacy = JSON.parse(raw).library;
              assertExpenseLibrary(legacy);
              const merged = mergeLegacyLibrary(row.library, legacy, row.imported_ids);
              if (merged.imported_ids.length !== row.imported_ids.length) {
                const result = await supabase.from(table).update({ ...merged, revision: row.revision + 1 }).eq("id", 1).eq("revision", row.revision).select("library,revision,imported_ids").maybeSingle();
                if (result.error) throw result.error;
                if (!result.data) throw new Error("Plans changed during import. Retry sync to finish uploading this browser's plans.");
                Object.assign(row, result.data);
              }
            }
          }
          s.row = row;
          if (alive) setLibrary(row.library);
        }
        succeeded = true;
        reportSyncState({ key: "Living Cost", pending: !!s.pending, error: "", retry: () => worker.current() });
        if (alive) { setLoading(false); setStatus("Saved to database · Syncs across devices"); }
      } catch (e) {
        reportSyncState({ key: "Living Cost", pending: !!s.pending, error: `Not synced: ${e instanceof Error ? e.message : (e as { message?: string }).message || "Please retry."}`, retry: () => worker.current() });
        if (alive) { setLoading(false); setError(`Database sync failed: ${e instanceof Error ? e.message : (e as { message?: string }).message || "Please retry."}`); setStatus("Not synced — changes have not been confirmed in the database."); }
      } finally {
        s.busy = false;
        if (alive && s.pending && succeeded) void sync();
      }
    }
    worker.current = () => { void sync(); };
    const initial = window.setTimeout(() => {
      try { setHasBackup(!!localStorage.getItem(backupKey)); } catch { /* Optional recovery copy. */ }
      void sync();
    }, 0);
    const timer = window.setInterval(() => { if (!s.pending) void sync(); }, 10000);
    const refresh = () => { if (!s.pending) void sync(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    const unload = (e: BeforeUnloadEvent) => { if (s.pending) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", unload);
    return () => { alive = false; clearTimeout(initial); clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); window.removeEventListener("beforeunload", unload); };
  }, []);

  function saveLibrary(next: FutureExpenseLibrary) {
    if (!state.current.row || storageError) throw new Error(storageError || "Wait for plans to load.");
    assertExpenseLibrary(next);
    // Keep an emergency copy until the database acknowledges all queued edits.
    try { localStorage.setItem(backupKey, JSON.stringify(next)); } catch { /* Saving to DB remains available. */ }
    state.current.pending = next;
    setHasBackup(true);
    state.current.generation++;
    setLibrary(next);
    setStatus("Saving to database…");
    worker.current();
  }
  function downloadBackup() {
    const raw = localStorage.getItem(backupKey);
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "expense-plans-unsynced-backup.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { library, saveLibrary, storageError, loading, status, hasBackup, downloadBackup, retry: () => worker.current() };
}
