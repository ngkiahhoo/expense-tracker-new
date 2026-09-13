import type { LifeScenario, ScenarioExpense } from "../types/lifeScenario";
import type { ExpenseBehavior, FutureExpenseLibrary, FutureExpensePlan } from "../types/futureExpense";
import { emptyExpenseLibrary, expenseSourceTypes, validateExpensePlan } from "./futureExpense";
import { round } from "./scenarioMath";

export interface PlanningWorkspace { version: 2; scenarios: LifeScenario[]; library: FutureExpenseLibrary }
export function emptyPlanningWorkspace(): PlanningWorkspace { return { version: 2, scenarios: [], library: emptyExpenseLibrary() }; }
/** Deterministic migration. The legacy storage key remains an untouched backup. */
export function migrateLegacyScenarios(raw: string): PlanningWorkspace {
  const legacy = JSON.parse(raw) as (Omit<LifeScenario, "version" | "expense_plan_id"> & { version: 1 })[];
  if (!Array.isArray(legacy)) throw new Error("Invalid legacy scenarios");
  const workspace = emptyPlanningWorkspace();
  const behavior: Record<ScenarioExpense["classification"], ExpenseBehavior> = { ESSENTIAL: "MANDATORY", FLEXIBLE: "REDUCIBLE", DISCRETIONARY: "OPTIONAL", COMMITMENT: "COMMITMENT" };
  for (const original of legacy) {
    if (original.version !== 1 || !original.id || !Array.isArray(original.baseline?.expenses) || !Array.isArray(original.phases)) throw new Error("Invalid legacy scenario");
    const s = structuredClone(original); const now = s.updated_at;
    const plan: FutureExpensePlan = { id: `migrated-plan:${s.id}`, name: `${s.name} living plan`, description: "Preserved from the previous scenario. Review and confirm these explicit planned amounts.", currency: s.currency, items: [], confirmed: false, created_at: now, updated_at: now };
    const ids = new Map<string, string>();
    for (const e of s.baseline.expenses) {
      const tag = behavior[e.classification]; if (!tag) throw new Error("Invalid legacy expense classification");
      const typeId = `migrated-type:${tag}`;
      if (!workspace.library.types.some(t => t.id === typeId)) workspace.library.types.push({ id: typeId, name: { MANDATORY: "Needs", REDUCIBLE: "Flexible", OPTIONAL: "Wants", COMMITMENT: "Commitments" }[tag], description: "Migrated; fully editable", behavior_tag: tag, is_active: true, sort_order: workspace.library.types.length, created_at: now, updated_at: now });
      const categoryId = `migrated-category:${s.id}:${e.id}`;
      workspace.library.categories.push({ id: categoryId, type_id: typeId, name: e.name, description: "", sort_order: workspace.library.categories.length, is_active: true, created_at: now, updated_at: now });
      const id = `migrated-item:${s.id}:${e.id}`; ids.set(e.id, id);
      const factor = s.lifestyle !== "NORMAL" && ["REDUCIBLE", "OPTIONAL"].includes(tag) ? s.flexible_multiplier : 1;
      plan.items.push({ id, plan_id: plan.id, type_id: typeId, category_id: categoryId, name: e.name, amount: round(e.amount * factor), currency: e.currency,
        source_type: factor !== 1 ? "USER_OVERRIDE" : e.source_type === "ESTIMATED" ? "USER_CREATED" : e.source_type,
        source_reference_id: e.source_reference_id || (e.id.startsWith("recurring-") ? `recurring:${e.id.slice(10)}` : e.id.startsWith("category-") ? `historical:${s.currency}:${e.id.slice(9)}` : undefined),
        source_category_id: e.source_category_id || (e.id.startsWith("category-") ? e.id.slice(9) : undefined), historical_average: e.source_type === "HISTORICAL" ? e.amount : undefined, historical_currency: e.source_type === "HISTORICAL" ? e.currency : undefined,
        enabled: e.enabled, repeat_day: e.repeat_day, is_fixed: !!e.repeat_day || tag === "COMMITMENT", note: factor !== 1 ? `Previous lifestyle multiplier ${factor} materialized in this amount.` : "", created_at: now, updated_at: now });
    }
    s.phases = s.phases.map(p => ({ ...p, expense_plan_id: plan.id, expense_overrides: Object.fromEntries(Object.entries(p.expense_overrides).flatMap(([id, a]) => {
      const nextId = ids.get(id); if (!nextId) return [];
      const expense = s.baseline.expenses.find(e => e.id === id)!;
      const factor = s.lifestyle !== "NORMAL" && ["FLEXIBLE", "DISCRETIONARY"].includes(expense.classification) ? s.flexible_multiplier : 1;
      return [[nextId, { ...a, amount: round(a.amount * factor) }]];
    })) }));
    workspace.library.plans.push(plan);
    workspace.scenarios.push({ ...s, version: 2, expense_plan_id: plan.id, lifestyle: "NORMAL", flexible_multiplier: 1, status: "DRAFT" });
  }
  assertWorkspaceShape(workspace);
  return workspace;
}
function record(x: unknown): x is Record<string, unknown> { return !!x && typeof x === "object" && !Array.isArray(x); }
function requireShape(ok: unknown): asserts ok { if (!ok) throw new Error("Planning data is invalid or damaged."); }
function monetary(x: unknown) { return record(x) && Number.isFinite(x.amount) && ["MYR", "SGD"].includes(String(x.currency)) && expenseSourceTypes.includes(x.source_type as typeof expenseSourceTypes[number]); }
export function assertWorkspaceShape(value: unknown): asserts value is PlanningWorkspace {
  requireShape(record(value) && value.version === 2 && Array.isArray(value.scenarios) && record(value.library));
  const library = value.library;
  requireShape(Array.isArray(library.plans) && Array.isArray(library.types) && Array.isArray(library.categories) && Array.isArray(library.mappings));
  for (const t of library.types) requireShape(record(t) && typeof t.id === "string" && typeof t.name === "string" && typeof t.description === "string" && Number.isFinite(t.sort_order) && typeof t.is_active === "boolean" && ["MANDATORY", "REDUCIBLE", "OPTIONAL", "COMMITMENT"].includes(String(t.behavior_tag)));
  for (const c of library.categories) requireShape(record(c) && typeof c.id === "string" && typeof c.type_id === "string" && typeof c.name === "string" && typeof c.description === "string" && Number.isFinite(c.sort_order) && typeof c.is_active === "boolean");
  for (const m of library.mappings) requireShape(record(m) && typeof m.source_category_id === "string" && typeof m.future_type_id === "string" && typeof m.future_category_id === "string");
  for (const p of library.plans) {
    requireShape(record(p) && typeof p.id === "string" && typeof p.name === "string" && typeof p.description === "string" && ["MYR", "SGD"].includes(String(p.currency)) && Array.isArray(p.items) && typeof p.confirmed === "boolean");
    for (const i of p.items) requireShape(record(i) && monetary(i) && typeof i.id === "string" && i.plan_id === p.id && typeof i.name === "string" && typeof i.note === "string" && typeof i.enabled === "boolean" && typeof i.is_fixed === "boolean" && (i.type_id === null || typeof i.type_id === "string") && (i.category_id === null || typeof i.category_id === "string"));
  }
  for (const s of value.scenarios) {
    requireShape(record(s) && s.version === 2 && typeof s.id === "string" && typeof s.expense_plan_id === "string" && typeof s.name === "string" && typeof s.description === "string" && typeof s.start_date === "string" && typeof s.projection_end_date === "string" && record(s.baseline) && Array.isArray(s.phases) && Array.isArray(s.events) && record(s.fx));
    const b = s.baseline;
    requireShape(monetary(b.income) && monetary(b.liquid_assets) && monetary(b.savings_pace) && typeof b.as_of === "string" && Array.isArray(b.expenses) && Array.isArray(b.repayments) && Array.isArray(b.asset_candidates) && Array.isArray(b.completed_months) && Array.isArray(b.historical_assets));
    requireShape([s.minimum_reserve, s.inflation_rate, s.yield_rate, s.yield_eligible_balance, s.flexible_multiplier, b.actual_current_income, b.actual_current_expenses].every(Number.isFinite));
    for (const e of [...b.expenses, ...b.repayments, ...s.events]) requireShape(monetary(e));
    for (const p of s.phases) {
      requireShape(record(p) && typeof p.id === "string" && typeof p.name === "string" && typeof p.start_date === "string" && typeof p.end_date === "string" && typeof p.expense_plan_id === "string" && record(p.expense_overrides) && (p.incomes === null || Array.isArray(p.incomes)));
      for (const a of [...(p.incomes || []), ...Object.values(p.expense_overrides)]) requireShape(monetary(a));
    }
  }
  const typed = value as unknown as PlanningWorkspace;
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  requireShape(unique(typed.library.types.map(x => x.id)) && unique(typed.library.categories.map(x => x.id)) && unique(typed.library.plans.map(x => x.id)) && unique(typed.library.plans.flatMap(x => x.items.map(i => i.id))));
  requireShape(typed.library.categories.every(c => typed.library.types.some(t => t.id === c.type_id)));
  for (const p of typed.library.plans) if (p.confirmed) requireShape(validateExpensePlan(p, typed.library).length === 0);
}
