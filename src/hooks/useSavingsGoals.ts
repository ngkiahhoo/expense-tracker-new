"use client";

import useCloudFeatureWorkspace from "@/hooks/useCloudFeatureWorkspace";
export type { SavingsGoal, SavingsGoalStatus, SavingsGoalPayload, GoalSnapshot, SavingsCalculationMethod, SavingsPacePeriod } from "../types/savingsGoal";
import type { SavingsGoal, SavingsGoalPayload } from "../types/savingsGoal";
import { parseGoals } from "../utils/savingsGoalStorage";

const goalsStorageKey = "expense-tracker-savings-goals";
const normalize = (value: unknown) => parseGoals(JSON.stringify(value));
const isEmpty = (goals: SavingsGoal[]) => goals.length === 0;

export function createSavingsGoal(payload: SavingsGoalPayload): SavingsGoal {
  const now = new Date().toISOString();
  return { ...payload, id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()), createdAt: now, updatedAt: now };
}

export function touchSavingsGoal(goal: SavingsGoal): SavingsGoal {
  return { ...goal, updatedAt: new Date().toISOString() };
}

export default function useSavingsGoals() {
  const workspace = useCloudFeatureWorkspace<SavingsGoal[]>({
    key: "savings_goals",
    initial: [],
    normalize,
    legacyKey: goalsStorageKey,
    shouldImport: isEmpty,
  });
  return { goals: workspace.value, saveGoals: workspace.save, storageError: workspace.storageError, loading: workspace.loading, retry: workspace.retry };
}
