import type { Assumption, LifeScenario, LifeScenarioPhase, ProjectionMonth, ScenarioBaseline } from "../types/lifeScenario";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { Asset } from "../types/asset";
import type { Category } from "../types/category";
import type { PaymentPlan } from "../types/paymentPlan";
import type { RecurringExpense } from "../types/recurringExpense";
import type { Currency } from "../types/currency";
import type { ExpenseCalendarEntry, FutureExpenseLibrary } from "../types/futureExpense";
import { buildExpenseCalendar, emptyExpenseLibrary, expensePlanSummary, itemIsEnabled, validateExpensePlan } from "./futureExpense";
import { addMonths, dateKey, nextDay, round, uid, validDate } from "./scenarioMath";
export { addMonths, dateKey, nextDay, round, uid, validDate } from "./scenarioMath";

export const assumption = (amount: number, currency: Currency, source_type: Assumption["source_type"] = "USER_OVERRIDE"): Assumption => ({ amount: round(amount), currency, source_type });

export function buildBaseline(input: { currency: Currency; today: string; expenses: Expense[]; incomes: Income[]; assets: Asset[]; categories: Category[]; recurring: RecurringExpense[]; plans: PaymentPlan[] }): ScenarioBaseline {
  const { currency, today } = input; const current = today.slice(0, 7);
  const expenses = input.expenses.filter(x => (x.currency || "MYR") === currency);
  const incomes = input.incomes.filter(x => (x.currency || "MYR") === currency);
  const dates = [...expenses.map(x => x.expense_date), ...incomes.map(x => x.income_date)].filter(x => validDate(x) && x.slice(0, 7) < current).sort();
  const months: string[] = [];
  if (dates.length) {
    const first = dates[0].slice(0, 7) + "-01";
    const start = first > addMonths(current + "-01", -6) ? first : addMonths(current + "-01", -6);
    for (let d = start; d < current + "-01"; d = addMonths(d, 1)) months.push(d.slice(0, 7));
  }
  const historical = expenses.filter(x => months.includes(x.expense_date.slice(0, 7)));
  const income = incomes.filter(x => months.includes(x.income_date.slice(0, 7))).reduce((s, x) => s + Number(x.amount), 0) / (months.length || 1);
  const totals = new Map<number, number>();
  for (const e of historical) if (!e.payment_installment_id && !e.recurring_expense_id) totals.set(e.category_id, (totals.get(e.category_id) || 0) + Number(e.amount));
  const recurring = input.recurring.filter(x => x.is_active && (x.currency || "MYR") === currency);
  const candidates = input.assets.filter(x => (x.currency || "MYR") === currency).map(x => ({ id: x.id, name: x.name, amount: Number(x.current_value), included: false }));
  return {
    as_of: today, income: assumption(income, currency, months.length ? "HISTORICAL" : "ESTIMATED"), liquid_assets: assumption(0, currency, "ESTIMATED"), asset_candidates: candidates,
    savings_pace: assumption(income - historical.reduce((s, x) => s + Number(x.amount), 0) / (months.length || 1), currency, months.length ? "HISTORICAL" : "ESTIMATED"),
    expenses: [...Array.from(totals, ([id, amount]) => ({ ...assumption(amount / months.length, currency, "HISTORICAL"), id: `category-${id}`, source_reference_id: `historical:${currency}:${id}`, source_category_id: String(id), source_category_name: input.categories.find(x => x.id === id)?.name, name: input.categories.find(x => x.id === id)?.name || `Category ${id}`, classification: "FLEXIBLE" as const, enabled: true })),
      ...recurring.map(x => ({ ...assumption(Number(x.amount), currency, "RECURRING"), id: `recurring-${x.id}`, source_reference_id: `recurring:${x.id}`, source_category_id: x.category_id == null ? undefined : String(x.category_id), source_category_name: input.categories.find(c => c.id === x.category_id)?.name, name: x.name, classification: "COMMITMENT" as const, enabled: true, repeat_day: x.repeat_day }))],
    repayments: input.plans.filter(x => x.currency === currency).flatMap(p => p.payment_installments.filter(x => x.status === "scheduled").map(x => ({ ...assumption(Number(x.amount), currency, "EXISTING_COMMITMENT"), id: String(x.id), name: p.name, date: x.due_date < today ? today : x.due_date }))),
    completed_months: months, actual_current_income: incomes.filter(x => x.income_date.slice(0, 7) === current && x.income_date <= today).reduce((s, x) => s + Number(x.amount), 0),
    actual_current_expenses: expenses.filter(x => x.expense_date.slice(0, 7) === current && x.expense_date <= today).reduce((s, x) => s + Number(x.amount), 0), historical_assets: [], reviewed: false,
  };
}
export function createScenario(baseline: ScenarioBaseline): LifeScenario {
  const now = new Date().toISOString();
  return { version: 2, expense_plan_id: "", id: uid(), name: "My life plan", description: "", start_date: baseline.as_of, projection_end_date: nextDay(addMonths(baseline.as_of.slice(0, 7) + "-01", 18), -1), currency: baseline.income.currency, minimum_reserve: 0, inflation_enabled: false, inflation_rate: 0, yield_enabled: false, yield_rate: 0, yield_eligible_balance: 0, lifestyle: "NORMAL", flexible_multiplier: 1, fx: { MYR: baseline.income.currency === "MYR" ? 1 : 0, SGD: baseline.income.currency === "SGD" ? 1 : 0 }, status: "DRAFT", baseline: structuredClone(baseline), phases: [], events: [], created_at: now, updated_at: now };
}
export function makePhase(s: LifeScenario, name: string, start: string, end: string): LifeScenarioPhase {
  const now = new Date().toISOString();
  return { id: uid(), scenario_id: s.id, name, start_date: start, end_date: end, incomes: ["Unemployed", "Career Break", "Travel", "Job Search"].includes(name) ? [] : null, expense_plan_id: s.expense_plan_id, expense_overrides: {}, location_label: "", note: "", created_at: now, updated_at: now };
}
export function validateScenario(s: LifeScenario, library: FutureExpenseLibrary = emptyExpenseLibrary()): string[] {
  const errors: string[] = [];
  if (!s.name.trim()) errors.push("Enter a scenario name.");
  if (!validDate(s.start_date) || !validDate(s.projection_end_date) || s.projection_end_date < s.start_date) errors.push("Choose a valid projection date range.");
  if (s.start_date < s.baseline.as_of) errors.push("The projection cannot begin before the asset baseline date.");
  if (s.projection_end_date > addMonths(s.start_date, 600)) errors.push("Limit projections to 50 years.");
  if (![s.minimum_reserve, s.yield_eligible_balance].every(x => Number.isFinite(x) && x >= 0)) errors.push("Reserve and eligible balance must be non-negative numbers.");
  if (![s.inflation_rate, s.yield_rate].every(x => Number.isFinite(x) && x > -100 && x <= 100)) errors.push("Annual rates must be above -100% and at most 100%.");
  if (!Number.isFinite(s.flexible_multiplier) || s.flexible_multiplier < 0 || s.flexible_multiplier > 5 || (s.lifestyle === "LEAN" && s.flexible_multiplier > 1) || (s.lifestyle === "COMFORTABLE" && s.flexible_multiplier < 1)) errors.push("Use a spending multiplier of 0–1 for Lean or 1–5 for Comfortable.");
  const planIds = new Set([s.expense_plan_id, ...s.phases.map(p => p.expense_plan_id)]);
  const plans = library.plans.filter(p => planIds.has(p.id));
  for (const id of planIds) {
    const plan = plans.find(p => p.id === id);
    if (!plan) errors.push("Select a future expense plan for the scenario and every phase.");
    else { if (!plan.confirmed) errors.push(`Review and confirm expense plan: ${plan.name}.`); errors.push(...validateExpensePlan(plan, library)); }
  }
  const livingValues = plans.flatMap(p => p.items.filter(i => itemIsEnabled(i, library)));
  const values = [s.baseline.income, s.baseline.liquid_assets, s.baseline.savings_pace, ...livingValues, ...s.baseline.repayments, ...s.events, ...s.phases.flatMap(p => [...(p.incomes || []), ...Object.values(p.expense_overrides).filter(x => x.enabled)])];
  for (const x of values) {
    if (!Number.isFinite(x.amount) || Math.abs(x.amount) > 1e12) { errors.push("Assumption amounts must be finite and within one trillion."); break; }
    if (x.currency !== s.currency && (!Number.isFinite(s.fx[x.currency]) || s.fx[x.currency] <= 0)) { errors.push(`Enter a positive ${x.currency} exchange rate in ${s.currency}.`); break; }
  }
  if ([s.baseline.income, ...livingValues, ...s.baseline.repayments, ...s.events, ...s.phases.flatMap(p => [...(p.incomes || []), ...Object.values(p.expense_overrides)])].some(x => x.amount < 0)) errors.push("Income and cost amounts must be non-negative; choose the event direction separately.");
  if (s.baseline.repayments.some(p => !validDate(p.date))) errors.push("Enter valid repayment dates.");
  const phases = [...s.phases].sort((a, b) => a.start_date.localeCompare(b.start_date));
  phases.forEach((p, i) => {
    const plan = plans.find(x => x.id === p.expense_plan_id);
    if (Object.keys(p.expense_overrides).some(id => !plan?.items.some(item => item.id === id))) errors.push(`${p.name}: remove overrides for items no longer in the selected plan.`);
    if (!validDate(p.start_date) || !validDate(p.end_date) || p.end_date < p.start_date || p.start_date < s.start_date || p.end_date > s.projection_end_date) errors.push(`Check dates for ${p.name} within the projection.`);
    if (i && p.start_date <= phases[i - 1].end_date) errors.push("Phases must be sequential and cannot overlap.");
    if (p.incomes?.some(x => (x.first_payment_date && !validDate(x.first_payment_date)) || (x.payment_day !== undefined && (!Number.isInteger(x.payment_day) || x.payment_day < 1 || x.payment_day > 31)))) errors.push(`Check payment dates for ${p.name}.`);
  });
  for (const e of s.events) {
    if (!validDate(e.date) || e.date < s.start_date || e.date > s.projection_end_date) errors.push("Event dates must fall within the projection.");
    const p = s.phases.find(p => p.id === e.phase_id);
    if (e.phase_id && (!p || e.date < p.start_date || e.date > p.end_date)) errors.push("A linked event must fall within its phase.");
  }
  return [...new Set(errors)];
}
export const convert = (a: Assumption, s: LifeScenario) => a.amount * (a.currency === s.currency ? 1 : s.fx[a.currency]);

