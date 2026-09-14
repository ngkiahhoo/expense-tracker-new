import type { FutureExpenseLibrary } from "../types/futureExpense";

export function assertExpenseLibrary(value: unknown): asserts value is FutureExpenseLibrary {
  const l = value as FutureExpenseLibrary;
  if (!l || ![l.plans, l.types, l.categories, l.mappings].every(Array.isArray) ||
    l.plans.some(p => !p || typeof p.id !== "string" || typeof p.name !== "string" || !["MYR", "SGD"].includes(p.currency) || !Array.isArray(p.items) || p.items.some(i => !i || i.plan_id !== p.id || typeof i.id !== "string" || typeof i.name !== "string" || !Number.isFinite(i.amount) || i.amount < 0 || i.amount > 1e12)) ||
    new Set(l.plans.map(p => p.id)).size !== l.plans.length) throw new Error("Expense plan data is invalid. Original browser data has been preserved.");
  if (l.plans.some(p => (p.monthly_income !== undefined && (!Number.isFinite(p.monthly_income) || p.monthly_income < 0 || p.monthly_income > 1e12)) || (p.months_to_project !== undefined && (!Number.isInteger(p.months_to_project) || p.months_to_project < 1 || p.months_to_project > 1200)))) throw new Error("Invalid monthly income or projection months.");
}

export function mergeLegacyLibrary(cloud: FutureExpenseLibrary, local: FutureExpenseLibrary, imported: string[]) {
  const plans = local.plans.filter(p => !imported.includes(p.id));
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [...a, ...b.filter(x => !a.some(y => y.id === x.id))];
  return {
    library: { plans: merge(cloud.plans, plans), types: merge(cloud.types, local.types), categories: merge(cloud.categories, local.categories), mappings: cloud.mappings },
    imported_ids: [...new Set([...imported, ...plans.map(p => p.id)])],
  };
}
