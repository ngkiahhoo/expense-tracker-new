import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/utils/paymentPlanGroups.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { groupPaymentPlans } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

let nextId = 1;
const installment = (amount, due_date, status = 'scheduled') => ({ id: nextId++, sequence: nextId, amount, due_date, status });
const plan = (id, name, payment_installments, options = {}) => ({ id, name, currency: 'MYR', category_id: 1, payment_installments, ...options });

const legacyPlans = [
  plan('first', '  Shopee  ', [installment(10, '2026-10-20'), installment(5, '2026-09-01', 'posted')]),
  plan('other', 'Lazada', [installment(7, '2026-10-01')]),
  plan('second', 'sHoPeE', [installment(20, '2026-10-01'), installment(15, '2026-09-30')], { payment_name_id: null }),
];
const original = structuredClone(legacyPlans);
const legacy = groupPaymentPlans(legacyPlans, 'MYR');
assert.deepEqual(legacy.map(group => group.name), ['Shopee', 'Lazada']);
assert.equal(legacy[0].remaining, 45);
assert.equal(legacy[0].posted, 5);
assert.deepEqual(legacy[0].monthly, [{ month: '2026-09', amount: 15 }, { month: '2026-10', amount: 30 }]);
assert.deepEqual(legacy[0].plans.map(item => item.id), ['first', 'second']);
assert.equal(legacy[0].plans[0], legacyPlans[0]);
assert.deepEqual(legacyPlans, original);
assert.equal(groupPaymentPlans([
  plan('spacing-a', 'Shop   Pay', []),
  plan('spacing-b', ' shop\tpay ', []),
], 'MYR').length, 1);

const namedPlans = [
  plan('later', 'Shopee', [installment(50, '2026-10-05')], { payment_name_id: 1 }),
  plan('installment', 'Shopee', [installment(25, '2026-10-10'), installment(25, '2026-11-10')], { payment_name_id: 1 }),
  plan('sgd', 'Shopee', [installment(1000, '2026-10-01')], { currency: 'SGD', payment_name_id: 1 }),
  plan('different-id', 'Shopee', [installment(9, '2026-10-01')], { payment_name_id: 2 }),
  plan('renamed', 'Shopee purchases', [installment(10, '2026-11-20')], { payment_name_id: 1 }),
];
const named = groupPaymentPlans(namedPlans, 'MYR');
assert.equal(named.length, 2);
assert.deepEqual(named[0].plans.map(item => item.id), ['later', 'installment', 'renamed']);
assert.equal(named[0].remaining, 110);
assert.deepEqual(named[0].monthly, [{ month: '2026-10', amount: 75 }, { month: '2026-11', amount: 35 }]);
assert.equal(named[1].remaining, 9);
const sgd = groupPaymentPlans(namedPlans, 'SGD');
assert.equal(sgd.length, 1);
assert.equal(sgd[0].remaining, 1000);
assert.deepEqual(sgd[0].plans.map(item => item.id), ['sgd']);

const statuses = groupPaymentPlans([plan('status', 'Shopee', [
  installment(10, '2026-10-01'),
  installment(20, '2026-09-01', 'posted'),
  installment(30, '2026-11-01', 'cancelled'),
  installment(40, '2026-08-01', 'reversed'),
])], 'MYR')[0];
assert.equal(statuses.remaining, 10);
assert.equal(statuses.posted, 20);
assert.deepEqual(statuses.monthly, [{ month: '2026-10', amount: 10 }]);

const cents = groupPaymentPlans([plan('cents', 'Shopee', [
  installment(0.1, '2026-10-01'),
  installment(0.2, '2026-10-02'),
  installment(0.1, '2026-09-01', 'posted'),
  installment(0.2, '2026-09-02', 'posted'),
])], 'MYR')[0];
assert.equal(cents.remaining, 0.3);
assert.equal(cents.posted, 0.3);
assert.deepEqual(cents.monthly, [{ month: '2026-10', amount: 0.3 }]);
assert.deepEqual(groupPaymentPlans([], 'MYR'), []);

console.log('PASS: legacy name normalization, canonical name IDs, accumulated monthly schedules, currency isolation, status filtering, cent precision, stable plan order and unchanged inputs.');
