import assert from 'node:assert/strict';
import { moduleURL } from './load-typescript.mjs';

const { DEFAULT_PLATE_INVENTORY, generateAvailableDumbbellLoads: loads } = await import(moduleURL('src/lib/gym/progress/equipment.ts'));

// Two plates physically make one balanced dumbbell, but cannot make a matched pair.
assert.deepEqual(loads([{ weightKg: 2.5, quantity: 2 }], 1), [5]);
assert.deepEqual(loads([{ weightKg: 2.5, quantity: 2 }], 2), []);
assert.deepEqual(loads([{ weightKg: 2.5, quantity: 3 }], 1), [5], 'An odd spare plate cannot add balanced resistance');
assert.deepEqual(loads([{ weightKg: 2.5, quantity: 4 }], 1), [5, 10]);
assert.deepEqual(loads([{ weightKg: 2.5, quantity: 4 }], 2), [5]);

// Real inventory regression: 10 kg and 16 kg are possible on one dumbbell,
// but unavailable when those same plates must build two equal dumbbells.
const paired = loads(DEFAULT_PLATE_INVENTORY, 2);
const single = loads(DEFAULT_PLATE_INVENTORY, 1);
assert.deepEqual(paired, [2.5, 5, 6, 7.5, 8.5, 11, 12, 13.5, 14.5, 17, 19.5]);
assert.ok(single.includes(10));
assert.ok(single.includes(16));
assert.equal(single.at(-1), 39);
assert.ok(paired.every(weight => single.includes(weight)), 'Any pair load must also fit one dumbbell');
assert.deepEqual(loads(), paired, 'Legacy missing setup retains paired equipment limits');

// Duplicate inventory rows are physical stock, not alternative rows to choose from.
const split = [{ weightKg: 0.1, quantity: 2 }, { weightKg: 0.1, quantity: 2 }, { weightKg: 0.2, quantity: 4 }];
assert.deepEqual(loads(split, 2), [0.2, 0.4, 0.6]);
assert.deepEqual(loads(split, 1), [0.2, 0.4, 0.6, 0.8, 1, 1.2]);
assert.deepEqual(loads([], 1), []);
assert.deepEqual(loads([{ weightKg: NaN, quantity: 4 }, { weightKg: -2, quantity: 4 }, { weightKg: 1, quantity: 2.5 }, { weightKg: 1, quantity: -1 }, { weightKg: 0.0001, quantity: 4 }], 1), []);
const frozen = Object.freeze(DEFAULT_PLATE_INVENTORY.map(plate => Object.freeze({ ...plate })));
assert.deepEqual(loads(frozen, 1), single, 'Generating a setup never consumes or edits inventory');
console.log('Gym equipment review: single and paired load checks passed.');
