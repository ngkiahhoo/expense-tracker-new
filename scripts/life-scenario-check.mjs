import assert from 'node:assert/strict';
import { moduleURL } from './load-typescript.mjs';
const engine = await import(moduleURL('src/utils/lifeScenario.ts'));
const transitions = await import(moduleURL('src/utils/scenarioTransition.ts'));
const plans = await import(moduleURL('src/utils/futureExpense.ts'));
const { assumption, buildBaseline, createScenario, makePhase, duplicateScenario, runwayScenario, addMonths } = engine;
let library;
const simulate = (s, opening) => engine.simulate(s, opening, library);
const analyzeScenario = (s, today) => engine.analyzeScenario(s, library, today);
const validateScenario = s => engine.validateScenario(s, library);
const applyTransition = (s, t) => transitions.applyTransition(s, t, library);
const employmentVariants = (s, t) => transitions.employmentVariants(s, t, library);
const latestAffordableStart = s => transitions.latestAffordableStart(s, library);
const livingPlan = s => library.plans.find(p => p.id === s.expense_plan_id);
const a = (amount, currency = 'MYR') => assumption(amount, currency);
const expense = (amount, classification = 'ESSENTIAL', extra = {}) => {
  const behavior = { ESSENTIAL: 'MANDATORY', FLEXIBLE: 'REDUCIBLE', DISCRETIONARY: 'OPTIONAL', COMMITMENT: 'COMMITMENT' }[classification];
  const type = library.types.find(t => t.behavior_tag === behavior), category = library.categories.find(c => c.type_id === type.id);
  return { ...plans.newExpenseItem(library.plans[0]), ...a(amount), type_id: type.id, category_id: category.id, is_fixed: !!extra.repeat_day, ...extra };
};
function plan() {
  const b = buildBaseline({ currency: 'MYR', today: '2026-01-01', expenses: [], incomes: [], assets: [], categories: [], recurring: [], plans: [] });
  b.liquid_assets = a(20000); b.income = a(0); b.savings_pace = a(2500); b.reviewed = true;
  library = plans.emptyExpenseLibrary();
  for (const behavior of plans.behaviors) { const type = plans.newExpenseType(behavior, behavior); library.types.push(type); library.categories.push(plans.newExpenseCategory(type.id, behavior)); }
  const living = plans.newExpensePlan('MYR'); living.confirmed = true; library.plans.push(living);
  return { ...createScenario(b), expense_plan_id: living.id, projection_end_date: '2026-06-30', minimum_reserve: 10000 };
}
let count = 0;
function test(name, fn) { fn(); count++; console.log(`PASS ${name}`); }
test('completed months only; missing months count as zero; no recurring/debt double count', () => {
  const b = buildBaseline({ currency: 'MYR', today: '2026-04-15', expenses: [
    { amount: 300, expense_date: '2026-01-12', category_id: 1 },
    { amount: 600, expense_date: '2026-03-12', category_id: 1 },
    { amount: 99999, expense_date: '2026-04-12', category_id: 1 },
    { amount: 100, expense_date: '2026-03-12', category_id: 1, recurring_expense_id: 1 },
    { amount: 200, expense_date: '2026-03-12', category_id: 1, payment_installment_id: 1 },
  ], incomes: [{ amount: 6000, income_date: '2026-03-01' }, { amount: 99999, income_date: '2026-04-01' }], assets: [{ id: 1, name: 'Home', current_value: 500000 }], categories: [], recurring: [{ id: 1, name: 'Phone', amount: 100, is_active: true, repeat_day: 5 }], plans: [] });
  assert.deepEqual(b.completed_months, ['2026-01', '2026-02', '2026-03']);
  assert.equal(b.income.amount, 2000); assert.equal(b.expenses[0].amount, 300); assert.equal(b.expenses[1].amount, 100); assert.equal(b.savings_pace.amount, 1600);
  assert.equal(b.actual_current_income, 99999); assert.equal(b.liquid_assets.amount, 0); assert.equal(b.asset_candidates[0].included, false);
});
test('zero history and one completed month remain finite', () => {
  const s = plan(); assert.equal(analyzeScenario(s).required, 10000);
  const b = buildBaseline({ currency: 'MYR', today: '2026-02-02', expenses: [], incomes: [{ amount: 1000, income_date: '2026-01-31' }], assets: [], categories: [], recurring: [], plans: [] });
  assert.equal(b.income.amount, 1000); assert.equal(b.completed_months.length, 1);
});
test('sequential simulation, low point, required fund and ready date', () => {
  const s = plan(); livingPlan(s).items = [expense(2000)];
  const r = analyzeScenario(s, '2026-01-01');
  assert.equal(r.ending, 8000); assert.equal(r.lowestDate, '2026-06'); assert.equal(r.buffer, -2000);
  assert.equal(r.required, 22000); assert.equal(r.gap, 2000); assert.equal(r.readyDate, '2026-02');
  r.rows.slice(1).forEach((row, i) => assert.equal(row.opening_balance, r.rows[i].closing_balance));
});
test('instalments end; cancelled and posted schedules excluded', () => {
  const s = plan(); s.baseline.repayments = [{ ...a(300), id: '1', name: 'Phone', date: '2026-01-15' }, { ...a(300), id: '2', name: 'Phone', date: '2026-02-15' }];
  assert.deepEqual(simulate(s).map(x => x.liability_payments), [300, 300, 0, 0, 0, 0]);
  const b = buildBaseline({ currency: 'MYR', today: '2026-01-01', expenses: [], incomes: [], assets: [], categories: [], recurring: [], plans: [{ name: 'Phone', currency: 'MYR', payment_installments: ['posted', 'cancelled', 'reversed', 'scheduled'].map((status, id) => ({ id, amount: 300, status, due_date: '2026-02-01' })) }] });
  assert.equal(b.repayments.length, 1);
});
test('phase income and expense overrides only apply in phase', () => {
  const s = plan(); const e = expense(1000); livingPlan(s).items = [e]; s.baseline.income = a(5000);
  const phase = makePhase(s, 'Career Break', '2026-02-01', '2026-03-31'); phase.expense_overrides[e.id] = { ...a(500), enabled: true }; s.phases = [phase];
  assert.deepEqual(simulate(s).map(x => x.income), [5000, 0, 0, 5000, 5000, 5000]);
  assert.deepEqual(simulate(s).map(x => x.essential_expenses), [1000, 500, 500, 1000, 1000, 1000]);
});
test('one-time events and foreign currency retain original assumptions', () => {
  const s = plan(); s.fx.SGD = 3.2; s.events = [{ ...a(1000, 'SGD'), id: '1', scenario_id: s.id, date: '2026-02-01', type: 'TRAVEL_COST', direction: 'expense', description: 'Travel' }, { ...a(500), id: '2', scenario_id: s.id, date: '2026-03-01', type: 'REFUND', direction: 'income', description: 'Refund' }];
  assert.equal(simulate(s)[1].one_time_events, 3200); assert.equal(simulate(s)[2].income, 500); assert.equal(s.events[0].amount, 1000);
  s.fx.SGD = 3.4; assert.equal(simulate(s)[1].one_time_events, 3400);
  s.fx.SGD = 0; assert.equal(simulate(s).length, 0);
});
test('partial current month does not replay actual cashflows', () => {
  const s = plan(); s.start_date = '2026-01-16'; s.baseline.income = a(3100); s.baseline.actual_current_income = 9000;
  livingPlan(s).items = [expense(310), expense(50, 'COMMITMENT', { repeat_day: 5 }), expense(70, 'COMMITMENT', { repeat_day: 31 })];
  const r = simulate(s)[0]; assert.equal(r.income, 1600); assert.equal(r.essential_expenses, 160); assert.equal(r.recurring_commitments, 70);
});
test('midmonth phase boundary and month-end salary clamping', () => {
  const s = plan(); s.baseline.income = a(3100); s.phases = [makePhase(s, 'Career Break', '2026-01-16', '2026-01-31')];
  assert.equal(simulate(s)[0].income, 1500);
  s.phases = [{ ...makePhase(s, 'New Job', '2026-02-01', '2026-06-30'), incomes: [{ ...a(5000), id: 'income', kind: 'salary', first_payment_date: '2026-03-31', payment_day: 31 }] }];
  assert.deepEqual(simulate(s).map(x => x.income), [3100, 0, 5000, 5000, 5000, 5000]);
});
test('inflation monthly compounding excludes recurring, debt and events', () => {
  const s = plan(); s.inflation_enabled = true; s.inflation_rate = 12;
  livingPlan(s).items = [expense(1000), expense(100, 'FLEXIBLE', { repeat_day: 1 })];
  const r = simulate(s); assert.equal(r[0].essential_expenses, 1000); assert.equal(r[1].essential_expenses, 1009.49); assert.equal(r[1].flexible_expenses, 100);
});
test('lean never reduces mandatory commitments or essential expenses', () => {
  const s = plan();
  livingPlan(s).items = ['ESSENTIAL', 'FLEXIBLE', 'DISCRETIONARY', 'COMMITMENT'].map(c => expense(100, c));
  const copy = plans.duplicateExpensePlan(livingPlan(s), library, 0.5); copy.confirmed = true; library.plans.push(copy); s.expense_plan_id = copy.id;
  const r = simulate(s)[0]; assert.equal(r.essential_expenses, 100); assert.equal(r.flexible_expenses, 50); assert.equal(r.discretionary_expenses, 50); assert.equal(r.recurring_commitments, 100);
});
test('yield eligible cap, negative yields and exact reverse-fund sufficiency', () => {
  for (const rate of [3.5, -10]) {
    const s = plan(); s.yield_enabled = true; s.yield_rate = rate; s.yield_eligible_balance = 5000; livingPlan(s).items = [expense(2000)];
    const r = analyzeScenario(s); assert.equal(r.rows[0].investment_or_cash_yield, Math.round(5000 * ((1 + rate / 100) ** (1 / 12) - 1) * 100) / 100);
    assert.ok(simulate(s, r.required).every(x => x.closing_balance >= s.minimum_reserve));
    assert.ok(simulate(s, r.required - 0.01).some(x => x.closing_balance < s.minimum_reserve));
  }
});
test('non-positive pace, already-funded, below-reserve and growing balances', () => {
  const s = plan(); s.baseline.liquid_assets = a(5000); s.baseline.savings_pace = a(0); assert.equal(analyzeScenario(s).readyDate, null); assert.equal(analyzeScenario(s).lowest, 5000);
  s.baseline.savings_pace = a(-500); assert.equal(analyzeScenario(s).readyDate, null);
  s.baseline.liquid_assets = a(20000); s.baseline.income = a(1000); assert.equal(analyzeScenario(s).required, 10000); assert.equal(analyzeScenario(s).lowestDate, s.start_date);
  s.minimum_reserve = 0; assert.equal(analyzeScenario(s).required, 0);
});
test('transition separates final salary and first new salary; unknown work has no income', () => {
  const s = plan(); s.baseline.income = a(5000);
  const t = { last_working_day: '2026-01-31', final_salary_date: '2026-02-05', final_salary: 5000, new_job_start: '2026-03-15', first_salary_date: '2026-04-30', new_salary: 6000, relocation_cost: 1000, travel_cost: 2000, new_rent: null, new_transport: null };
  const next = applyTransition(s, t); assert.equal(validateScenario(next).length, 0);
  assert.deepEqual(simulate(next).map(x => x.income), [0, 5000, 0, 6000, 6000, 6000]);
  assert.deepEqual(simulate(next).map(x => x.one_time_events), [0, 2000, 1000, 0, 0, 0]);
  assert.deepEqual(simulate(applyTransition(next, t)), simulate(next), 'Regenerating workflow must not duplicate salary or costs');
  const unknown = applyTransition(s, { ...t, new_job_start: '', first_salary_date: '' }); assert.equal(simulate(unknown).at(-1).income, 0); assert.equal(latestAffordableStart(unknown), null);
});
test('latest job-start search checks reserve through the entire horizon', () => {
  const s = plan(); s.baseline.liquid_assets = a(14000); livingPlan(s).items = [expense(2000)];
  const next = applyTransition(s, { last_working_day: '2026-01-31', final_salary_date: '2026-01-31', final_salary: 2000, new_job_start: '2026-02-01', first_salary_date: '2026-02-01', new_salary: 3000, relocation_cost: 0, travel_cost: 0, new_rent: null, new_transport: null });
  assert.equal(latestAffordableStart(next), '2026-04-01');
});
test('duplicate isolation and shared runway engine', () => {
  const s = plan(); s.phases = [makePhase(s, 'Career Break', s.start_date, s.projection_end_date)];
  const copy = duplicateScenario(s); assert.notEqual(copy.id, s.id); assert.notEqual(copy.phases[0].id, s.phases[0].id); copy.baseline.income.amount = 999; assert.equal(s.baseline.income.amount, 0);
  s.baseline.income = a(5000); livingPlan(s).items = [expense(2000)]; assert.deepEqual(simulate(runwayScenario(s)).map(r => r.closing_balance), [18000, 16000, 14000, 12000, 10000, 8000]);
});
test('invalid dates, overlaps, rates and numbers never project', () => {
  const s = plan(); s.start_date = '2026-02-30'; assert.equal(simulate(s).length, 0);
  const n = plan(); n.baseline.income.amount = NaN; assert.equal(simulate(n).length, 0);
  const r = plan(); r.yield_rate = -100; assert.equal(simulate(r).length, 0);
  const p = plan(); p.phases = [makePhase(p, 'Current Job', '2026-01-01', '2026-02-01'), makePhase(p, 'Career Break', '2026-02-01', '2026-03-01')]; assert.equal(simulate(p).length, 0);
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29'); assert.equal(addMonths('2026-12-31', 1), '2027-01-31');
});
test('simulation and analysis never mutate the actual input', () => {
  const s = plan(); const before = JSON.stringify(s); analyzeScenario(s); assert.equal(JSON.stringify(s), before);
  s.projection_end_date = '2028-06-30'; const t = { last_working_day: '2026-01-31', final_salary_date: '2026-01-31', final_salary: 0, new_job_start: '', first_salary_date: '', new_salary: 5000, relocation_cost: 0, travel_cost: 0, new_rent: null, new_transport: null };
  const variants = employmentVariants(s, t); assert.equal(variants.length, 3); assert.ok(variants.every(v => !validateScenario(v).length)); assert.equal(new Set(variants.map(v => v.id)).size, 3);
});
console.log(`${count} life scenario checks passed.`);
