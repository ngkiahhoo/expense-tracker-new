"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  CalendarDays,
  ChartLine,
  CheckCircle2,
  CirclePause,
  CirclePlus,
  Save,
  Settings2,
  SlidersHorizontal,
  Target,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Input,
  Select,
} from "@/components/ui/Field";
import {
  cn,
  toneStyles,
} from "@/components/ui/styles";
import useAssets from "@/hooks/useAssets";
import useDashboardHistory from "@/hooks/useDashboardHistory";
import useMonthlySeries, {
  type MonthlySeriesItem,
} from "@/hooks/useMonthlySeries";
import useMonthOptions from "@/hooks/useMonthOptions";
import useSavingsGoals, {
  createSavingsGoal,
  touchSavingsGoal,
  type SavingsCalculationMethod,
  type SavingsGoal,
  type SavingsGoalPayload,
  type SavingsGoalStatus,
  type SavingsPacePeriod,
} from "@/hooks/useSavingsGoals";
import useThemePreference from "@/hooks/useThemePreference";
import type { Asset } from "@/types/asset";
import type { Currency } from "@/types/currency";
import {
  CURRENCIES,
  currencyLabel,
  formatCurrencyAmount,
  getStoredCurrency,
  normalizeCurrency,
} from "@/utils/currency";
import {
  getLastCompletedMonthKey,
  isCompletedMonth,
} from "@/utils/monthRange";

interface GoalFormState {
  editingId:string | null;
  name:string;
  targetAmount:string;
  manualCurrentAmount:string;
  targetDate:string;
  startDate:string;
  status:SavingsGoalStatus;
  currency:Currency;
  calculationMethod:SavingsCalculationMethod;
  pacePeriod:SavingsPacePeriod;
  customStartMonth:string;
  customEndMonth:string;
  includedAssetIds:number[];
}

interface GoalAmountResult {
  amount:number;
  assetTotal:number;
  source:"assets" | "manual";
  includedAssets:Asset[];
}

interface PaceRow {
  monthKey:string;
  label:string;
  value:number;
}

interface PaceStats {
  average:number;
  median:number;
  highest:PaceRow | null;
  lowest:PaceRow | null;
  rows:PaceRow[];
  adjustedRows:PaceRow[];
  standardDeviation:number;
  sourceLabel:string;
  requestedPeriodLabel:string;
  usedMonthCount:number;
  fallback:boolean;
  hasOutliers:boolean;
  percentile25:number;
  percentile50:number;
  percentile75:number;
}

interface ProjectionResult {
  months:number;
  monthKey:string;
}

const statusMeta:Record<
  SavingsGoalStatus,
  {
    label:string;
    className:string;
  }
