import type { SavingsGoal, SavingsGoalStatus, SavingsCalculationMethod, SavingsPacePeriod, GoalSnapshot } from "../types/savingsGoal";
import { normalizeCurrency } from "./currency";

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
      : typeof value.snapshotMonth === "string"
      ? value.snapshotMonth
      : "";

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  return {
    id:
      typeof value.id === "string" && value.id
        ? value.id
        : undefined,
    goalId:
      typeof value.goalId === "string" && value.goalId
        ? value.goalId
        : undefined,
    snapshotMonth:
      typeof value.snapshotMonth === "string" && value.snapshotMonth
        ? value.snapshotMonth
        : month,
    month,
    currentAmount:Number(value.currentAmount || 0),
    monthlySaving:Number(value.monthlySaving || 0),
    projectedCompletionDate:
      typeof value.projectedCompletionDate === "string"
        ? value.projectedCompletionDate
        : "",
    progressPercentage:Number(value.progressPercentage || 0),
    savingPace:
      typeof value.savingPace === "number"
        ? value.savingPace
        : undefined,
    requiredPace:
      typeof value.requiredPace === "number" || value.requiredPace === null
        ? value.requiredPace
        : undefined,
    savingsRate:
      typeof value.savingsRate === "number" || value.savingsRate === null
        ? value.savingsRate
        : undefined,
    targetAmount:
      typeof value.targetAmount === "number"
        ? value.targetAmount
        : undefined,
    targetDate:
      typeof value.targetDate === "string"
        ? value.targetDate
        : undefined,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : undefined,
  };
}

export function normalizeGoal(value:unknown): SavingsGoal | null {
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
    living_plan_id: typeof value.living_plan_id === "string" && value.living_plan_id ? value.living_plan_id : null,
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

export function parseGoals(json: string): SavingsGoal[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Saved goals could not be read. Existing data has been preserved.");
  const goals = parsed.map(normalizeGoal);
  if (goals.some(goal => goal === null)) throw new Error("Saved goals contain invalid entries. Existing data has been preserved.");
  return goals as SavingsGoal[];
}
