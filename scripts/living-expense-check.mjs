import assert from 'node:assert/strict';
import { moduleURL } from './load-typescript.mjs';
const p = await import(moduleURL('src/utils/futureExpense.ts'));
const { projectLivingExpenses: project } = await import(moduleURL('src/utils/livingExpense.ts'));
const library = p.emptyExpenseLibrary();
const plan = p.newExpensePlan('MYR'); library.plans.push(plan);
for (const [typeName, categoryName, name, amount] of [
  ['Needs', 'Housing', 'Rent', 800], ['Needs', 'Food', 'Grocery', 300],
  ['Needs', 'Food', 'Meals', 250], ['Needs', 'Utilities', 'Electricity / Water', 120],
  ['Commitments', 'Family', 'Mother', 800], ['Wants', 'Entertainment', 'Games', 100],
]) {
  let type = library.types.find(t => t.name === typeName);
  if (!type) { type = p.newExpenseType(typeName); library.types.push(type); }
  let category = library.categories.find(c => c.type_id === type.id && c.name === categoryName);
  if (!category) { category = p.newExpenseCategory(type.id, categoryName); library.categories.push(category); }
  plan.items.push({ ...p.newExpenseItem(plan), type_id: type.id, category_id: category.id, name, amount });
}
assert.equal(project(plan, library, 6).monthly, 2370);
assert.equal(project(plan, library, 6).required, 14220);
assert.equal(plan.confirmed, false); // No scenario or confirmation required.
library.types[0].name = 'Essentials';
assert.equal(project(plan, library, 6).monthly, 2370);
plan.items[0].enabled = false;
assert.equal(project(plan, library, 6).monthly, 1570);
plan.items[0].enabled = true;
library.types[0].is_active = false;
assert.equal(project(plan, library, 6).monthly, 900);
library.types[0].is_active = true;
library.categories[0].is_active = false;
assert.equal(project(plan, library, 6).monthly, 1570);
library.categories[0].is_active = true;
for (const months of [0, -1, 1.5, NaN, Infinity, 1201]) assert.equal(project(plan, library, months).required, null);
plan.items[0].currency = 'SGD';
assert.equal(project(plan, library, 6).monthly, null);
plan.items[0].currency = 'MYR';
plan.items[0].category_id = null;
assert.equal(project(plan, library, 6).required, null);
plan.items[0].enabled = false;
assert.equal(project(plan, library, 6).monthly, 1570);
console.log('PASS standalone example, unconfirmed plans, renamed types, disabled hierarchy/items, invalid months, mixed currencies and unmapped items');

const unfinished = p.newExpensePlan('MYR');
unfinished.items = Array.from({ length: 14 }, () => p.newExpenseItem(unfinished));
assert.deepEqual(project(unfinished, library, 12).errors, ['New expense: choose a type and category.']);
unfinished.items[0].name = 'Grocery';
assert.deepEqual(project(unfinished, library, 12).errors, [
  'Grocery: choose a type and category.', 'New expense: choose a type and category.',
]);
unfinished.items.splice(1);
assert.deepEqual(project(unfinished, library, 12).errors, ['Grocery: choose a type and category.']);
assert.equal(project(unfinished, library, 12).required, null);
console.log('PASS repeated unfinished expenses produce unique validation messages after renaming and deletion');

const { withBookkeepingHierarchy: link } = await import(moduleURL('src/utils/bookkeepingExpenseHierarchy.ts'));
const original = p.starterExpenseStructure(p.emptyExpenseLibrary());
const legacy = p.newExpensePlan('MYR'); original.plans.push(legacy);
legacy.items.push({ ...p.newExpenseItem(legacy), name: 'Rent', amount: 800,
  type_id: original.types[0].id, category_id: original.categories[0].id });
const before = JSON.stringify(original);
const types = [{ id: 1, name: 'Needs' }, { id: 2, name: 'Custom type' }];
const categories = [{ id: 10, name: 'Housing', type_id: 1 }];
const linked = link(original, types, categories);
assert.equal(JSON.stringify(original), before);
assert.equal(linked.plans[0].items[0].id, legacy.items[0].id);
assert.equal(linked.plans[0].items[0].category_id, 'bookkeeping-category:10');
assert.equal(project(linked.plans[0], linked, 12).monthly, 800);
const moved = link(linked, types, [{ id: 10, name: 'Home', type_id: 2 }]);
assert.equal(moved.plans[0].items[0].type_id, 'bookkeeping-type:2');
assert.equal(project(moved.plans[0], moved, 12).monthly, 800);
const deleted = link(moved, types, []);
assert.equal(deleted.plans[0].items[0].category_id, null);
assert.equal(deleted.plans[0].items[0].amount, 800);
assert.equal(project(deleted.plans[0], deleted, 12).monthly, null);
const ambiguous = link(original, types, [...categories, { id: 11, name: 'Housing', type_id: 1 }]);
assert.equal(ambiguous.plans[0].items[0].category_id, null);
console.log('PASS bookkeeping references, legacy matching, rename/move, deletion, ambiguous matches and preserved amounts');
