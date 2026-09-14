import type { FutureExpenseLibrary, FutureExpensePlan } from "../types/futureExpense";
import { itemIsEnabled } from "./futureExpense";

/** A constant monthly budget, independent of scenario dates and funding assumptions. */
export function projectLivingExpenses(plan: FutureExpensePlan, library: FutureExpenseLibrary, months: number) {
  const errors: string[] = [];
  const byType: Record<string, number> = {}, byCategory: Record<string, number> = {};
  let cents = 0;
  if (!Number.isSafeInteger(months) || months < 1 || months > 1200) errors.push("Enter a whole number of months from 1 to 1200.");
  for (const item of plan.items) {
    if (!item.enabled) continue;
    if (!item.type_id || !item.category_id || !library.categories.some(c => c.id === item.category_id && c.type_id === item.type_id)) {
      errors.push(`${item.name}: choose a type and category.`); continue;
    }
    if (!itemIsEnabled(item, library)) continue;
    if (item.currency !== plan.currency) { errors.push(`${item.name}: enter its monthly amount in ${plan.currency} to include it in this plan.`); continue; }
    if (!Number.isFinite(item.amount) || item.amount < 0 || item.amount > 1e12) { errors.push(`${item.name}: enter a monthly amount between 0 and one trillion.`); continue; }
    const amount = Math.round(item.amount * 100);
    cents += amount;
    byType[item.type_id] = (byType[item.type_id] || 0) + amount;
    byCategory[item.category_id] = (byCategory[item.category_id] || 0) + amount;
  }
  if (!Number.isSafeInteger(cents * months)) errors.push("This projection is too large. Reduce the amount or number of months.");
  return {
    monthly: errors.length ? null : cents / 100,
    required: errors.length ? null : cents * months / 100,
    byType: Object.fromEntries(Object.entries(byType).map(([id, value]) => [id, value / 100])),
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([id, value]) => [id, value / 100])),
    errors: [...new Set(errors)],
  };
}
