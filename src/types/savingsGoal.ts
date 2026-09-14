import type { Currency } from "./currency";

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
  id?:string;
  goalId?:string;
  snapshotMonth?:string;
  month:string;
  currentAmount:number;
  monthlySaving:number;
  projectedCompletionDate:string;
  progressPercentage:number;
  savingPace?:number;
  requiredPace?:number | null;
  savingsRate?:number | null;
  targetAmount?:number;
  targetDate?:string;
  createdAt?:string;
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
  living_plan_id?:string | null;
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