> = {
  active: {
    label: "Active",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  paused: {
    label: "Paused",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  completed: {
    label: "Completed",
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  },
};

const periodLabels:Record<SavingsPacePeriod, string> = {
  "3m": "Last 3 completed months",
  "6m": "Last 6 completed months",
  "12m": "Last 12 completed months",
  custom: "Custom period",
};

const methodLabels:Record<SavingsCalculationMethod, string> = {
  "income-expenses": "Income - Expenses",
  "net-asset-increase": "Liquid Asset Growth",
};

function getTodayInputDate() {
  const today =
    new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMonthIndex(monthKey:string) {
  const [year, month] =
    monthKey.split("-").map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return 0;
  }

  return year * 12 + month - 1;
}

function getMonthKeyFromIndex(monthIndex:number) {
  const year =
    Math.floor(monthIndex / 12);
  const month =
    monthIndex % 12 + 1;

  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMonthKey(monthKey:string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return "No date";
  }

  const [year, month] =
    monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function clamp(
  value:number,
  min:number,
  max:number
) {
  return Math.min(max, Math.max(min, value));
}

function average(values:number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values:number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted =
    [...values].sort((left, right) => left - right);
  const middle =
    Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function standardDeviation(values:number[]) {
  if (values.length <= 1) {
    return 0;
  }

  const mean =
    average(values);
  const variance =
    average(values.map((value) => (value - mean) ** 2));

  return Math.sqrt(variance);
}

function getProjectedCompletion(
  currentAmount:number,
  targetAmount:number,
  monthlySaving:number,
  currentMonth:string
): ProjectionResult | null {
  const remainingAmount =
    targetAmount - currentAmount;

  if (remainingAmount <= 0) {
    return {
      months: 0,
      monthKey: currentMonth,
    };
  }

  if (monthlySaving <= 0) {
    return null;
  }

  const projectedMonths =
    remainingAmount / monthlySaving;

  return {
    months: projectedMonths,
    monthKey: getMonthKeyFromIndex(
      getMonthIndex(currentMonth) + Math.ceil(projectedMonths)
    ),
  };
}

function formatMonthDelta(deltaMonths:number) {
  if (Math.abs(deltaMonths) < 0.05) {
    return "On track";
  }

  const direction =
    deltaMonths < 0
      ? "earlier"
      : "later";

  return `${Math.abs(deltaMonths).toFixed(1)} months ${direction}`;
}

function createDefaultForm(
  currency:Currency,
  currentMonth:string
): GoalFormState {
  return {
    editingId:null,
    name:"Freedom Fund",
    targetAmount:"50000",
    manualCurrentAmount:"0",
    targetDate:"",
    startDate:getTodayInputDate(),
    status:"active",
    currency,
    calculationMethod:"income-expenses",
    pacePeriod:"6m",
    customStartMonth:currentMonth,
    customEndMonth:currentMonth,
    includedAssetIds:[],
  };
}

function getAssetRule(asset:Asset) {
  const name =
    asset.name.toLowerCase();

  if (
    name.includes("epf") ||
    name.includes("retirement") ||
    name.includes("locked") ||
    name.includes("non-liquid")
  ) {
    return "Excluded";
  }

  if (
    name.includes("stock") ||
    name.includes("invest") ||
    name.includes("crypto") ||
    name.includes("fund")
  ) {
    return "Optional";
  }

  if (
    name.includes("bank") ||
    name.includes("tng") ||
    name.includes("go+") ||
    name.includes("cash") ||
    name.includes("wallet")
  ) {
    return "Included";
  }

  return "Optional";
}

function getGoalAmount(
  goal:SavingsGoal,
  assets:Asset[]
): GoalAmountResult {
  const includedAssets =
    assets.filter((asset) =>
      goal.includedAssetIds.includes(asset.id) &&
      normalizeCurrency(asset.currency) === goal.currency
    );

  const assetTotal =
    includedAssets.reduce(
      (sum, asset) => sum + Number(asset.current_value || 0),
      0
    );

  if (includedAssets.length > 0) {
    return {
      amount:assetTotal,
      assetTotal,
      source:"assets",
      includedAssets,
    };
  }

  return {
    amount:goal.manualCurrentAmount,
    assetTotal,
    source:"manual",
    includedAssets,
  };
}

function getSeriesInPeriod(
  series:MonthlySeriesItem[],
  goal:SavingsGoal,
  latestCompletedMonth:string,
  currentDate:Date
) {
  const completedSeries =
    series.filter((item) => isCompletedMonth(item.monthKey, currentDate));

  if (goal.pacePeriod === "custom") {
    const startIndex =
      getMonthIndex(goal.customStartMonth || latestCompletedMonth);
    const endIndex =
      getMonthIndex(goal.customEndMonth || latestCompletedMonth);

    return completedSeries.filter((item) => {
      const monthIndex =
        getMonthIndex(item.monthKey);

      return monthIndex >= Math.min(startIndex, endIndex) &&
        monthIndex <= Math.max(startIndex, endIndex);
    });
  }

  const monthCount =
    goal.pacePeriod === "3m"
      ? 3
      : goal.pacePeriod === "12m"
      ? 12
      : 6;
  const latestCompletedIndex =
    getMonthIndex(latestCompletedMonth);
  const startIndex =
    latestCompletedIndex - monthCount + 1;

  return completedSeries.filter((item) => {
    const monthIndex =
      getMonthIndex(item.monthKey);

    return monthIndex >= startIndex && monthIndex <= latestCompletedIndex;
  });
}

function getPercentile(
  values:number[],
  percentile:number
) {
  if (values.length === 0) {
    return 0;
  }

  const sorted =
    [...values].sort((left, right) => left - right);
  const index =
    (sorted.length - 1) * percentile;
  const lower =
    Math.floor(index);
  const upper =
    Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function getWinsorizedRows(rows:PaceRow[]) {
  if (rows.length < 4) {
    return {
      adjustedRows:rows,
      hasOutliers:false,
    };
  }

  const values =
    rows.map((row) => row.value);
  const q1 =
    getPercentile(values, 0.25);
  const q3 =
    getPercentile(values, 0.75);
  const iqr =
    q3 - q1;
  const lowerBound =
    q1 - iqr * 1.5;
  const upperBound =
    q3 + iqr * 1.5;

  let hasOutliers =
    false;
  const adjustedRows =
    rows.map((row) => {
      const adjustedValue =
        clamp(row.value, lowerBound, upperBound);

      if (adjustedValue !== row.value) {
        hasOutliers = true;
      }

      return {
        ...row,
        value:adjustedValue,
      };
    });

  return {
    adjustedRows,
    hasOutliers,
  };
}

function rowsToStats(
  rows:PaceRow[],
  sourceLabel:string,
  requestedPeriodLabel:string,
  fallback = false
): PaceStats {
  const {
    adjustedRows,
    hasOutliers,
  } = getWinsorizedRows(rows);
  const values =
    adjustedRows.map((row) => row.value);
  const highest =
    rows.reduce<PaceRow | null>(
      (result, row) => !result || row.value > result.value ? row : result,
      null
    );
  const lowest =
    rows.reduce<PaceRow | null>(
      (result, row) => !result || row.value < result.value ? row : result,
      null
    );

  return {
    average:average(values),
    median:median(values),
    highest,
    lowest,
    rows,
    adjustedRows,
    standardDeviation:standardDeviation(values),
    sourceLabel,
    requestedPeriodLabel,
    usedMonthCount:rows.length,
    fallback,
    hasOutliers,
    percentile25:getPercentile(values, 0.25),
    percentile50:getPercentile(values, 0.5),
    percentile75:getPercentile(values, 0.75),
  };
}

function getSnapshotPaceStats(
  goal:SavingsGoal,
  currentDate:Date
) {
  const snapshots =
    [...goal.snapshots]
      .filter((snapshot) => isCompletedMonth(snapshot.month, currentDate))
      .sort((left, right) =>
        left.month.localeCompare(right.month)
      );

  if (snapshots.length < 2) {
    return null;
  }

  const rows:PaceRow[] =
    snapshots.slice(1).map((snapshot, index) => {
      const previous =
        snapshots[index];
      const monthDelta =
        Math.max(1, getMonthIndex(snapshot.month) - getMonthIndex(previous.month));

      return {
        monthKey:snapshot.month,
        label:formatMonthKey(snapshot.month),
        value:(snapshot.currentAmount - previous.currentAmount) / monthDelta,
      };
    });

  return rowsToStats(
    rows,
    "Liquid Asset Growth",
    "Completed goal snapshots"
  );
}

function getCashflowPaceStats(
  goal:SavingsGoal,
  monthlySeries:MonthlySeriesItem[],
  latestCompletedMonth:string,
  currentDate:Date,
  fallback = false
): PaceStats {
  const requestedPeriodLabel =
    goal.pacePeriod === "custom"
      ? "Custom completed months"
      : periodLabels[goal.pacePeriod];
  const periodRows =
    getSeriesInPeriod(
      monthlySeries,
      goal,
      latestCompletedMonth,
      currentDate
    ).map((item) => ({
      monthKey:item.monthKey,
      label:item.label,
      value:item.balance,
    }));

  return rowsToStats(
    periodRows,
    fallback
      ? "Income - Expenses fallback"
      : "Cashflow Saving Pace",
    requestedPeriodLabel,
    fallback
  );
}

function getPaceStats(
  goal:SavingsGoal,
  monthlySeries:MonthlySeriesItem[],
  latestCompletedMonth:string,
  currentDate:Date
): PaceStats {
  if (goal.calculationMethod === "net-asset-increase") {
    const snapshotStats =
      getSnapshotPaceStats(goal, currentDate);

    if (snapshotStats) {
      return snapshotStats;
    }
  }

  return getCashflowPaceStats(
    goal,
    monthlySeries,
    latestCompletedMonth,
    currentDate,
    goal.calculationMethod === "net-asset-increase"
  );
}

function getPlanStatus(
  averageSaving:number,
  requiredSaving:number | null
) {
  if (requiredSaving === null) {
    return {
      label:"No target date",
      tone:"neutral" as const,
      difference:0,
    };
  }

  const difference =
    averageSaving - requiredSaving;
  const tolerance =
    Math.max(50, Math.abs(requiredSaving) * 0.05);

  if (difference > tolerance) {
    return {
      label:"Ahead of Plan",
      tone:"success" as const,
      difference,
    };
  }

  if (difference < -tolerance) {
    return {
      label:"Behind Plan",
      tone:"danger" as const,
      difference,
    };
  }

  return {
    label:"On Track",
    tone:"info" as const,
    difference,
  };
}

function getRequiredMonthlySaving(
  goal:SavingsGoal,
  currentAmount:number,
  currentMonth:string
) {
  if (!goal.targetDate) {
    return null;
  }

  const targetMonth =
    goal.targetDate.slice(0, 7);
  const remainingMonths =
    Math.max(1, getMonthIndex(targetMonth) - getMonthIndex(currentMonth));
  const remainingAmount =
    Math.max(0, goal.targetAmount - currentAmount);

  return remainingAmount / remainingMonths;
}

function getPredictionRange(
  currentAmount:number,
  targetAmount:number,
  stats:PaceStats,
  currentMonth:string
) {
  if (stats.usedMonthCount < 6) {
    return {
      mostLikely:null,
      optimistic:null,
      conservative:null,
      hasEnoughHistory:false,
    };
  }

  const mostLikely =
    getProjectedCompletion(
      currentAmount,
      targetAmount,
      stats.percentile50 || stats.average,
      currentMonth
    );

  return {
    mostLikely,
    optimistic:getProjectedCompletion(
      currentAmount,
      targetAmount,
      stats.percentile75,
      currentMonth
    ),
    conservative:stats.percentile25 > 0
      ? getProjectedCompletion(
        currentAmount,
        targetAmount,
        stats.percentile25,
        currentMonth
      )
      : null,
    hasEnoughHistory:true,
  };
}

function getMonthlyImpact(
  currentAmount:number,
  targetAmount:number,
  stats:PaceStats,
  currentProjection:ProjectionResult | null,
  currentMonth:string
) {
  const latest =
    stats.rows[stats.rows.length - 1];

  if (!latest || stats.rows.length < 2 || !currentProjection) {
    return null;
  }

  const previousRows =
    stats.rows.slice(0, -1);
  const previousAverage =
    average(getWinsorizedRows(previousRows).adjustedRows.map((row) => row.value));
  const expectedCurrentAmount =
    currentAmount - (latest.value - previousAverage);
  const previousProjection =
    getProjectedCompletion(
      expectedCurrentAmount,
      targetAmount,
      previousAverage,
      currentMonth
    );

  if (!previousProjection) {
    return null;
  }

  const movedMonths =
    currentProjection.months - previousProjection.months;
  const difference =
    latest.value - previousAverage;

  return {
    latest,
    previousAverage,
    difference,
    movedMonths,
    movedDays:movedMonths * 30.44,
  };
}

function getProjectionData(
  currentAmount:number,
  targetAmount:number,
  conservativePace:number,
  normalPace:number,
  aggressivePace:number,
  targetDate:string,
  currentMonth:string
) {
  const normalProjection =
    getProjectedCompletion(
      currentAmount,
      targetAmount,
      normalPace,
      currentMonth
    );
  const targetDateHorizon =
    targetDate
      ? getMonthIndex(targetDate.slice(0, 7)) - getMonthIndex(currentMonth) + 3
      : 0;
  const normalHorizon =
    normalProjection
      ? Math.ceil(normalProjection.months) + 6
      : 18;
  const horizon =
    clamp(
      Math.max(12, normalHorizon, targetDateHorizon),
      12,
      72
    );

  return Array.from({ length:horizon + 1 }, (_, index) => {
    const monthKey =
      getMonthKeyFromIndex(getMonthIndex(currentMonth) + index);

    return {
      monthKey,
      label:formatMonthKey(monthKey),
      conservative:Math.max(0, currentAmount + conservativePace * index),
      normal:Math.max(0, currentAmount + normalPace * index),
      aggressive:Math.max(0, currentAmount + aggressivePace * index),
    };
  });
}

function getScenarioPaces(stats:PaceStats) {
  if (stats.usedMonthCount >= 6) {
    return {
      conservative:Math.max(0, stats.percentile25),
      normal:Math.max(0, stats.percentile50 || stats.average),
      aggressive:Math.max(0, stats.percentile75),
      source:"percentile" as const,
    };
  }

  return {
    conservative:stats.usedMonthCount >= 2
      ? Math.max(0, stats.average * 0.8)
      : null,
    normal:Math.max(0, stats.average),
    aggressive:stats.usedMonthCount >= 2
      ? Math.max(0, stats.average * 1.2)
      : null,
    source:"multiplier" as const,
  };
}

function getConfidence(stats:PaceStats) {
  let rank =
    stats.usedMonthCount < 3
      ? 0
      : stats.usedMonthCount < 6
      ? 1
      : stats.usedMonthCount < 12
      ? 2
      : 3;
  const volatilityRatio =
    stats.average !== 0
      ? Math.abs(stats.standardDeviation / stats.average)
      : stats.standardDeviation > 0
      ? Infinity
      : 0;

  if (volatilityRatio > 0.8 && rank > 0) {
    rank -= 1;
  }

  const labels = [
    "Low",
    "Limited",
    "Moderate",
    "Good",
  ] as const;

  return {
    label:labels[rank],
    usedMonthCount:stats.usedMonthCount,
    volatilityRatio,
    downgraded:volatilityRatio > 0.8,
  };
}

function renderProjectionTooltip(props:unknown) {
  const {
    active,
    label,
    payload,
  } = props as {
    active?:boolean;
    label?:string;
    payload?:Array<{
      color?:string;
      name?:string;
      value?:number;
    }>;
  };

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white shadow-xl">
      <p className="mb-2 font-bold">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <p
            key={item.name}
            className="flex items-center gap-2 text-zinc-400"
          >
            <span
              className="inline-flex size-2 rounded-full"
              style={{ backgroundColor:item.color }}
            />
            <span>{item.name}</span>
            <span className="font-semibold text-white">
              {Number(item.value || 0).toFixed(0)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label:string;
  value:ReactNode;
  helper?:ReactNode;
  tone?:"neutral" | "success" | "danger" | "info" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-400"
      : tone === "danger"
      ? "text-red-400"
      : tone === "info"
      ? "text-cyan-400"
      : tone === "warning"
      ? "text-amber-400"
      : "text-white";

  return (
    <div className="savings-frame rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <div className={cn("mt-2 text-xl font-bold", toneClass)}>
        {value}
      </div>
      {helper && (
        <p className="mt-1 text-xs text-zinc-500">
          {helper}
        </p>
      )}
    </div>
  );
}

export default function SavingsGoalsPage() {
  const {
    theme,
    toggleTheme,
  } = useThemePreference();
  const {
    currentMonth,
  } = useMonthOptions();
  const currentDate =
    useMemo(() => new Date(), []);
  const latestCompletedMonth =
    useMemo(
      () => getLastCompletedMonthKey(currentDate),
      [currentDate]
    );
  const {
    goals,
    saveGoals,
  } = useSavingsGoals();

  const [selectedGoalId, setSelectedGoalId] =
    useState<string | null>(null);
  const [form, setForm] =
    useState<GoalFormState>(() =>
      createDefaultForm(getStoredCurrency(), latestCompletedMonth)
    );
  const [formError, setFormError] =
    useState("");
  const [whatIfSaving, setWhatIfSaving] =
    useState(2500);
  const [isEditorOpen, setIsEditorOpen] =
    useState(false);

  const selectedGoal =
    useMemo(
      () =>
        goals.find((goal) => goal.id === selectedGoalId) ||
        goals[0] ||
        null,
      [goals, selectedGoalId]
    );

  const activeCurrency =
    selectedGoal?.currency || form.currency;

  const assets =
    useAssets(currentMonth);
  const {
    allExpenses,
    allIncomes,
    fetchDashboardHistory,
  } = useDashboardHistory(activeCurrency);

  const monthlySeries =
    useMonthlySeries(
      allExpenses,
      allIncomes
    );

  const availableAssets =
    useMemo(
      () =>
        assets.assets.filter((asset) =>
          normalizeCurrency(asset.currency) === form.currency
        ),
      [assets.assets, form.currency]
    );

  const selectedGoalAmount =
    useMemo(
      () =>
        selectedGoal
          ? getGoalAmount(selectedGoal, assets.assets)
          : null,
      [assets.assets, selectedGoal]
    );

  const paceStats =
    useMemo(
      () =>
        selectedGoal
          ? getPaceStats(
            selectedGoal,
            monthlySeries,
            latestCompletedMonth,
            currentDate
          )
          : null,
      [currentDate, latestCompletedMonth, monthlySeries, selectedGoal]
    );

  const cashflowPaceStats =
    useMemo(
      () =>
        selectedGoal
          ? getCashflowPaceStats(
            selectedGoal,
            monthlySeries,
            latestCompletedMonth,
            currentDate
          )
          : null,
      [currentDate, latestCompletedMonth, monthlySeries, selectedGoal]
    );

  const liquidAssetGrowthStats =
    useMemo(
      () =>
        selectedGoal
          ? getSnapshotPaceStats(selectedGoal, currentDate)
          : null,
      [currentDate, selectedGoal]
    );

  const currentMonthSoFar =
    useMemo(
      () =>
        monthlySeries.find((item) => item.monthKey === currentMonth) || {
          monthKey:currentMonth,
          label:formatMonthKey(currentMonth),
          income:0,
          expense:0,
          balance:0,
        },
      [currentMonth, monthlySeries]
    );

  const progressPercent =
    selectedGoal && selectedGoalAmount
      ? clamp(
        selectedGoalAmount.amount / Math.max(1, selectedGoal.targetAmount) * 100,
        0,
        100
      )
      : 0;

  const remainingAmount =
    selectedGoal && selectedGoalAmount
      ? Math.max(0, selectedGoal.targetAmount - selectedGoalAmount.amount)
      : 0;

  const currentProjection =
    selectedGoal && selectedGoalAmount && paceStats
      ? getProjectedCompletion(
        selectedGoalAmount.amount,
        selectedGoal.targetAmount,
        paceStats.average,
        currentMonth
      )
      : null;

  const requiredMonthlySaving =
    selectedGoal && selectedGoalAmount
      ? getRequiredMonthlySaving(
        selectedGoal,
        selectedGoalAmount.amount,
        currentMonth
      )
      : null;

  const planStatus =
    paceStats
      ? getPlanStatus(
        paceStats.average,
        requiredMonthlySaving
      )
      : null;

  const predictionRange =
    selectedGoal && selectedGoalAmount && paceStats
      ? getPredictionRange(
        selectedGoalAmount.amount,
        selectedGoal.targetAmount,
        paceStats,
        currentMonth
      )
      : null;

  const monthlyImpact =
    selectedGoal && selectedGoalAmount && paceStats
      ? getMonthlyImpact(
        selectedGoalAmount.amount,
        selectedGoal.targetAmount,
        paceStats,
        currentProjection,
        currentMonth
      )
      : null;

  const scenarioPaces =
    paceStats
      ? getScenarioPaces(paceStats)
      : null;

  const confidence =
    paceStats
      ? getConfidence(paceStats)
      : null;

  const projectionData =
    selectedGoal && selectedGoalAmount && scenarioPaces
      ? getProjectionData(
        selectedGoalAmount.amount,
        selectedGoal.targetAmount,
        scenarioPaces.conservative ?? scenarioPaces.normal,
        scenarioPaces.normal,
        scenarioPaces.aggressive ?? scenarioPaces.normal,
        selectedGoal.targetDate,
        currentMonth
      )
      : [];

  const scenarioRows =
    selectedGoal && selectedGoalAmount && paceStats && scenarioPaces
      ? [
        {
          label:"Conservative",
          pace:scenarioPaces.conservative,
          tone:"warning" as const,
          helper:scenarioPaces.source === "percentile"
            ? "Based on your lower-saving months"
            : "Fallback: 80% of current pace",
        },
        {
          label:"Normal",
          pace:scenarioPaces.normal,
          tone:"info" as const,
          helper:scenarioPaces.source === "percentile"
            ? "Based on your median completed month"
            : "Based on your historical average",
        },
        {
          label:"Aggressive",
          pace:scenarioPaces.aggressive,
          tone:"success" as const,
          helper:scenarioPaces.source === "percentile"
            ? "Based on your stronger-saving months"
            : "Fallback: 120% of current pace",
        },
      ].map((scenario) => ({
        ...scenario,
        projection:scenario.pace === null
          ? null
          : getProjectedCompletion(
            selectedGoalAmount.amount,
            selectedGoal.targetAmount,
            scenario.pace,
            currentMonth
          ),
      }))
      : [];

  const whatIfMax =
    Math.max(
      4000,
      Math.ceil(Math.max(whatIfSaving, paceStats?.average || 0) / 500) * 500 + 2000
    );
  const whatIfProjection =
    selectedGoal && selectedGoalAmount
      ? getProjectedCompletion(
        selectedGoalAmount.amount,
        selectedGoal.targetAmount,
        whatIfSaving,
        currentMonth
      )
      : null;
  const whatIfDelta =
    whatIfProjection && currentProjection
      ? whatIfProjection.months - currentProjection.months
      : null;

  useEffect(() => {
    document.documentElement.classList.toggle("light-theme", theme === "light");

    return () => {
      document.documentElement.classList.remove("light-theme");
    };
  }, [theme]);

  useEffect(() => {
    void fetchDashboardHistory();
  }, [fetchDashboardHistory]);

  function updateForm<K extends keyof GoalFormState>(
    key:K,
    value:GoalFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]:value,
    }));
  }

  function resetForm() {
    setForm(
      createDefaultForm(
        activeCurrency,
        latestCompletedMonth
      )
    );
    setFormError("");
    setIsEditorOpen(true);
  }

  function startEditGoal(goal:SavingsGoal) {
    setForm({
      editingId:goal.id,
      name:goal.name,
      targetAmount:String(goal.targetAmount),
      manualCurrentAmount:String(goal.manualCurrentAmount),
      targetDate:goal.targetDate,
      startDate:goal.startDate,
      status:goal.status,
      currency:goal.currency,
      calculationMethod:goal.calculationMethod,
      pacePeriod:goal.pacePeriod,
      customStartMonth:goal.customStartMonth || latestCompletedMonth,
      customEndMonth:goal.customEndMonth || latestCompletedMonth,
      includedAssetIds:goal.includedAssetIds,
    });
    setFormError("");
    setIsEditorOpen(true);
  }

  function toggleAsset(assetId:number) {
    setForm((current) => ({
      ...current,
      includedAssetIds:current.includedAssetIds.includes(assetId)
        ? current.includedAssetIds.filter((id) => id !== assetId)
        : [...current.includedAssetIds, assetId],
    }));
  }

  function selectSuggestedAssets() {
    setForm((current) => ({
      ...current,
      includedAssetIds:availableAssets
        .filter((asset) => getAssetRule(asset) === "Included")
        .map((asset) => asset.id),
    }));
  }

  function clearAssets() {
    setForm((current) => ({
      ...current,
      includedAssetIds:[],
    }));
  }

  function handleSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetAmount =
      Number(form.targetAmount);
    const manualCurrentAmount =
      Number(form.manualCurrentAmount);

    if (!form.name.trim()) {
      setFormError("Goal name is required.");
      return;
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setFormError("Target amount must be greater than 0.");
      return;
    }

    if (!Number.isFinite(manualCurrentAmount) || manualCurrentAmount < 0) {
      setFormError("Current amount cannot be negative.");
      return;
    }

    const existingGoal =
      goals.find((goal) => goal.id === form.editingId);
    const payload:SavingsGoalPayload = {
      name:form.name.trim(),
      targetAmount,
      manualCurrentAmount,
      targetDate:form.targetDate,
      startDate:form.startDate || getTodayInputDate(),
      status:form.status,
      currency:form.currency,
      calculationMethod:form.calculationMethod,
      pacePeriod:form.pacePeriod,
      customStartMonth:form.customStartMonth || latestCompletedMonth,
      customEndMonth:form.customEndMonth || latestCompletedMonth,
      includedAssetIds:form.includedAssetIds,
      snapshots:existingGoal?.snapshots || [],
    };

    if (existingGoal) {
      const updatedGoal =
        touchSavingsGoal({
          ...existingGoal,
          ...payload,
        });

      saveGoals(
        goals.map((goal) =>
          goal.id === existingGoal.id
            ? updatedGoal
            : goal
        )
      );
      setSelectedGoalId(updatedGoal.id);
      setForm((current) => ({
        ...current,
        editingId:updatedGoal.id,
      }));
    } else {
      const newGoal =
        createSavingsGoal(payload);

      saveGoals([
        newGoal,
        ...goals,
      ]);
      setSelectedGoalId(newGoal.id);
      setForm((current) => ({
        ...current,
        editingId:newGoal.id,
      }));
    }

    setFormError("");
    setIsEditorOpen(false);
  }

  function deleteGoal(goal:SavingsGoal) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete ${goal.name}?`)
    ) {
      return;
    }

    const remainingGoals =
      goals.filter((item) => item.id !== goal.id);

    saveGoals(remainingGoals);
    setSelectedGoalId(remainingGoals[0]?.id || null);

    if (form.editingId === goal.id) {
      resetForm();
    }
  }

  function recordSnapshot(goal:SavingsGoal) {
    const amount =
      getGoalAmount(goal, assets.assets);
    const stats =
      getPaceStats(
        goal,
        monthlySeries,
        latestCompletedMonth,
        currentDate
      );
    const projection =
      getProjectedCompletion(
        amount.amount,
        goal.targetAmount,
        stats.average,
        currentMonth
      );
    const snapshot = {
      month:currentMonth,
      currentAmount:amount.amount,
      monthlySaving:stats.rows[stats.rows.length - 1]?.value || 0,
      projectedCompletionDate:projection?.monthKey || "",
      progressPercentage:clamp(
        amount.amount / Math.max(1, goal.targetAmount) * 100,
        0,
        100
      ),
    };

    saveGoals(
      goals.map((item) =>
        item.id === goal.id
          ? touchSavingsGoal({
            ...item,
            snapshots:[
              ...item.snapshots.filter((entry) => entry.month !== currentMonth),
              snapshot,
            ].sort((left, right) => left.month.localeCompare(right.month)),
          })
          : item
      )
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen app-background text-white",
        theme === "light" && "light-theme"
      )}
    >
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 pb-10 pt-4 sm:px-6 sm:pt-6 md:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/70 px-3 py-2 text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                <ArrowLeft size={16} />
                Dashboard
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-cyan-500 text-black shadow-lg shadow-cyan-500/20">
                <Target size={24} />
              </span>
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-500">
                  Savings Goal Predictor
                </p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Reach the life you are saving for
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
            >
              <Settings2 size={16} />
              {theme === "dark" ? "Dark" : "Light"}
            </Button>

            <Button
              type="button"
              size="sm"
              className="savings-primary-action"
              onClick={resetForm}
            >
              <CirclePlus size={16} />
              New Goal
            </Button>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(240px,20%)_minmax(0,1fr)]">
          <aside className="space-y-5">
            <Card
              variant="default"
              padding="lg"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-400">
                    Goals
                  </p>
                  <h2 className="text-2xl font-bold">
                    {goals.length}
                  </h2>
                </div>
                <Wallet className="text-cyan-400" size={22} />
              </div>

              <div className="space-y-3">
                {goals.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400">
                    No savings goals yet.
                  </div>
                )}

                {goals.map((goal) => {
                  const amount =
                    getGoalAmount(goal, assets.assets);
                  const percent =
                    clamp(
                      amount.amount / Math.max(1, goal.targetAmount) * 100,
                      0,
                      100
                    );
                  const isSelected =
                    selectedGoal?.id === goal.id;

                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setSelectedGoalId(goal.id)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition",
                        isSelected
                          ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                          : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-500"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">
                            {goal.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatCurrencyAmount(amount.amount, goal.currency)} / {formatCurrencyAmount(goal.targetAmount, goal.currency)}
                          </p>
                        </div>
                        <span className={cn("rounded-full border px-2 py-1 text-[11px] font-bold", statusMeta[goal.status].className)}>
                          {statusMeta[goal.status].label}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width:`${percent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">
                        {percent.toFixed(1)}% complete
                      </p>
                    </button>
                  );
                })}
              </div>
            </Card>
          </aside>

          <section className="space-y-5">
            {!selectedGoal || !selectedGoalAmount || !paceStats ? (
              <Card
                variant="default"
                padding="lg"
                className="min-h-[360px]"
              >
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                  <Target className="text-cyan-400" size={42} />
                  <h2 className="mt-4 text-2xl font-bold">
                    Build your first goal
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-zinc-400">
                    Add a target amount and choose assets to start projecting your completion date.
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <Card
                  variant="info"
                  padding="lg"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-3xl font-bold tracking-tight">
                            {selectedGoal.name}
                          </h2>
                          <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", statusMeta[selectedGoal.status].className)}>
                            {statusMeta[selectedGoal.status].label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-400">
                          {selectedGoalAmount.source === "assets"
                            ? `${selectedGoalAmount.includedAssets.length} assets included`
                            : "Manual current amount"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditGoal(selectedGoal)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => deleteGoal(selectedGoal)}
                        >
                          <Trash2 size={16} />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-2xl font-bold text-cyan-400">
                          {formatCurrencyAmount(selectedGoalAmount.amount, selectedGoal.currency)}
                        </p>
                        <p className="text-sm text-zinc-400">
                          of {formatCurrencyAmount(selectedGoal.targetAmount, selectedGoal.currency)}
                        </p>
                      </div>
                      <div className="mt-3 h-4 overflow-hidden rounded-full bg-zinc-800 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                          style={{ width:`${progressPercent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {progressPercent.toFixed(1)}% complete
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <StatTile
                        label="Remaining"
                        value={formatCurrencyAmount(remainingAmount, selectedGoal.currency)}
                      />
                      <StatTile
                        label="Current Pace"
                        value={`${currencyLabel(selectedGoal.currency)} ${paceStats.average.toFixed(0)} / mo`}
                        helper={paceStats.sourceLabel}
                        tone={paceStats.average > 0 ? "success" : "danger"}
                      />
                      <StatTile
                        label="Estimated"
                        value={
                          currentProjection
                            ? formatMonthKey(currentProjection.monthKey)
                            : "Not projected"
                        }
                        helper={
                          currentProjection
                            ? `${currentProjection.months.toFixed(1)} months left`
                            : "Current pace is <= 0"
                        }
                        tone={currentProjection ? "info" : "danger"}
                      />
                      <StatTile
                        label="Historical Data"
                        value={`${paceStats.usedMonthCount} completed month${paceStats.usedMonthCount === 1 ? "" : "s"}`}
                        helper={`${paceStats.requestedPeriodLabel}. ${paceStats.usedMonthCount > 0 ? `Using ${paceStats.usedMonthCount} completed month${paceStats.usedMonthCount === 1 ? "" : "s"}.` : "No completed months available."}`}
                        tone={paceStats.usedMonthCount >= 6 ? "success" : paceStats.usedMonthCount >= 3 ? "warning" : "danger"}
                      />
                      <StatTile
                        label="Prediction Confidence"
                        value={confidence?.label || "Low"}
                        helper={
                          confidence?.downgraded
                            ? "High volatility lowered confidence"
                            : "Based on completed history"
                        }
                        tone={
                          confidence?.label === "Good"
                            ? "success"
                            : confidence?.label === "Moderate"
                            ? "info"
                            : confidence?.label === "Limited"
                            ? "warning"
                            : "danger"
                        }
                      />
                      <StatTile
                        label="Plan Status"
                        value={planStatus?.label || "No target date"}
                        helper={
                          requiredMonthlySaving === null
                            ? "Set a target date"
                            : `${formatCurrencyAmount(Math.abs(planStatus?.difference || 0), selectedGoal.currency)} / mo gap`
                        }
                        tone={planStatus?.tone || "neutral"}
                      />
                    </div>
                  </div>
                </Card>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <Card
                    variant="default"
                    padding="lg"
                  >
                    <div className="mb-5 flex items-center gap-2">
                      <SlidersHorizontal className="text-cyan-400" size={20} />
                      <h2 className="text-2xl font-bold">
                        What-if Saving
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-zinc-400">Monthly Saving</span>
                          <span className="font-bold text-cyan-400">
                            {formatCurrencyAmount(whatIfSaving, selectedGoal.currency)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={whatIfMax}
                          step={100}
                          value={whatIfSaving}
                          onChange={(event) => setWhatIfSaving(Number(event.target.value))}
                          className="mt-3 w-full accent-cyan-400"
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <StatTile
                          label="New Goal Date"
                          value={
                            whatIfProjection
                              ? formatMonthKey(whatIfProjection.monthKey)
                              : "Not projected"
                          }
                          tone={whatIfProjection ? "info" : "danger"}
                        />
                        <StatTile
                          label="Time Difference"
                          value={
                            whatIfDelta === null
                              ? "No baseline"
                              : formatMonthDelta(whatIfDelta)
                          }
                          tone={
                            whatIfDelta === null
                              ? "neutral"
                              : whatIfDelta <= 0
                              ? "success"
                              : "danger"
                          }
                        />
                        <StatTile
                          label="Days Difference"
                          value={
                            whatIfDelta === null
                              ? "No baseline"
                              : `${Math.abs(whatIfDelta * 30.44).toFixed(0)} days`
                          }
                          tone={
                            whatIfDelta === null
                              ? "neutral"
                              : whatIfDelta <= 0
                              ? "success"
                              : "danger"
                          }
                        />
                      </div>
                    </div>
                  </Card>

                  <Card
                    variant="default"
                    padding="lg"
                  >
                    <div className="mb-5 flex items-center gap-2">
                      <CalendarDays className="text-cyan-400" size={20} />
                      <h2 className="text-2xl font-bold">
                        Required
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <StatTile
                        label="Required Monthly"
                        value={
                          requiredMonthlySaving === null
                            ? "No date"
                            : `${currencyLabel(selectedGoal.currency)} ${requiredMonthlySaving.toFixed(0)} / mo`
                        }
                        helper={
                          selectedGoal.targetDate
                            ? formatMonthKey(selectedGoal.targetDate.slice(0, 7))
                            : "Target date not set"
                        }
                        tone={requiredMonthlySaving === null ? "neutral" : "info"}
                      />
                      <StatTile
                        label="Current Average"
                        value={`${currencyLabel(selectedGoal.currency)} ${paceStats.average.toFixed(0)} / mo`}
                        tone={paceStats.average >= (requiredMonthlySaving || 0) ? "success" : "danger"}
                      />
                    </div>
                  </Card>
                </div>

                <Card
                  variant="default"
                  padding="lg"
                >
                  <div className="mb-5 flex items-center gap-2">
                    <ChartLine className="text-cyan-400" size={20} />
                    <h2 className="text-2xl font-bold">
                      Scenario Projection
                    </h2>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {scenarioRows.map((scenario) => (
                      <StatTile
                        key={scenario.label}
                        label={scenario.label}
                        value={
                          scenario.pace === null
                            ? "Need 2+ months"
                            : `${currencyLabel(selectedGoal.currency)} ${scenario.pace.toFixed(0)} / mo`
                        }
                        helper={
                          scenario.projection
                            ? `${formatMonthKey(scenario.projection.monthKey)}. ${scenario.helper}`
                            : scenario.helper
                        }
                        tone={scenario.tone}
                      />
                    ))}
                  </div>

                  <div className="mt-5 h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projectionData}>
                        <CartesianGrid stroke="rgba(148,163,184,0.22)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill:"#94a3b8", fontSize:12 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={28}
                        />
                        <YAxis
                          tick={{ fill:"#94a3b8", fontSize:12 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${currencyLabel(selectedGoal.currency)}${Math.round(Number(value) / 1000)}k`}
                        />
                        <Tooltip content={renderProjectionTooltip} />
                        <ReferenceLine
                          y={selectedGoal.targetAmount}
                          stroke="#06b6d4"
                          strokeDasharray="4 4"
                        />
                        <Line
                          type="monotone"
                          dataKey="conservative"
                          name="Conservative"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="normal"
                          name="Normal"
                          stroke="#06b6d4"
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="aggressive"
                          name="Aggressive"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="grid gap-5 lg:grid-cols-2">
                  <Card
                    variant="default"
                    padding="lg"
                  >
                    <div className="mb-5 flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-400" size={20} />
                      <h2 className="text-2xl font-bold">
                        Historical Saving Pace
                      </h2>
                    </div>

                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                      <StatTile
                        label="Cashflow Saving Pace"
                        value={
                          cashflowPaceStats
                            ? `${currencyLabel(selectedGoal.currency)} ${cashflowPaceStats.average.toFixed(0)} / mo`
                            : "No data"
                        }
                        helper="Income - Expenses, completed months only"
                        tone={(cashflowPaceStats?.average || 0) > 0 ? "success" : "danger"}
                      />
                      <StatTile
                        label="Liquid Asset Growth"
                        value={
                          liquidAssetGrowthStats
                            ? `${currencyLabel(selectedGoal.currency)} ${liquidAssetGrowthStats.average.toFixed(0)} / mo`
                            : "Need snapshots"
                        }
                        helper="Included asset total change, transfers cancel out"
                        tone={liquidAssetGrowthStats ? "info" : "warning"}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <StatTile
                        label="Average"
                        value={formatCurrencyAmount(paceStats.average, selectedGoal.currency)}
                        helper={`${paceStats.requestedPeriodLabel}. Using ${paceStats.usedMonthCount} completed month${paceStats.usedMonthCount === 1 ? "" : "s"}.`}
                        tone={paceStats.average > 0 ? "success" : "danger"}
                      />
                      <StatTile
                        label="Median"
                        value={formatCurrencyAmount(paceStats.median, selectedGoal.currency)}
                      />
                      {paceStats.usedMonthCount >= 6 && (
                        <StatTile
                          label="Volatility"
                          value={formatCurrencyAmount(paceStats.standardDeviation, selectedGoal.currency)}
                          helper="Standard deviation of completed-month pace"
                          tone={
                            confidence?.downgraded
                              ? "warning"
                              : "info"
                          }
                        />
                      )}
                      <StatTile
                        label="Highest Month"
                        value={
                          paceStats.highest
                            ? formatCurrencyAmount(paceStats.highest.value, selectedGoal.currency)
                            : "No data"
                        }
                        helper={paceStats.highest?.label}
                        tone="success"
                      />
                      <StatTile
                        label="Lowest Month"
                        value={
                          paceStats.lowest
                            ? formatCurrencyAmount(paceStats.lowest.value, selectedGoal.currency)
                            : "No data"
                        }
                        helper={paceStats.lowest?.label}
                        tone="danger"
                      />
                    </div>

                    {paceStats.fallback && (
                      <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                        Liquid Asset Growth needs at least two completed monthly snapshots. Cashflow Saving Pace is used for now.
                      </p>
                    )}

                    {paceStats.hasOutliers && (
                      <p className="mt-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-400">
                        One unusually volatile completed month was detected. The raw history is kept, but pace estimates are winsorized.
                      </p>
                    )}

                    {paceStats.usedMonthCount < 3 && (
                      <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                        Limited history. Prediction confidence is low.
                      </p>
                    )}

                    {paceStats.usedMonthCount >= 3 && paceStats.usedMonthCount < 6 && (
                      <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                        Limited historical data. Prediction range unlocks after 6 completed months.
                      </p>
                    )}
                  </Card>

                  <Card
                    variant="default"
                    padding="lg"
                  >
                    <div className="mb-5 flex items-center gap-2">
                      <CirclePause className="text-cyan-400" size={20} />
                      <h2 className="text-2xl font-bold">
                        Prediction Range
                      </h2>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <StatTile
                        label="Most Likely"
                        value={
                          predictionRange?.hasEnoughHistory
                            ? predictionRange.mostLikely
                              ? formatMonthKey(predictionRange.mostLikely.monthKey)
                              : "No positive pace"
                            : "Not enough history"
                        }
                        helper={
                          predictionRange?.hasEnoughHistory
                            ? "Based on median completed-month saving"
                            : "At least 6 completed months are required"
                        }
                        tone={
                          predictionRange?.hasEnoughHistory && predictionRange.mostLikely
                            ? "info"
                            : "warning"
                        }
                      />
                      <StatTile
                        label="Likely Range"
                        value={
                          predictionRange?.hasEnoughHistory
                            ? predictionRange.optimistic
                              ? `${formatMonthKey(predictionRange.optimistic.monthKey)} - ${
                                predictionRange.conservative
                                  ? formatMonthKey(predictionRange.conservative.monthKey)
                                  : "Open ended"
                              }`
                              : "No positive pace"
                            : "Not enough history"
                        }
                        helper="Uses 75th and 25th percentile completed-month pace"
                        tone={
                          predictionRange?.hasEnoughHistory && predictionRange.optimistic
                            ? "info"
                            : "warning"
                        }
                      />
                      <StatTile
                        label="Current Income"
                        value={formatCurrencyAmount(currentMonthSoFar.income, selectedGoal.currency)}
                        helper={`${formatMonthKey(currentMonth)} is in progress`}
                        tone="success"
                      />
                      <StatTile
                        label="Current Expenses"
                        value={formatCurrencyAmount(currentMonthSoFar.expense, selectedGoal.currency)}
                        helper="Tracked separately from historical pace"
                        tone="danger"
                      />
                      <StatTile
                        label="Current Net"
                        value={formatCurrencyAmount(currentMonthSoFar.balance, selectedGoal.currency)}
                        helper="Excluded from prediction until month end"
                        tone={currentMonthSoFar.balance >= 0 ? "success" : "danger"}
                      />
                      <StatTile
                        label="This Month Impact"
                        value="Available after month end"
                        helper={`${formatMonthKey(currentMonth)} is still incomplete`}
                        tone="neutral"
                      />
                      <StatTile
                        label="Latest Completed Impact"
                        value={
                          monthlyImpact
                            ? formatMonthDelta(monthlyImpact.movedMonths)
                            : "Need more data"
                        }
                        helper={
                          monthlyImpact
                            ? `${formatMonthKey(monthlyImpact.latest.monthKey)} saved ${formatCurrencyAmount(Math.abs(monthlyImpact.difference), selectedGoal.currency)} ${
                              monthlyImpact.difference >= 0
                                ? "above"
                                : "below"
                            } normal pace`
                            : "Requires at least two completed months"
                        }
                        tone={
                          monthlyImpact
                            ? monthlyImpact.movedMonths <= 0
                              ? "success"
                              : "danger"
                            : "neutral"
                        }
                      />
                    </div>
                  </Card>
                </div>

                <Card
                  variant="default"
                  padding="lg"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="text-cyan-400" size={20} />
                      <h2 className="text-2xl font-bold">
                        Asset Inclusion
                      </h2>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => recordSnapshot(selectedGoal)}
                    >
                      Record Snapshot
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedGoalAmount.includedAssets.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400">
                        No assets selected for this goal.
                      </div>
                    )}

                    {selectedGoalAmount.includedAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="savings-frame rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">
                              {asset.name}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {getAssetRule(asset)}
                            </p>
                          </div>
                          <p className="shrink-0 font-bold text-cyan-400">
                            {formatCurrencyAmount(asset.current_value, asset.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </section>

        </div>

        {isEditorOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Savings goal editor"
            className="fixed inset-0 z-50 flex justify-end bg-black/45 p-3 backdrop-blur-sm sm:p-5"
            onClick={() => setIsEditorOpen(false)}
          >
            <div
              className="h-full w-full max-w-xl"
              onClick={(event) => event.stopPropagation()}
            >
            <Card
              variant="default"
              padding="lg"
              className="flex h-full flex-col overflow-hidden shadow-2xl"
            >
              <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-400">
                    Goal Setup
                  </p>
                  <h2 className="text-2xl font-bold">
                    {form.editingId ? "Edit Goal" : "New Goal"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="text-cyan-400" size={22} />
                  <button
                    type="button"
                    aria-label="Close goal setup"
                    onClick={() => setIsEditorOpen(false)}
                    className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/25 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <form
                className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
                onSubmit={handleSubmit}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-zinc-400">
                    Goal Name
                  </span>
                  <Input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Freedom Fund"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-zinc-400">
                      Target Amount
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.targetAmount}
                      onChange={(event) => updateForm("targetAmount", event.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-zinc-400">
                      Current Amount
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.manualCurrentAmount}
                      onChange={(event) => updateForm("manualCurrentAmount", event.target.value)}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-zinc-400">
                      Currency
                    </span>
                    <Select
                      value={form.currency}
                      onChange={(event) => updateForm("currency", normalizeCurrency(event.target.value))}
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency} value={currency}>
                          {currencyLabel(currency)}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-zinc-400">
                      Status
                    </span>
                    <Select
                      value={form.status}
                      onChange={(event) => updateForm("status", event.target.value as SavingsGoalStatus)}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </Select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-zinc-400">
                      Created Date
                    </span>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => updateForm("startDate", event.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-zinc-400">
                      Target Date
                    </span>
                    <Input
                      type="date"
                      value={form.targetDate}
                      onChange={(event) => updateForm("targetDate", event.target.value)}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-zinc-400">
                    Calculation Method
                  </span>
                  <Select
                    value={form.calculationMethod}
                    onChange={(event) => updateForm("calculationMethod", event.target.value as SavingsCalculationMethod)}
                  >
                    <option value="income-expenses">{methodLabels["income-expenses"]}</option>
                    <option value="net-asset-increase">{methodLabels["net-asset-increase"]}</option>
                  </Select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-zinc-400">
                    Pace Period
                  </span>
                  <Select
                    value={form.pacePeriod}
                    onChange={(event) => updateForm("pacePeriod", event.target.value as SavingsPacePeriod)}
                  >
                    <option value="3m">{periodLabels["3m"]}</option>
                    <option value="6m">{periodLabels["6m"]}</option>
                    <option value="12m">{periodLabels["12m"]}</option>
                    <option value="custom">{periodLabels.custom}</option>
                  </Select>
                </label>

                {form.pacePeriod === "custom" && (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-zinc-400">
                        Start Month
                      </span>
                      <Input
                        type="month"
                        value={form.customStartMonth}
                        onChange={(event) => updateForm("customStartMonth", event.target.value)}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-zinc-400">
                        End Month
                      </span>
                      <Input
                        type="month"
                        value={form.customEndMonth}
                        onChange={(event) => updateForm("customEndMonth", event.target.value)}
                      />
                    </label>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-400">
                      Assets Included
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectSuggestedAssets}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                      >
                        Suggested
                      </button>
                      <button
                        type="button"
                        onClick={clearAssets}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {availableAssets.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400">
                        No assets for {currencyLabel(form.currency)}.
                      </div>
                    )}

                    {availableAssets.map((asset) => {
                      const checked =
                        form.includedAssetIds.includes(asset.id);

                      return (
                        <label
                          key={asset.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition",
                            checked
                              ? "border-cyan-400 bg-cyan-500/10"
                              : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-500"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAsset(asset.id)}
                            className="size-4 shrink-0 accent-cyan-400"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white">
                              {asset.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {getAssetRule(asset)} - {formatCurrencyAmount(asset.current_value, asset.currency)}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {formError && (
                  <p className={cn("rounded-2xl border p-3 text-sm", toneStyles.danger.subtleSurface, toneStyles.danger.text)}>
                    {formError}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="savings-primary-action flex-1"
                  >
                    <Save size={16} />
                    Save Goal
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetForm}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