/** Future outflows arrive from the expense calendar, never from historical averages. */
export function incomeForDay(s: LifeScenario, date: string, days: number) {
  const phase = s.phases.find(p => p.start_date <= date && p.end_date >= date);
  const incomes = phase?.incomes ?? [{ ...s.baseline.income, id: "baseline", kind: "salary" as const }];
  let amount = 0;
  for (const income of incomes) {
    if (income.first_payment_date && date < income.first_payment_date) continue;
    const payDay = income.payment_day ?? (income.first_payment_date ? Number(income.first_payment_date.slice(8)) : undefined);
    if (payDay === undefined) amount += convert(income, s) / days;
    else if (Number(date.slice(8)) === Math.min(payDay, days)) amount += convert(income, s);
  }
  return amount;
}
export function simulate(s: LifeScenario, opening = convert(s.baseline.liquid_assets, s), library: FutureExpenseLibrary = emptyExpenseLibrary()): ProjectionMonth[] {
  if (validateScenario(s, library).length) return [];
  return simulateCalendar(s, opening, buildExpenseCalendar(s, library));
}
function simulateCalendar(s: LifeScenario, opening: number, calendar: ExpenseCalendarEntry[]): ProjectionMonth[] {
  const rows: ProjectionMonth[] = []; let balance = opening;
  for (let month = s.start_date.slice(0, 7) + "-01"; month <= s.projection_end_date; month = addMonths(month, 1)) {
    const end = nextDay(addMonths(month, 1), -1), days = Number(end.slice(8));
    const from = month < s.start_date ? s.start_date : month, to = end > s.projection_end_date ? s.projection_end_date : end;
    const r: ProjectionMonth = { month: month.slice(0, 7), status: "PROJECTED", opening_balance: balance, income: 0, essential_expenses: 0, flexible_expenses: 0, discretionary_expenses: 0, liability_payments: 0, recurring_commitments: 0, one_time_events: 0, one_time_income: 0, investment_or_cash_yield: 0, inflation_effect: 0, total_outflow: 0, net_cashflow: 0, closing_balance: 0, living_cost: 0, fixed_commitments: 0, by_type: {}, by_category: {} };
    for (let day = Number(from.slice(8)); day <= Number(to.slice(8)); day++) r.income += incomeForDay(s, r.month + "-" + String(day).padStart(2, "0"), days);
    for (const entry of calendar.filter(e => e.date >= from && e.date <= to)) {
      if (entry.kind === "LIABILITY") r.liability_payments += entry.amount;
      else if (entry.kind === "ONE_TIME") r.one_time_events += entry.amount;
      else {
        r.living_cost += entry.amount;
        const key = { MANDATORY: "essential_expenses", REDUCIBLE: "flexible_expenses", OPTIONAL: "discretionary_expenses", COMMITMENT: "recurring_commitments" } as const;
        r[key[entry.behavior_tag!]] += entry.amount;
        r.by_type[entry.type_id!] = (r.by_type[entry.type_id!] || 0) + entry.amount;
        r.by_category[entry.category_id!] = (r.by_category[entry.category_id!] || 0) + entry.amount;
      }
      if (entry.is_fixed) r.fixed_commitments += entry.amount;
      r.inflation_effect += entry.inflation_effect;
    }
    for (const event of s.events.filter(e => e.direction === "income" && e.date >= from && e.date <= to)) { r.income += convert(event, s); r.one_time_income += convert(event, s); }
    const fraction = (Number(to.slice(8)) - Number(from.slice(8)) + 1) / days;
    r.investment_or_cash_yield = s.yield_enabled ? Math.min(Math.max(0, balance), s.yield_eligible_balance) * (Math.pow(1 + s.yield_rate / 100, fraction / 12) - 1) : 0;
    for (const key of ["income", "essential_expenses", "flexible_expenses", "discretionary_expenses", "recurring_commitments", "liability_payments", "one_time_events", "one_time_income", "investment_or_cash_yield", "inflation_effect", "living_cost", "fixed_commitments"] as const) r[key] = round(r[key]);
    r.living_cost = round(r.essential_expenses + r.flexible_expenses + r.discretionary_expenses + r.recurring_commitments);
    r.total_outflow = round(r.living_cost + r.liability_payments + r.one_time_events);
    r.net_cashflow = round(r.income + r.investment_or_cash_yield - r.total_outflow);
    balance = r.closing_balance = round(balance + r.net_cashflow); rows.push(r);
  }
  return rows;
}
export function phaseSpending(s: LifeScenario, library: FutureExpenseLibrary, calendar: ExpenseCalendarEntry[]) {
  return s.phases.map(phase => {
    const entries = calendar.filter(e => e.phase_id === phase.id);
    const sum = (kind: ExpenseCalendarEntry["kind"]) => round(entries.filter(e => e.kind === kind).reduce((sum, e) => sum + e.amount, 0));
    let income = 0;
    for (let date = phase.start_date; date <= phase.end_date; date = nextDay(date)) {
      const end = nextDay(addMonths(date.slice(0, 7) + "-01", 1), -1);
      income += incomeForDay(s, date, Number(end.slice(8)));
    }
    income = round(income + s.events.filter(e => e.direction === "income" && e.date >= phase.start_date && e.date <= phase.end_date).reduce((sum, e) => sum + convert(e, s), 0));
    const plan = library.plans.find(p => p.id === phase.expense_plan_id)!;
    const living = sum("LIVING"), liabilities = sum("LIABILITY"), oneTime = sum("ONE_TIME");
    return { id: phase.id, name: phase.name, days: Math.round((Date.parse(phase.end_date) - Date.parse(phase.start_date)) / 86400000) + 1, planName: plan.name, monthlyLiving: expensePlanSummary(plan, library, s.currency, s.fx, phase.expense_overrides).total, living, liabilities, oneTime, total: round(living + liabilities + oneTime), income, net: round(income - living - liabilities - oneTime) };
  });
}
export function analyzeScenario(s: LifeScenario, library: FutureExpenseLibrary = emptyExpenseLibrary(), today = dateKey()) {
  if (validateScenario(s, library).length) return null;
  const calendar = buildExpenseCalendar(s, library);
  const rows = simulateCalendar(s, convert(s.baseline.liquid_assets, s), calendar); if (!rows.length) return null;
  const starting = rows[0].opening_balance;
  let lowest = starting, lowestDate = s.start_date;
  for (const row of rows) if (row.closing_balance < lowest) { lowest = row.closing_balance; lowestDate = row.month; }
  // Monotone reverse simulation also accounts for yield on eligible balances.
  const safe = (fund: number) => fund >= s.minimum_reserve && simulateCalendar(s, fund, calendar).every(r => r.closing_balance >= s.minimum_reserve);
  let low = 0, high = Math.max(s.minimum_reserve, s.minimum_reserve + starting - lowest, 1);
  while (!safe(high) && high < 1e15) high *= 2;
  low = 0; high = Math.ceil(high * 100);
  for (let i = 0; i < 100 && low < high; i++) { const mid = Math.floor((low + high) / 2); if (mid === high) break; if (safe(mid / 100)) high = mid; else { if (mid + 1 === low) break; low = mid + 1; } }
  const required = high / 100; const gap = Math.max(0, round(required - starting));
  const pace = convert(s.baseline.savings_pace, s);
  const readyMonths = pace > 0 ? Math.ceil(gap / pace) : null;
  const readyDate = !gap ? today : readyMonths !== null && readyMonths <= 1200 ? addMonths(today, readyMonths).slice(0, 7) : null;
  const sum = (key: keyof ProjectionMonth) => round(rows.reduce((sum, row) => sum + Number(row[key]), 0));
  return { rows, calendar, phases: phaseSpending(s, library, calendar), monthlyLiving: expensePlanSummary(library.plans.find(p => p.id === s.expense_plan_id)!, library, s.currency, s.fx).total, totalFixed: sum("fixed_commitments"), averageSpending: round(sum("total_outflow") / rows.length), starting, ending: rows.at(-1)!.closing_balance, lowest, lowestDate, reserve: s.minimum_reserve, buffer: round(lowest - s.minimum_reserve), required, gap, surplus: Math.max(0, round(starting - required)), pace, readyDate, totalIncome: sum("income"), totalSpending: sum("total_outflow"), totalLiabilities: sum("liability_payments"), totalOneTime: sum("one_time_events"), monthsWithoutIncome: rows.filter(r => r.income === 0).length, firstBelowReserve: rows.find(r => r.closing_balance < s.minimum_reserve)?.month || null, firstZero: rows.find(r => r.closing_balance <= 0)?.month || null };
}
export function duplicateScenario(s: LifeScenario): LifeScenario {
  const copy = structuredClone(s); copy.id = uid(); copy.name += " (Copy)"; copy.status = "DRAFT"; delete copy.linked_goal_id;
  copy.created_at = copy.updated_at = new Date().toISOString();
  const ids = new Map(copy.phases.map(p => [p.id, uid()]));
  copy.phases = copy.phases.map(p => ({ ...p, id: ids.get(p.id)!, scenario_id: copy.id }));
  copy.events = copy.events.map(e => ({ ...e, id: uid(), scenario_id: copy.id, phase_id: e.phase_id ? ids.get(e.phase_id) : undefined }));
  return copy;
}
/** Runway is the same scenario engine with income switched off. */
export function runwayScenario(s: LifeScenario): LifeScenario {
  return { ...s, phases: [{ ...makePhase(s, "No income", s.start_date, s.projection_end_date), incomes: [] }], events: s.events.filter(e => e.direction === "expense") };
}
