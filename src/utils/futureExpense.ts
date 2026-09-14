import type { Currency } from "../types/currency";
import type { ExpenseBehavior, FutureExpenseCategory, FutureExpenseItem, FutureExpenseLibrary, FutureExpensePlan, FutureExpenseType } from "../types/futureExpense";
import { round, uid, validDate } from "./expenseMath";

export const emptyExpenseLibrary = (): FutureExpenseLibrary => ({ plans: [], types: [], categories: [], mappings: [] });
export const behaviors: ExpenseBehavior[] = ["MANDATORY", "REDUCIBLE", "OPTIONAL", "COMMITMENT"];
export const expenseSourceTypes = ["HISTORICAL", "RECURRING", "EXISTING_COMMITMENT", "USER_CREATED", "USER_OVERRIDE", "ESTIMATED"] as const;
export const ordered = <T extends { sort_order: number; id: string }>(items: T[]) => [...items].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
export function newExpenseType(name = "New type", behavior_tag: ExpenseBehavior = "MANDATORY"): FutureExpenseType {
  const now = new Date().toISOString();
  return { id: uid(), name, description: "", sort_order: 0, is_active: true, behavior_tag, created_at: now, updated_at: now };
}
export function newExpenseCategory(type_id: string, name = "New category"): FutureExpenseCategory {
  const now = new Date().toISOString();
  return { id: uid(), type_id, name, description: "", sort_order: 0, is_active: true, created_at: now, updated_at: now };
}
export function newExpensePlan(currency: Currency, name = "Monthly living plan"): FutureExpensePlan {
  const now = new Date().toISOString();
  return { id: uid(), name, description: "", currency, monthly_income: 0, months_to_project: 12, items: [], confirmed: false, created_at: now, updated_at: now };
}
export function newExpenseItem(plan: FutureExpensePlan): FutureExpenseItem {
  const now = new Date().toISOString();
  return { id: uid(), plan_id: plan.id, type_id: null, category_id: null, name: "New expense", amount: 0, currency: plan.currency, source_type: "USER_CREATED", enabled: true, is_fixed: false, note: "", created_at: now, updated_at: now };
}
export function starterExpenseStructure(library: FutureExpenseLibrary): FutureExpenseLibrary {
  const copy = structuredClone(library);
  for (const [name, behavior, names] of [
    ["Needs", "MANDATORY", ["Housing", "Food", "Utilities", "Transport", "Family"]],
    ["Wants", "OPTIONAL", ["Dining Out", "Entertainment", "Shopping", "Travel"]],
    ["Commitments", "COMMITMENT", ["Subscriptions", "PayLater", "Instalments", "Loans", "Insurance"]],
  ] as const) {
    const type = { ...newExpenseType(name, behavior), sort_order: copy.types.length };
    copy.types.push(type);
    names.forEach((name, index) => copy.categories.push({ ...newExpenseCategory(type.id, name), sort_order: index }));
  }
  return copy;
}
export function itemBehavior(item: FutureExpenseItem, library: FutureExpenseLibrary): ExpenseBehavior {
  return library.types.find(t => t.id === item.type_id)?.behavior_tag || "MANDATORY";
}
export function itemIsEnabled(item: FutureExpenseItem, library: FutureExpenseLibrary) {
  const category = library.categories.find(c => c.id === item.category_id);
  return item.enabled && !!category?.is_active && category.type_id === item.type_id && !!library.types.find(t => t.id === item.type_id)?.is_active;
}
export function validateExpensePlan(plan: FutureExpensePlan, library: FutureExpenseLibrary): string[] {
  const errors: string[] = [];
  if (!plan.name.trim()) errors.push("Enter an expense plan name.");
  const refs = new Set<string>();
  for (const item of plan.items) {
    if (!item.name.trim()) errors.push("Enter a name for each expense item.");
    if (!Number.isFinite(item.amount) || item.amount < 0 || item.amount > 1e12) errors.push(`${item.name}: enter a non-negative amount within one trillion.`);
    if (item.plan_id !== plan.id) errors.push(`${item.name}: invalid plan link.`);
    if (item.enabled && (!item.category_id || !item.type_id)) errors.push(`${item.name}: choose a type and category (currently Unmapped).`);
    if (item.category_id && (!library.categories.some(c => c.id === item.category_id && c.type_id === item.type_id) || !library.types.some(t => t.id === item.type_id))) errors.push(`${item.name}: category must belong to the selected type.`);
    if (item.type_id && !library.types.find(t => t.id === item.type_id)?.name.trim()) errors.push(`${item.name}: enter a name for its type.`);
    if (item.category_id && !library.categories.find(c => c.id === item.category_id)?.name.trim()) errors.push(`${item.name}: enter a name for its category.`);
    if ((item.start_date && !validDate(item.start_date)) || (item.end_date && !validDate(item.end_date)) || (item.start_date && item.end_date && item.start_date > item.end_date)) errors.push(`${item.name}: check the active date range.`);
    if (item.repeat_day !== undefined && (!Number.isInteger(item.repeat_day) || item.repeat_day < 1 || item.repeat_day > 31)) errors.push(`${item.name}: payment day must be 1–31.`);
    if (item.source_type === "EXISTING_COMMITMENT" || item.source_reference_id?.startsWith("installment:")) errors.push(`${item.name}: instalments belong in Temporary Commitments, not permanent living items.`);
    if (item.source_reference_id) {
      if (refs.has(item.source_reference_id)) errors.push(`${item.name}: this source payment is already present in the plan.`);
      refs.add(item.source_reference_id);
    }
  }
  return [...new Set(errors)];
}
export function duplicateExpensePlan(plan: FutureExpensePlan, library: FutureExpenseLibrary, factor = 1, name = `${plan.name} (Copy)`): FutureExpensePlan {
  if (!Number.isFinite(factor) || factor < 0 || factor > 5) throw new Error("Use an explicit multiplier between 0 and 5.");
  const next = newExpensePlan(plan.currency, name); next.description = plan.description;
  next.monthly_income = plan.monthly_income ?? 0;
  next.months_to_project = plan.months_to_project ?? 12;
  next.items = plan.items.map(item => ({ ...structuredClone(item), id: uid(), plan_id: next.id,
    amount: round(item.amount * (["REDUCIBLE", "OPTIONAL"].includes(itemBehavior(item, library)) && !item.is_fixed ? factor : 1)),
    source_type: factor === 1 ? item.source_type : "USER_OVERRIDE", created_at: next.created_at, updated_at: next.updated_at }));
  return next;
}
/** Reassignment updates denormalized type IDs and import mapping memory atomically. */
export function moveExpenseCategory(library: FutureExpenseLibrary, categoryId: string, typeId: string): FutureExpenseLibrary {
  if (!library.types.some(t => t.id === typeId)) throw new Error("Choose an existing destination type.");
  const next = structuredClone(library); const now = new Date().toISOString();
  next.categories = next.categories.map(c => c.id === categoryId ? { ...c, type_id: typeId, updated_at: now } : c);
  next.plans = next.plans.map(p => ({ ...p, confirmed: p.items.some(i => i.category_id === categoryId) ? false : p.confirmed, items: p.items.map(i => i.category_id === categoryId ? { ...i, type_id: typeId, updated_at: now } : i) }));
  next.mappings = next.mappings.map(m => m.future_category_id === categoryId ? { ...m, future_type_id: typeId } : m);
  return next;
}
export function deleteExpenseCategory(library: FutureExpenseLibrary, id: string, destination?: string): FutureExpenseLibrary {
  const target = library.categories.find(c => c.id === destination && c.id !== id);
  const count = library.plans.reduce((sum, p) => sum + p.items.filter(i => i.category_id === id).length, 0);
  if (count && !target) throw new Error(`This category contains ${count} expense items. Move them to another category before deleting.`);
  const next = structuredClone(library); next.categories = next.categories.filter(c => c.id !== id);
  if (target) {
    next.plans = next.plans.map(p => ({ ...p, confirmed: p.items.some(i => i.category_id === id) ? false : p.confirmed, items: p.items.map(i => i.category_id === id ? { ...i, category_id: target.id, type_id: target.type_id, updated_at: new Date().toISOString() } : i) }));
    next.mappings = next.mappings.map(m => m.future_category_id === id ? { ...m, future_category_id: target.id, future_type_id: target.type_id } : m);
  } else next.mappings = next.mappings.filter(m => m.future_category_id !== id);
  return next;
}
export function deleteExpenseType(library: FutureExpenseLibrary, id: string, destination?: string): FutureExpenseLibrary {
  const children = library.categories.filter(c => c.type_id === id);
  if (children.length && (!destination || destination === id || !library.types.some(t => t.id === destination))) throw new Error(`This type contains ${children.length} categories. Move them to another type or disable the type.`);
  let next = structuredClone(library);
  for (const c of children) next = moveExpenseCategory(next, c.id, destination!);
  next.types = next.types.filter(t => t.id !== id);
  next.mappings = next.mappings.filter(m => m.future_type_id !== id);
  return next;
}
