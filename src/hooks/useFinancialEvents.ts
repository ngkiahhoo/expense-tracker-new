"use client";

import useCloudFeatureWorkspace from "@/hooks/useCloudFeatureWorkspace";
import type { FinancialEvent } from "@/types/financialEvent";
import { financialEventsStorageKey, parseFinancialEvents } from "@/utils/financialEvents";

const normalize = (value: unknown) => parseFinancialEvents(JSON.stringify(value));
const isEmpty = (events: FinancialEvent[]) => events.length === 0;

export default function useFinancialEvents() {
  const workspace = useCloudFeatureWorkspace<FinancialEvent[]>({
    key: "financial_events",
    initial: [],
    normalize,
    legacyKey: financialEventsStorageKey,
    shouldImport: isEmpty,
  });
  return { events: workspace.value, saveEvents: workspace.save, storageError: workspace.storageError, loading: workspace.loading, retry: workspace.retry };
}
