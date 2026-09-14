"use client";

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";


export type { SavingsGoal, SavingsGoalStatus, SavingsGoalPayload, GoalSnapshot, SavingsCalculationMethod, SavingsPacePeriod } from "../types/savingsGoal";
import type { SavingsGoal, SavingsGoalPayload } from "../types/savingsGoal";
import { parseGoals } from "../utils/savingsGoalStorage";

const goalsStorageKey =
  "expense-tracker-savings-goals";

const goalsChangeEvent =
  "expense-tracker-savings-goals-change";

const emptyGoalsJson =
  "[]";

function getGoalsSnapshot() {
  if (typeof window === "undefined") {
    return emptyGoalsJson;
  }

  try { return window.localStorage.getItem(goalsStorageKey) || emptyGoalsJson; }
  catch { return "!unavailable"; }
}

function getServerGoalsSnapshot() {
  return emptyGoalsJson;
}

function subscribeGoals(
  callback: () => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange =
    () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener(goalsChangeEvent, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(goalsChangeEvent, handleChange);
  };
}

export function createSavingsGoal(
  payload:SavingsGoalPayload
): SavingsGoal {
  const now =
    new Date().toISOString();

  return {
    ...payload,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    createdAt:now,
    updatedAt:now,
  };
}

export function touchSavingsGoal(
  goal:SavingsGoal
): SavingsGoal {
  return {
    ...goal,
    updatedAt:new Date().toISOString(),
  };
}

export default function useSavingsGoals() {
  const goalsJson =
    useSyncExternalStore(
      subscribeGoals,
      getGoalsSnapshot,
      getServerGoalsSnapshot
    );

  const { goals, storageError } = useMemo(() => {
    try { return { goals: parseGoals(goalsJson), storageError: "" }; }
    catch { return { goals: [] as SavingsGoal[], storageError: "Saved goals could not be read. Existing data has been preserved." }; }
  }, [goalsJson]);

  const saveGoals =
    useCallback((nextGoals:SavingsGoal[]) => {
      if (typeof window === "undefined") {
        return;
      }

      if (storageError) throw new Error(storageError);
      if (getGoalsSnapshot() !== goalsJson) throw new Error("Goals changed in another tab. Please review the latest data before saving.");
      const backupKey = `${goalsStorageKey}-before-living-plan`;
      if (!window.localStorage.getItem(backupKey)) window.localStorage.setItem(backupKey, goalsJson);
      window.localStorage.setItem(
        goalsStorageKey,
        JSON.stringify(nextGoals)
      );
      window.dispatchEvent(new Event(goalsChangeEvent));
    }, [goalsJson, storageError]);

  return {
    goals,
    storageError,
    saveGoals,
  };
}
