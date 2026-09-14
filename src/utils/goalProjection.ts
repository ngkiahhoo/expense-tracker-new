import type { Asset } from "../types/asset";
import type { Currency } from "../types/currency";
import type { FutureExpenseLibrary } from "../types/futureExpense";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import { livingPlanCashFlow } from "./livingExpense";
import { addMonths, validDate } from "./expenseMath";

const dayMs = 86400000;
const round = (n: number) => Math.round(n * 100) / 100;
export interface GoalInput { targetAmount: number; currency: Currency; includedAssetIds: number[]; living_plan_id?: string | null; targetDate: string }

// Whole calendar months followed by a fraction of the next calendar month.
export function dateAfterMonths(today: string, months: number): string | null {
  if (!validDate(today) || !Number.isFinite(months) || months < 0 || months > 12000) return null;
  const whole = Math.floor(months);
  const start = addMonths(today, whole), end = addMonths(today, whole + 1);
  const timestamp = Date.parse(start) + Math.ceil((Date.parse(end) - Date.parse(start)) * (months - whole) / dayMs) * dayMs;
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function monthsUntil(today: string, target: string): number | null {
  if (!validDate(today) || !validDate(target)) return null;
  if (target <= today) return 0;
  let whole = (Number(target.slice(0, 4)) - Number(today.slice(0, 4))) * 12 + Number(target.slice(5, 7)) - Number(today.slice(5, 7));
  if (addMonths(today, whole) > target) whole--;
  const from = Date.parse(addMonths(today, whole)), to = Date.parse(addMonths(today, whole + 1));
  return whole + (Date.parse(target) - from) / (to - from);
}

/** Current balances already include this month; projected cash flow starts next month. */
export function nextProjectionDate(today: string): string | null {
  if (!validDate(today)) return null;
  return addMonths(`${today.slice(0, 7)}-01`, 1);
}

export function savingTimeline(current: number, target: number, saving: number | null, today: string) {
  const remaining = Math.max(0, round(target - current));
  const state = remaining === 0 ? "reached" : saving === null ? "missing" : saving < 0 ? "deficit" : saving === 0 ? "stalled" : "growing";
  const months = state === "growing" ? remaining / saving! : null;
  return { remaining, state, months, date: months === null ? null : dateAfterMonths(today, months) };
}

export function projectGoal(goal: GoalInput, assets: Asset[], library: FutureExpenseLibrary, today: string) {
  const errors: string[] = [];
  const included = assets.filter(a => goal.includedAssetIds.includes(a.id));
  if (new Set(included.map(a => a.id)).size !== new Set(goal.includedAssetIds).size) errors.push("An included asset is no longer available. Review included assets.");
  if (included.some(a => (a.currency ?? "MYR") !== goal.currency)) errors.push(`Included assets must use ${goal.currency}. Currency conversion is not configured.`);
  if (included.some(a => !Number.isFinite(Number(a.current_value)))) errors.push("An included asset has an invalid balance.");
  if (!Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0 || goal.targetAmount > 1e12) errors.push("Enter a target amount above zero and no greater than one trillion.");
  if (!validDate(today)) errors.push("Invalid projection date.");
  const current = errors.length ? null : round(included.reduce((total, a) => total + Number(a.current_value), 0));
  const plan = library.plans.find(p => p.id === goal.living_plan_id);
  const cashFlow = plan ? livingPlanCashFlow(plan, library) : null;
  if (plan && plan.currency !== goal.currency) errors.push(`Living Cost Plan must use ${goal.currency}. Currency conversion is not configured.`);
  if (cashFlow) errors.push(...cashFlow.errors);
  const saving = errors.length ? null : cashFlow?.saving ?? null;
  const projectionStart = nextProjectionDate(today);
  const timeline = current === null ? null : savingTimeline(current, goal.targetAmount, saving, projectionStart ?? today);
  const targetMonths = goal.targetDate && projectionStart ? monthsUntil(projectionStart, goal.targetDate) : null;
  if (goal.targetDate && targetMonths === null) errors.push("Enter a valid target date.");
  const required = timeline && targetMonths !== null && targetMonths > 0 ? timeline.remaining / targetMonths : null;
  const difference = required === null || saving === null ? null : saving - required;
  const paceStatus = difference === null ? null : Math.abs(difference) < 0.01 ? "On Track" : difference > 0 ? "Ahead of Plan" : "Behind Plan";
  return { current, plan, cashFlow, saving, timeline, errors, targetMonths, required, difference, paceStatus, projectionStart, progress: current === null ? null : Math.max(0, Math.min(100, current / goal.targetAmount * 100)) };
}

export function goalMilestones(current: number, target: number, saving: number | null, today: string) {
  if (!Number.isFinite(target) || target <= 0) return [];
  const raw = target / 5, power = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(0.01, Math.ceil(raw / power) * power);
  const amounts: number[] = [];
  for (let amount = step; amount < target && amounts.length < 5; amount += step) amounts.push(round(amount));
  amounts.push(target);
  const next = amounts.find(amount => amount > current);
  return amounts.map(amount => ({ amount, status: amount <= current ? "Completed" : amount === target ? "Final Goal" : amount === next ? "Next" : "Upcoming", ...savingTimeline(current, amount, saving, today) }));
}

export function whatIfSaving(current: number, target: number, baseline: number | null, alternate: number, today: string) {
  const original = savingTimeline(current, target, baseline, today);
  const simulated = savingTimeline(current, target, Number.isFinite(alternate) ? alternate : null, today);
  return { ...simulated, monthsDifference: original.months === null || simulated.months === null ? null : original.months - simulated.months, daysDifference: original.date && simulated.date ? Math.round((Date.parse(original.date) - Date.parse(simulated.date)) / dayMs) : null };
}

export function actualSavingCheck(expenses: Expense[], incomes: Income[], currency: Currency, today: string) {
  const months = [3, 2, 1].map(n => addMonths(`${today.slice(0, 7)}-01`, -n).slice(0, 7));
  const relevantExpenses = expenses.filter(e => (e.currency ?? "MYR") === currency && months.includes(e.expense_date.slice(0, 7)));
  const relevantIncomes = incomes.filter(i => (i.currency ?? "MYR") === currency && months.includes(i.income_date.slice(0, 7)));
  const hasRecords = relevantExpenses.length + relevantIncomes.length > 0;
  const amount = round((relevantIncomes.reduce((s, i) => s + Number(i.amount), 0) - relevantExpenses.reduce((s, e) => s + Number(e.amount), 0)) / 3);
  return { months, average: hasRecords ? amount : null };
}
