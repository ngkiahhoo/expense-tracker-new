"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import useUnsavedChanges from "./useUnsavedChanges";
import { reportSyncState } from "@/utils/syncStatus";

type Row = { data: unknown; revision: number; legacy_imported: boolean };
interface Options<T> {
  key: "financial_events" | "savings_goals" | "event_currencies" | "saved_notes";
  initial: T;
  normalize: (value: unknown) => T;
  legacyKey?: string;
  shouldImport?: (value: T) => boolean;
}

export default function useCloudFeatureWorkspace<T>({ key, initial, normalize, legacyKey, shouldImport }: Options<T>) {
  const [value, setValue] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [storageError, setError] = useState("");
  const row = useRef<Row | null>(null);
  const pending = useRef<T | null>(null);
  const saving = useRef(false);
  const flushRef = useRef<() => void>(() => {});
  const edits = useRef(0);
  const reads = useRef(0);
  const [unsynced, setUnsynced] = useState(false);
  const backupKey = `workspace-pending:${key}`;
  useUnsavedChanges(unsynced);

  const flush = useCallback(async () => {
    if (saving.current || !pending.current || !row.current) return;
    saving.current = true;
    let syncError = "";
    try {
      while (pending.current && row.current) {
        const next = pending.current as T;
        const { data, error } = await supabase
          .from("cloud_feature_workspaces")
          .update({ data: next, revision: row.current.revision + 1, updated_at: new Date().toISOString() })
          .eq("key", key)
          .eq("revision", row.current.revision)
          .select("data,revision,legacy_imported")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("This feature changed on another device. Refresh to load the latest version.");
        row.current = data as Row;
        if (pending.current === next) pending.current = null;
        if (pending.current) {
          try { localStorage.setItem(backupKey, JSON.stringify({ revision: row.current.revision, data: pending.current })); } catch { /* Keep the in-memory queue. */ }
        }
      }
      setError("");
      setUnsynced(false);
      try { localStorage.removeItem(backupKey); } catch { /* Cloud save succeeded. */ }
    } catch (cause) {
      syncError = cause instanceof Error ? cause.message : "Cloud sync failed. Your changes are kept in this browser.";
      setError(syncError);
    } finally {
      saving.current = false;
      reportSyncState({ key, pending: !!pending.current, error: syncError, retry: () => flushRef.current() });
    }
  }, [key, backupKey]);
  useEffect(() => { flushRef.current = () => { void flush(); }; }, [flush]);

  const load = useCallback(async () => {
    if (pending.current || saving.current) return;
    const generation = edits.current, request = ++reads.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cloud_feature_workspaces")
        .select("data,revision,legacy_imported")
        .eq("key", key)
        .single();
      if (error) throw error;
      let next = normalize((data as Row).data);
      let revision = (data as Row).revision;
      if (legacyKey && !(data as Row).legacy_imported) {
        const raw = shouldImport?.(next) ? window.localStorage.getItem(legacyKey) : null;
        if (raw) {
          const legacy = normalize(JSON.parse(raw));
          if (!shouldImport?.(legacy)) next = legacy;
        }
        const result = await supabase
          .from("cloud_feature_workspaces")
          .update({ data: next, revision: revision + 1, legacy_imported: true, updated_at: new Date().toISOString() })
          .eq("key", key)
          .eq("revision", revision)
          .select("data,revision,legacy_imported")
          .maybeSingle();
        if (result.error || !result.data) throw result.error || new Error("Cloud data changed during migration.");
        next = normalize((result.data as Row).data);
        revision = (result.data as Row).revision;
      }
      if (request !== reads.current || generation !== edits.current || pending.current) return;
      row.current = { data: next, revision, legacy_imported: true };
      setValue(next);
      setError("");
      try {
        const raw = localStorage.getItem(backupKey);
        if (raw) {
          const backup = JSON.parse(raw) as { revision: number; data: unknown };
          pending.current = normalize(backup.data);
          row.current.revision = backup.revision;
          setValue(pending.current);
          setUnsynced(true);
          setError("Unsynced changes recovered in this browser. Retry to save. If another device changed this data, your recovery copy is kept locally.");
        }
      } catch { setError("Could not restore the local recovery copy. It has not been removed."); }
    } catch (cause) {
      if (request === reads.current && generation === edits.current) setError(cause instanceof Error ? cause.message : "Cloud data could not be loaded.");
    } finally {
      if (request === reads.current) setLoading(false);
    }
  }, [key, legacyKey, normalize, shouldImport, backupKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => {
      window.clearTimeout(timer);
      if (!pending.current) reportSyncState({ key, pending: false, error: "", retry: () => {} });
    };
  }, [load, key]);
  useEffect(() => {
    const refresh = () => { if (!pending.current) void load(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  const save = useCallback((next: T) => {
    if (loading || !row.current) throw new Error("Wait for cloud data to load.");
    if (storageError && !pending.current) throw new Error(storageError);
    pending.current = next;
    edits.current++;
    setUnsynced(true);
    try { localStorage.setItem(backupKey, JSON.stringify({ revision: row.current.revision, data: next })); } catch { /* Navigation remains guarded if storage is unavailable. */ }
    setValue(next);
    void flush();
  }, [flush, loading, storageError, backupKey]);

  const retry = useCallback(() => { if (pending.current) void flush(); else void load(); }, [flush, load]);
  useEffect(() => { reportSyncState({ key, pending: unsynced, error: storageError, retry }); }, [key, unsynced, storageError, retry]);

  return { value, save, loading, storageError, unsynced, retry };
}
