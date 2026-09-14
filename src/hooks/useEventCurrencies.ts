"use client";

import { useCallback } from "react";
import useCloudFeatureWorkspace from "@/hooks/useCloudFeatureWorkspace";

const storageKey = "expense-tracker-event-currencies";
const defaults = ["MYR", "SGD"];
const normalize = (value: unknown) => Array.isArray(value)
  ? [...new Set([...defaults, ...value.filter((item): item is string => typeof item === "string" && /^[A-Z]{3}$/.test(item))])].sort()
  : defaults;
const isDefault = (currencies: string[]) => currencies.length <= defaults.length;

export default function useEventCurrencies() {
  const workspace = useCloudFeatureWorkspace<string[]>({
    key: "event_currencies",
    initial: defaults,
    normalize,
    legacyKey: storageKey,
    shouldImport: isDefault,
  });
  const addCurrency = useCallback((value: string) => workspace.save([...workspace.value, value.trim().toUpperCase()]), [workspace]);
  const removeCurrency = useCallback((value: string) => workspace.save(workspace.value.filter(currency => currency !== value || defaults.includes(currency))), [workspace]);
  return { currencies: workspace.value, addCurrency, removeCurrency, storageError: workspace.storageError, loading: workspace.loading, retry: workspace.retry };
}
