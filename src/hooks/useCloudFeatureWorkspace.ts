"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  const flush = useCallback(async () => {
    if (saving.current || !pending.current || !row.current) return;
    saving.current = true;
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
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cloud sync failed.");
    } finally {
      saving.current = false;
    }
  }, [key]);

  const load = useCallback(async () => {
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
      row.current = { data: next, revision, legacy_imported: true };
      setValue(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cloud data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [key, legacyKey, normalize, shouldImport]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const refresh = () => { if (!pending.current) void load(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  const save = useCallback((next: T) => {
    if (loading || !row.current) throw new Error("Wait for cloud data to load.");
    if (storageError) throw new Error(storageError);
    pending.current = next;
    setValue(next);
    void flush();
  }, [flush, loading, storageError]);

  return { value, save, loading, storageError, retry: load };
}
