"use client";

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { Currency } from "@/types/currency";
import { normalizeCurrency } from "@/utils/currency";

export type SavingsGoalStatus =
  | "active"
  | "paused"
  | "completed";

export type SavingsCalculationMethod =
  | "income-expenses"
  | "net-asset-increase";

export type SavingsPacePeriod =
  | "3m"
  | "6m"
  | "12m"
  | "custom";

export interface GoalSnapshot {
  month:string;
  currentAmount:number;
  monthlySaving:number;
  projectedCompletionDate:string;
  progressPercentage:number;
}

export interface SavingsGoal {
  id:string;
  name:string;
  targetAmount:number;
  manualCurrentAmount:number;
  targetDate:string;
  startDate:string;
  status:SavingsGoalStatus;
  currency:Currency;
  calculationMethod:SavingsCalculationMethod;
  pacePeriod:SavingsPacePeriod;
  customStartMonth:string;
  customEndMonth:string;
  includedAssetIds:number[];
  snapshots:GoalSnapshot[];
  createdAt:string;
  updatedAt:string;
}

export type SavingsGoalPayload =
  Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">;

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

  return window.localStorage.getItem(goalsStorageKey) || emptyGoalsJson;
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

function isRecord(value:unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeStatus(value:unknown): SavingsGoalStatus {
  if (
    value === "paused" ||
    value === "completed"
  ) {
    return value;
  }

  return "active";
}

function normalizeCalculationMethod(
  value:unknown
): SavingsCalculationMethod {
  return value === "net-asset-increase"
    ? "net-asset-increase"
    : "income-expenses";
}

function normalizePacePeriod(value:unknown): SavingsPacePeriod {
  if (
    value === "3m" ||
    value === "12m" ||
    value === "custom"
  ) {
    return value;
  }

  return "6m";
}

function normalizeSnapshot(value:unknown): GoalSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const month =
    typeof value.month === "string"
      ? value.month
      : "";

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  return {
    month,
    currentAmount:Number(value.currentAmount || 0),
    monthlySaving:Number(value.monthlySaving || 0),
    projectedCompletionDate:
      typeof value.projectedCompletionDate === "string"
        ? value.projectedCompletionDate
        : "",
    progressPercentage:Number(value.progressPercentage || 0),
  };
}

function normalizeGoal(value:unknown): SavingsGoal | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id
      : "";

  if (!id) {
    return null;
  }

  const includedAssetIds =
    Array.isArray(value.includedAssetIds)
      ? value.includedAssetIds
          .map((assetId) => Number(assetId))
          .filter((assetId) => Number.isInteger(assetId))
      : [];

  const snapshots =
    Array.isArray(value.snapshots)
      ? value.snapshots
          .map(normalizeSnapshot)
          .filter((snapshot): snapshot is GoalSnapshot => Boolean(snapshot))
      : [];

  return {
    id,
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim()
        : "Savings Goal",
    targetAmount:Math.max(0, Number(value.targetAmount || 0)),
    manualCurrentAmount:Math.max(0, Number(value.manualCurrentAmount || 0)),
    targetDate:
      typeof value.targetDate === "string"
        ? value.targetDate
        : "",
    startDate:
      typeof value.startDate === "string" && value.startDate
        ? value.startDate
        : new Date().toISOString().slice(0, 10),
    status:normalizeStatus(value.status),
    currency:normalizeCurrency(
      typeof value.currency === "string" ? value.currency : undefined
    ),
    calculationMethod:normalizeCalculationMethod(value.calculationMethod),
    pacePeriod:normalizePacePeriod(value.pacePeriod),
    customStartMonth:
      typeof value.customStartMonth === "string"
        ? value.customStartMonth
        : "",
    customEndMonth:
      typeof value.customEndMonth === "string"
        ? value.customEndMonth
        : "",
    includedAssetIds,
    snapshots,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function parseGoals(json:string): SavingsGoal[] {
  try {
    const parsed = JSON.parse(json) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeGoal)
      .filter((goal): goal is SavingsGoal => Boolean(goal));
  } catch {
    return [];
  }
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

  const goals =
    useMemo(
      () => parseGoals(goalsJson),
      [goalsJson]
    );

  const saveGoals =
    useCallback((nextGoals:SavingsGoal[]) => {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(
        goalsStorageKey,
        JSON.stringify(nextGoals)
      );
      window.dispatchEvent(new Event(goalsChangeEvent));
    }, []);

  return {
    goals,
    saveGoals,
  };
}
