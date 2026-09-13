import type { LifeScenario } from "../types/lifeScenario";
import type { FutureExpenseLibrary } from "../types/futureExpense";
import { emptyExpenseLibrary } from "./futureExpense";
import { addMonths, assumption, duplicateScenario, makePhase, nextDay, simulate, uid, validDate } from "./lifeScenario";

export interface JobTransition {
  last_working_day: string;
  final_salary_date: string;
  final_salary: number;
  new_job_start: string;
  first_salary_date: string;
  new_salary: number;
  relocation_cost: number;
  travel_cost: number;
  new_rent: number | null;
  new_transport: number | null;
  rent_item_id?: string;
  transport_item_id?: string;
}
export function applyTransition(s: LifeScenario, t: JobTransition, library: FutureExpenseLibrary = emptyExpenseLibrary()): LifeScenario {
  if (![t.last_working_day, t.final_salary_date, ...(t.new_job_start ? [t.new_job_start, t.first_salary_date] : [])].every(validDate)) throw new Error("Enter valid working and salary dates.");
  if (t.last_working_day < s.start_date || t.last_working_day > s.projection_end_date || t.final_salary_date < t.last_working_day || (t.new_job_start && (t.new_job_start <= t.last_working_day || t.first_salary_date < t.new_job_start))) throw new Error("Check the transition dates: final salary follows the last working day; first salary follows the new job start.");
  const next = structuredClone(s); next.phases = [];
  // Final month salary is an explicit event to avoid counting it twice.
  const finalMonth = t.last_working_day.slice(0, 7) + "-01";
  if (s.start_date < finalMonth) next.phases.push(makePhase(next, "Current Job", s.start_date, nextDay(finalMonth, -1)));
  next.phases.push({ ...makePhase(next, "Final working month", finalMonth < s.start_date ? s.start_date : finalMonth, t.last_working_day), incomes: [] });
  const gapStart = nextDay(t.last_working_day);
  const gapEnd = t.new_job_start ? nextDay(t.new_job_start, -1) : s.projection_end_date;
  if (gapStart <= gapEnd) next.phases.push(makePhase(next, "Career Break", gapStart, gapEnd));
  if (t.new_job_start) {
    const phase = makePhase(next, "New Job", t.new_job_start, s.projection_end_date);
    phase.incomes = [{ ...assumption(t.new_salary, s.currency), id: uid(), kind: "salary", first_payment_date: t.first_salary_date, payment_day: Number(t.first_salary_date.slice(8)) }];
    for (const [id, amount, label] of [[t.rent_item_id, t.new_rent, "rent"], [t.transport_item_id, t.new_transport, "transport"]] as const) if (amount !== null) {
      const expense = library.plans.find(p => p.id === phase.expense_plan_id)?.items.find(i => i.id === id);
      if (!expense) throw new Error(`Choose a ${label} expense item from the selected living plan, or leave its new amount blank.`);
      phase.expense_overrides[expense.id] = { ...assumption(amount, s.currency), enabled: true };
    }
    next.phases.push(phase);
  }
  next.events = next.events.filter(e => e.generated_by !== "JOB_TRANSITION").map(e => ({ ...e, phase_id: undefined }));
  const event = (description: string, date: string, amount: number, type: LifeScenario["events"][number]["type"], direction: "income" | "expense") => { if (amount) next.events.push({ ...assumption(amount, s.currency), generated_by: "JOB_TRANSITION", id: uid(), scenario_id: s.id, date, description, type, direction }); };
  event("Final salary", t.final_salary_date, t.final_salary, "ONE_TIME_INCOME", "income");
  event("Planned travel", gapStart, t.travel_cost, "TRAVEL_COST", "expense");
  if (t.new_job_start) event("Relocation", t.new_job_start, t.relocation_cost, "RELOCATION_COST", "expense");
  return next;
}
export function employmentVariants(s: LifeScenario, t: JobTransition, library: FutureExpenseLibrary = emptyExpenseLibrary()) {
  return [3, 6, 12].map(months => {
    const copy = duplicateScenario(s); copy.name = `${s.name} · job after ${months} months`;
    const start = addMonths(nextDay(t.last_working_day), months);
    return applyTransition(copy, { ...t, new_job_start: start, first_salary_date: start }, library);
  });
}
export function latestAffordableStart(s: LifeScenario, library: FutureExpenseLibrary = emptyExpenseLibrary()): string | null {
  const job = s.phases.find(p => p.name === "New Job" && p.incomes?.some(i => i.amount > 0));
  if (!job) return null;
  const gap = s.phases.find(p => p.end_date === nextDay(job.start_date, -1) && p.incomes?.length === 0 && p.name !== "Final working month");
  if (s.baseline.liquid_assets.amount * (s.baseline.liquid_assets.currency === s.currency ? 1 : s.fx[s.baseline.liquid_assets.currency]) < s.minimum_reserve) return null;
  const salaryLag = job.incomes?.[0]?.first_payment_date ? Math.round((Date.parse(job.incomes[0].first_payment_date) - Date.parse(job.start_date)) / 86400000) : 0;
  let latest: string | null = null;
  const first = gap?.start_date || job.start_date;
  for (let start = first; start <= s.projection_end_date; start = addMonths(start, 1)) {
    const candidate = structuredClone(s);
    candidate.events = candidate.events.map(e => e.generated_by === "JOB_TRANSITION" && e.type === "RELOCATION_COST" ? { ...e, date: start } : e);
    candidate.phases = candidate.phases.filter(p => p.id !== gap?.id).map(p => p.id === job.id ? { ...p, start_date: start, incomes: p.incomes?.map(i => ({ ...i, first_payment_date: nextDay(start, salaryLag), payment_day: Number(nextDay(start, salaryLag).slice(8)) })) || [] } : p);
    if (start > first) candidate.phases.push({ ...(gap || makePhase(candidate, "Career Break", first, nextDay(start, -1))), start_date: first, end_date: nextDay(start, -1), incomes: [] });
    const rows = simulate(candidate, undefined, library);
    if (rows.length && rows.every(r => r.closing_balance >= s.minimum_reserve)) latest = start;
  }
  return latest;
}
