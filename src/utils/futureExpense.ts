import type { Assumption, LifeScenario, LifeScenarioPhase, ScenarioExpense } from "../types/lifeScenario";
import type { Currency } from "../types/currency";
import type { ExpenseBehavior, ExpenseCalendarEntry, FutureExpenseCategory, FutureExpenseItem, FutureExpenseLibrary, FutureExpensePlan, FutureExpenseType } from "../types/futureExpense";
import { addMonths, nextDay, round, uid, validDate } from "./scenarioMath";

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
  return { id: uid(), name, description: "", currency, items: [], confirmed: false, created_at: now, updated_at: now };
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
export function amountIn(a: Assumption, currency: Currency, fx: Record<Currency, number>) {
  const rate = a.currency === currency ? 1 : fx[a.currency];
  return Number.isFinite(a.amount) && Number.isFinite(rate) && rate > 0 ? a.amount * rate : null;
}
export function expensePlanSummary(plan: FutureExpensePlan, library: FutureExpenseLibrary, currency: Currency, fx: Record<Currency, number>, overrides: LifeScenarioPhase["expense_overrides"] = {}) {
  const byType: Record<string, number> = {}, byCategory: Record<string, number> = {};
  let total = 0, fixed = 0, missingFx = false;
  for (const item of plan.items) {
    const value = { ...item, ...overrides[item.id] };
    if (!itemIsEnabled(value, library)) continue;
    const amount = amountIn(value, currency, fx);
    if (amount === null) { missingFx = true; continue; }
    total += amount;
    if (item.is_fixed || itemBehavior(item, library) === "COMMITMENT") fixed += amount;
    byType[item.type_id!] = (byType[item.type_id!] || 0) + amount;
    byCategory[item.category_id!] = (byCategory[item.category_id!] || 0) + amount;
  }
  return { total: round(total), fixed: round(fixed), byType, byCategory, missingFx };
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
export function importExpenseSuggestions(plan: FutureExpensePlan, library: FutureExpenseLibrary, suggestions: ScenarioExpense[], source: "HISTORICAL" | "RECURRING"): FutureExpensePlan {
  const next = structuredClone(plan); const now = new Date().toISOString();
  for (const suggestion of suggestions.filter(x => x.source_type === source)) {
    const reference = suggestion.source_reference_id || (suggestion.id.startsWith("recurring-") ? `recurring:${suggestion.id.slice(10)}` : suggestion.id.startsWith("category-") ? `historical:${suggestion.currency}:${suggestion.id.slice(9)}` : `${source.toLowerCase()}:${suggestion.id}`);
    if (next.items.some(x => x.source_reference_id === reference)) continue;
    const mapping = library.mappings.find(m => m.source_category_id === suggestion.source_category_id);
    const matches = library.categories.filter(c => c.name.trim().toLowerCase() === (suggestion.source_category_name || suggestion.name).trim().toLowerCase());
    const mapped = mapping ? library.categories.find(c => c.id === mapping.future_category_id && c.type_id === mapping.future_type_id) : matches.length === 1 ? matches[0] : undefined;
    next.items.push({ ...newExpenseItem(plan), name: suggestion.name, amount: suggestion.amount, currency: suggestion.currency, source_type: source,
      source_reference_id: reference, source_category_id: suggestion.source_category_id, type_id: mapped?.type_id || null, category_id: mapped?.id || null,
      historical_average: source === "HISTORICAL" ? suggestion.amount : undefined, historical_currency: source === "HISTORICAL" ? suggestion.currency : undefined,
      is_fixed: source === "RECURRING", repeat_day: suggestion.repeat_day, enabled: suggestion.enabled, updated_at: now });
  }
  next.confirmed = false; next.updated_at = now;
  return next;
}
export function duplicateExpensePlan(plan: FutureExpensePlan, library: FutureExpenseLibrary, factor = 1, name = `${plan.name} (Copy)`): FutureExpensePlan {
  if (!Number.isFinite(factor) || factor < 0 || factor > 5) throw new Error("Use an explicit multiplier between 0 and 5.");
  const next = newExpensePlan(plan.currency, name); next.description = plan.description;
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
export function planForDate(s: LifeScenario, library: FutureExpenseLibrary, date: string) {
  const phase = s.phases.find(p => p.start_date <= date && p.end_date >= date);
  const plan = library.plans.find(p => p.id === (phase ? phase.expense_plan_id : s.expense_plan_id));
  return { phase, plan };
}
/** Only selected, explicitly confirmed plans supply living expenses. History is never read here. */
export function buildExpenseCalendar(s: LifeScenario, library: FutureExpenseLibrary): ExpenseCalendarEntry[] {
  const entries: ExpenseCalendarEntry[] = [];
  const recurringOccurrences = new Set<string>();
  if (!validDate(s.start_date) || !validDate(s.projection_end_date) || s.projection_end_date < s.start_date || s.projection_end_date > addMonths(s.start_date, 600)) return entries;
  for (let month = s.start_date.slice(0, 7) + "-01", index = 0; month <= s.projection_end_date; month = addMonths(month, 1), index++) {
    const end = nextDay(addMonths(month, 1), -1), days = Number(end.slice(8));
    const from = month < s.start_date ? s.start_date : month, to = end > s.projection_end_date ? s.projection_end_date : end;
    const inflation = s.inflation_enabled ? Math.pow(1 + s.inflation_rate / 100, index / 12) : 1;
    for (let day = Number(from.slice(8)); day <= Number(to.slice(8)); day++) {
      const date = `${month.slice(0, 7)}-${String(day).padStart(2, "0")}`;
      const { phase, plan } = planForDate(s, library, date);
      if (!plan?.confirmed) continue;
      for (const item of plan.items) {
        const value = { ...item, ...phase?.expense_overrides[item.id] };
        if (!itemIsEnabled(value, library) || (item.start_date && date < item.start_date) || (item.end_date && date > item.end_date)) continue;
        if (item.repeat_day && day !== Math.min(item.repeat_day, days)) continue;
        const occurrence = item.source_reference_id?.startsWith("recurring:") && item.repeat_day ? `${month}:${item.source_reference_id}` : null;
        if (occurrence && recurringOccurrences.has(occurrence)) continue;
        const converted = amountIn(value, s.currency, s.fx);
        if (converted === null) throw new Error(`Set an FX assumption for ${item.name}.`);
        if (occurrence) recurringOccurrences.add(occurrence);
        const behavior = itemBehavior(item, library);
        const fixed = item.is_fixed || behavior === "COMMITMENT";
        const raw = converted / (item.repeat_day ? 1 : days);
        const amount = raw * (fixed ? 1 : inflation);
        entries.push({ date, phase_id: phase?.id || null, kind: "LIVING", amount, inflation_effect: amount - raw, item_id: item.id, name: item.name, type_id: item.type_id!, category_id: item.category_id!, behavior_tag: behavior, is_fixed: fixed });
      }
    }
  }
  for (const payment of s.baseline.repayments.filter(p => p.date >= s.start_date && p.date <= s.projection_end_date)) entries.push({ date: payment.date, phase_id: s.phases.find(p => p.start_date <= payment.date && p.end_date >= payment.date)?.id || null, kind: "LIABILITY", amount: amountIn(payment, s.currency, s.fx)!, inflation_effect: 0, item_id: payment.id, name: payment.name, is_fixed: true });
  for (const event of s.events.filter(e => e.direction === "expense" && e.date >= s.start_date && e.date <= s.projection_end_date)) entries.push({ date: event.date, phase_id: s.phases.find(p => p.start_date <= event.date && p.end_date >= event.date)?.id || null, kind: "ONE_TIME", amount: amountIn(event, s.currency, s.fx)!, inflation_effect: 0, item_id: event.id, name: event.description, is_fixed: false });
  return entries;
}
