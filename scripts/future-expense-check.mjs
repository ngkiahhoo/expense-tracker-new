import assert from 'node:assert/strict';
import { moduleURL } from './load-typescript.mjs';
const p = await import(moduleURL('src/utils/futureExpense.ts'));
const e = await import(moduleURL('src/utils/lifeScenario.ts'));
const w = await import(moduleURL('src/utils/planningWorkspace.ts'));
const t = await import(moduleURL('src/utils/scenarioTransition.ts'));
let count = 0;
const test = (name, run) => { run(); count++; console.log(`PASS ${name}`); };
function setup() {
  const library = p.starterExpenseStructure(p.emptyExpenseLibrary());
  const baseline = e.buildBaseline({ currency: 'MYR', today: '2026-01-01', expenses: [], incomes: [], assets: [], categories: [], recurring: [], plans: [] });
  baseline.liquid_assets = e.assumption(20000, 'MYR'); baseline.reviewed = true;
  const s = e.createScenario(baseline); s.projection_end_date = '2026-03-31';
  const plan = p.newExpensePlan('MYR'); plan.confirmed = true; library.plans.push(plan); s.expense_plan_id = plan.id;
  const category = library.categories[0];
  const item = { ...p.newExpenseItem(plan), name: 'Rent', amount: 1000, type_id: category.type_id, category_id: category.id };
  plan.items.push(item);
  return { library, s, plan, item };
}
test('historical suggestions never become expenses until explicitly imported into a confirmed selected plan', () => {
  const { s, library, plan } = setup(); s.baseline.expenses = [{ ...e.assumption(9999, 'MYR', 'HISTORICAL'), id: 'old', name: 'Old lifestyle', classification: 'FLEXIBLE', enabled: true }];
  assert.equal(e.simulate(s, undefined, library)[0].living_cost, 1000);
  plan.confirmed = false; assert.deepEqual(e.simulate(s, undefined, library), []);
  plan.confirmed = true; s.expense_plan_id = ''; assert.deepEqual(e.simulate(s, undefined, library), []);
});
test('historical import is repeatable without duplication and preserves changed planned values', () => {
  const { s, library, plan } = setup(); const source = { ...e.assumption(420, 'MYR', 'HISTORICAL'), id: 'cat1', source_reference_id: 'historical:MYR:1', source_category_id: '1', name: 'Food', classification: 'FLEXIBLE', enabled: true };
  const imported = p.importExpenseSuggestions(plan, library, [source], 'HISTORICAL');
  const item = imported.items.at(-1); assert.equal(item.historical_average, 420); assert.ok(item.category_id); item.amount = 500; item.source_type = 'USER_OVERRIDE';
  const repeat = p.importExpenseSuggestions(imported, library, [source], 'HISTORICAL'); assert.equal(repeat.items.length, 2); assert.equal(repeat.items.at(-1).amount, 500); assert.equal(source.amount, 420);
  repeat.confirmed = true; library.plans[0] = repeat; assert.equal(e.simulate(s, undefined, library)[0].living_cost, 1500);
});
test('unmapped imports require explicit mapping and mapping memory applies to future imports', () => {
  const { library, plan } = setup(); const source = { ...e.assumption(80, 'MYR', 'HISTORICAL'), id: 'snacks', source_category_id: '47', name: 'Snacks', enabled: true };
  const imported = p.importExpenseSuggestions(plan, library, [source], 'HISTORICAL'); assert.equal(imported.items.at(-1).category_id, null); assert.ok(p.validateExpensePlan(imported, library).some(x => x.includes('Unmapped')));
  const category = library.categories.find(c => c.name === 'Dining Out'); library.mappings.push({ source_category_id: '47', future_type_id: category.type_id, future_category_id: category.id });
  const second = p.importExpenseSuggestions(p.newExpensePlan('MYR'), library, [source], 'HISTORICAL'); assert.equal(second.items[0].category_id, category.id);
});
test('recurring imports and history omit the same generated transactions', () => {
  const { library, plan } = setup();
  const b = e.buildBaseline({ currency: 'MYR', today: '2026-02-01', incomes: [], expenses: [{ amount: 500, expense_date: '2026-01-10', category_id: 1 }, { amount: 55, expense_date: '2026-01-20', category_id: 1, recurring_expense_id: 9 }, { amount: 300, expense_date: '2026-01-20', category_id: 1, payment_installment_id: 10 }], recurring: [{ id: 9, name: 'Netflix', category_id: 1, amount: 55, repeat_day: 20, is_active: true }], assets: [], categories: [{ id: 1, name: 'Food' }], plans: [] });
  assert.equal(b.expenses[0].amount, 500);
  const imported = p.importExpenseSuggestions(p.importExpenseSuggestions(plan, library, b.expenses, 'HISTORICAL'), library, b.expenses, 'RECURRING');
  assert.equal(imported.items.length, 3); assert.equal(imported.items.at(-1).source_reference_id, 'recurring:9'); assert.equal(p.importExpenseSuggestions(imported, library, b.expenses, 'RECURRING').items.length, 3);
});
test('type renaming, category renaming and ordering do not change amounts', () => {
  const { s, library, item } = setup(); const before = e.simulate(s, undefined, library);
  library.types.find(t => t.id === item.type_id).name = 'My custom unavoidable costs'; library.categories[0].name = 'My home'; library.types[0].sort_order = 100;
  assert.deepEqual(e.simulate(s, undefined, library), before);
});
test('type/category/item disabling excludes items without deleting child records', () => {
  const { s, library, item } = setup(); const type = library.types.find(t => t.id === item.type_id);
  type.is_active = false; assert.equal(e.simulate(s, undefined, library)[0].living_cost, 0); assert.equal(library.plans[0].items.length, 1);
  type.is_active = true; library.categories[0].is_active = false; assert.equal(e.simulate(s, undefined, library)[0].living_cost, 0);
  library.categories[0].is_active = true; item.enabled = false; assert.equal(e.simulate(s, undefined, library)[0].living_cost, 0);
});
test('category must belong to selected type', () => {
  const { library, plan, item } = setup(); item.type_id = library.types[1].id; assert.ok(p.validateExpensePlan(plan, library).some(x => x.includes('belong')));
});
test('category moves update item type IDs and mapping memory across plans', () => {
  const { library, item } = setup(); const target = library.types[1];
  library.mappings.push({ source_category_id: '4', future_type_id: item.type_id, future_category_id: item.category_id });
  const copy = p.duplicateExpensePlan(library.plans[0], library); library.plans.push(copy);
  const moved = p.moveExpenseCategory(library, item.category_id, target.id);
  assert.ok(moved.plans.every(p => p.items[0].type_id === target.id)); assert.equal(moved.mappings[0].future_type_id, target.id); assert.notEqual(library.plans[0].items[0].type_id, target.id); assert.equal(moved.plans[0].confirmed, false);
});
test('safe type deletion refuses child loss and supports reassignment', () => {
  const { library, item } = setup(); assert.throws(() => p.deleteExpenseType(library, item.type_id), /categories/);
  const target = library.types[1].id; const moved = p.deleteExpenseType(library, item.type_id, target);
  assert.equal(moved.plans[0].items[0].type_id, target); assert.equal(moved.categories.length, library.categories.length); assert.equal(moved.types.length, library.types.length - 1);
});
test('safe category deletion preserves item IDs and phase overrides on reassignment', () => {
  const { s, library, item } = setup(); const phase = e.makePhase(s, 'Travel', '2026-01-01', '2026-03-31'); phase.expense_overrides[item.id] = { ...e.assumption(800, 'MYR'), enabled: true }; s.phases = [phase];
  assert.throws(() => p.deleteExpenseCategory(library, item.category_id), /expense items/);
  const next = p.deleteExpenseCategory(library, item.category_id, library.categories[1].id); next.plans[0].confirmed = true;
  assert.equal(next.plans[0].items[0].id, item.id); assert.equal(e.simulate(s, undefined, next)[0].living_cost, 800);
});
test('plan duplication is independent and generated amounts use behavior metadata, not labels', () => {
  const { library, plan, item } = setup(); library.types[0].name = 'Wants';
  const wantedCategory = library.categories.find(c => c.type_id === library.types[1].id);
  plan.items.push({ ...item, id: 'optional', name: 'Fun', amount: 200, type_id: wantedCategory.type_id, category_id: wantedCategory.id });
  const copy = p.duplicateExpensePlan(plan, library, 0.5); assert.equal(copy.items[0].amount, 1000); assert.equal(copy.items[1].amount, 100); assert.notEqual(copy.items[0].id, item.id);
  copy.items[0].amount = 2000; assert.equal(item.amount, 1000); assert.equal(copy.confirmed, false);
});
test('phase selects its plan, overrides only its own items and restores default on uncovered dates', () => {
  const { s, library, plan, item } = setup(); const copy = p.duplicateExpensePlan(plan, library); copy.items[0].amount = 500; copy.confirmed = true; library.plans.push(copy);
  const phase = e.makePhase(s, 'Break', '2026-02-01', '2026-02-28'); phase.expense_plan_id = copy.id; phase.expense_overrides[copy.items[0].id] = { ...e.assumption(800, 'MYR'), enabled: true }; s.phases = [phase];
  assert.deepEqual(e.simulate(s, undefined, library).map(r => r.living_cost), [1000, 800, 1000]); assert.equal(copy.items[0].amount, 500); assert.equal(item.amount, 1000);
});
test('dated items prorate on active days and temporary commitments expire independently', () => {
  const { s, library, item } = setup(); item.amount = 310; item.start_date = '2026-01-16'; item.end_date = '2026-01-31';
  s.baseline.repayments = [{ ...e.assumption(13.06, 'MYR'), id: '1', name: 'Instalment', date: '2026-01-15' }, { ...e.assumption(13.08, 'MYR'), id: '2', name: 'Instalment', date: '2026-02-15' }];
  const rows = e.simulate(s, undefined, library); assert.deepEqual(rows.map(r => r.living_cost), [160, 0, 0]); assert.deepEqual(rows.map(r => r.liability_payments), [13.06, 13.08, 0]);
});
test('calendar has a single financial effect for a recurring source across same-month phase plans', () => {
  const { s, library, plan, item } = setup(); item.amount = 55; item.repeat_day = 5; item.source_reference_id = 'recurring:55'; item.source_type = 'RECURRING'; item.is_fixed = true;
  const copy = p.duplicateExpensePlan(plan, library); copy.items[0].repeat_day = 20; copy.confirmed = true; library.plans.push(copy);
  const phase = e.makePhase(s, 'Travel', '2026-01-16', '2026-01-31'); phase.expense_plan_id = copy.id; s.phases = [phase];
  assert.equal(e.simulate(s, undefined, library)[0].living_cost, 55);
});
test('inflation and FX apply after planned phase values, with fixed amounts excluded', () => {
  const { s, library, item } = setup(); item.currency = 'SGD'; item.amount = 100; s.fx.SGD = 3.2; s.inflation_enabled = true; s.inflation_rate = 12;
  assert.equal(e.simulate(s, undefined, library)[1].living_cost, 323.04); item.is_fixed = true; assert.equal(e.simulate(s, undefined, library)[1].living_cost, 320);
});
test('phase cost, monthly previews and scenario total reconcile with dated events', () => {
  const { s, library } = setup(); s.phases = [e.makePhase(s, 'Career Break', '2026-01-01', '2026-03-31')];
  s.events = [{ ...e.assumption(4000, 'MYR'), id: 'trip', scenario_id: s.id, date: '2026-02-15', description: 'Trip', direction: 'expense', type: 'TRAVEL_COST' }];
  s.baseline.repayments = [{ ...e.assumption(182, 'MYR'), id: 'debt', date: '2026-01-31', name: 'Phone' }];
  const r = e.analyzeScenario(s, library); assert.equal(r.totalSpending, 7182); assert.equal(r.phases[0].total, 7182); assert.equal(r.phases[0].income, 0); assert.equal(r.phases[0].net, -7182); assert.equal(r.rows[1].total_outflow, 5000); assert.equal(r.phases[0].days, 90);
});
test('job transition overrides chosen item IDs without modifying plans or historical references', () => {
  const { s, library, item } = setup(); const before = JSON.stringify(library);
  const next = t.applyTransition(s, { last_working_day: '2026-01-31', final_salary_date: '2026-01-31', final_salary: 0, new_job_start: '2026-02-01', first_salary_date: '2026-02-28', new_salary: 6000, relocation_cost: 0, travel_cost: 0, new_rent: 1500, new_transport: null, rent_item_id: item.id }, library);
  assert.deepEqual(e.simulate(next, undefined, library).map(r => r.living_cost), [1000, 1500, 1500]); assert.equal(JSON.stringify(library), before); assert.deepEqual(next.baseline.expenses, []);
});
test('legacy migration preserves references, overrides and explicit lifestyle amounts, requiring review', () => {
  const { s } = setup(); s.version = 1; delete s.expense_plan_id; s.lifestyle = 'LEAN'; s.flexible_multiplier = 0.5; s.baseline.expenses = [{ ...e.assumption(500, 'MYR', 'HISTORICAL'), id: 'category-9', name: 'Food', classification: 'FLEXIBLE', enabled: true }];
  s.phases = [{ ...e.makePhase(s, 'Break', '2026-01-01', '2026-03-31'), expense_overrides: { 'category-9': { ...e.assumption(400, 'MYR'), enabled: true } } }];
  const raw = JSON.stringify([s]); const migrated = w.migrateLegacyScenarios(raw); assert.deepEqual(w.migrateLegacyScenarios(raw), migrated);
  const next = migrated.scenarios[0]; assert.equal(migrated.library.plans[0].items[0].amount, 250); assert.equal(Object.values(next.phases[0].expense_overrides)[0].amount, 200); assert.equal(migrated.library.plans[0].confirmed, false); assert.equal(next.lifestyle, 'NORMAL');
  assert.deepEqual(e.simulate(next, undefined, migrated.library), []); migrated.library.plans[0].confirmed = true; assert.equal(e.simulate(next, undefined, migrated.library)[0].living_cost, 200); assert.equal(JSON.stringify([s]), raw);
});
test('invalid plans, corrupt data and missing FX cannot produce misleading projections', () => {
  const { s, library, item, plan } = setup(); item.start_date = '2026-02-30'; assert.deepEqual(e.simulate(s, undefined, library), []); delete item.start_date;
  item.source_type = 'EXISTING_COMMITMENT'; assert.ok(p.validateExpensePlan(plan, library).some(e => e.includes('Temporary'))); item.source_type = 'USER_CREATED';
  item.currency = 'SGD'; assert.deepEqual(e.simulate(s, undefined, library), []);
  assert.throws(() => w.assertWorkspaceShape({ version: 2, library: { plans: [] } }));
});
console.log(`${count} future expense architecture checks passed.`);
