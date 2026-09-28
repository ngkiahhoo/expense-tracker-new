import assert from 'node:assert/strict';
import { moduleURL } from './load-typescript.mjs';

const { prescribeWorkout } = await import(moduleURL('src/lib/gym/progress/prescribe.ts'));
const target = { sets: 3, repMin: 8, repMax: 12, duration: null };
const loads = [5, 7.5, 10, 11, 12];
const today = '2026-09-20';
let assertions = 0;
const equal = (a, b, message) => { assert.deepEqual(a, b, message); assertions++; };
const match = (a, b, message) => { assert.match(a, b, message); assertions++; };

function session(reps = [10, 9, 8], options = {}) {
  const day = options.day ?? '2026-09-19';
  const id = options.id ?? `session-${day}`;
  const values = options.durations ?? reps;
  const validSets = values.map((value, i) => ({
    id: `${id}-${i}`, workoutExerciseId: `occ-${id}`, setNumber: i + 1,
    completedAt: `${day}T12:00:00Z`,
    weight: options.weights?.[i] ?? options.weight ?? 10,
    ...(options.durations ? { durationSeconds: value } : { reps: value }),
    ...(options.rir !== undefined && i === values.length - 1 ? { repsInReserve: options.rir } : {}),
    ...options.setOverrides?.[i],
  }));
  return {
    sessionId: id, occurrenceId: `occ-${id}`, sessionDate: day, exerciseId: 'squat',
    targets: options.targets ?? target, validSets,
    highestWeight: Math.max(...validSets.map(s => s.weight)), establishedLoad: 10,
    bestRepsAtWeight: {}, bestDurationAtWeight: {}, bestSet: validSets[0],
    sessionVolume: null, sessionE1RM: null, e1rmConfidence: 'insufficient',
    repsInReserve: options.rir ?? null,
    ...options.overrides,
  };
}
const prescribe = (sessions, options = {}) => prescribeWorkout(options.type ?? 'weight_reps', sessions,
  options.target ?? target, options.loads ?? loads, options.today ?? today, options.options);
const reps = result => result.setTargets.map(s => s.reps);
const seconds = result => result.setTargets.map(s => s.durationSeconds);
const weights = result => result.setTargets.map(s => s.weight);

// Per-set double progression must not turn a best set into three harder sets.
let result = prescribe([session()]);
equal(reps(result), [10, 9, 9], 'Only one total rep is added to the weakest set');
equal(result.action, 'add_rep');
equal(result.confidence, 'low', 'Missing effort is unknown, not a readiness claim');
match(result.reason, /only 1 extra rep/);
equal(reps(prescribe([session([10, 10, 10])])), [10, 10, 11], 'Ties prefer the final set');
equal(reps(prescribe([session([13, 10, 8])])), [12, 10, 9], 'The current plan ceiling is respected');

// All working-set failures and quality problems can veto progression.
result = prescribe([session([10, 9, 8], { rir: 0 })]);
equal(result.action, 'repeat');
equal(reps(result), [10, 9, 8]);
result = prescribe([session([10, 9, 8], { rir: 3, setOverrides: [{ repsInReserve: 0 }] })]);
equal(result.action, 'repeat', 'A failure in an early set cannot be hidden by final-set RIR');
result = prescribe([session([10, 9, 8], { setOverrides: [{ techniqueValid: false }] })]);
equal(result.action, 'repeat');
match(result.reason, /technique issue/);
result = prescribe([session()], { options: { techniqueIssue: true } });
equal(result.action, 'repeat', 'Raw quality signals survive analytics filtering');
result = prescribe([session([10, 9, 8], { overrides: { techniqueIssue: true } })]);
equal(result.action, 'repeat');

// Missing slots do not imply completion; adding them already increases work.
result = prescribe([session([10])]);
equal(result.action, 'repeat');
equal(reps(result), [10, 10, 10]);
equal(result.setTargets.map(s => !!s.provisional), [false, true, true]);
match(result.reason, /provisional/);
result = prescribe([session([10, 9, 8], { setOverrides: [{}, {}, { setNumber: 2 }] })]);
equal(result.action, 'repeat', 'Duplicate set numbers do not fake a complete session');
result = prescribe([session([10, 9, 8], { setOverrides: [{}, {}, { deleted: true }] })]);
equal(result.action, 'repeat');
result = prescribe([session([10, 9, 8], { setOverrides: [{}, {}, { isWarmup: true }] })]);
equal(result.action, 'repeat');
result = prescribe([session([10, 9, 8])], { target: { ...target, sets: 4 } });
equal(result.action, 'repeat', 'Increasing planned set count requires a new volume baseline');
equal(reps(result), [10, 9, 8, 8]);
result = prescribe([session([10, 9, 8], { targets: { ...target, sets: 4 } })]);
equal(result.action, 'repeat', 'A historically incomplete workout is not marked full by reducing the plan');

// Mixed-load outliers must not become a load prescription for every set.
result = prescribe([session([5, 9, 8], { weights: [20, 10, 10] })]);
equal(weights(result), [10, 10, 10]);
equal(result.action, 'repeat');
equal(reps(result), [8, 9, 8]);
equal(result.setTargets[0].provisional, true);
result = prescribe([session([10, 8], { weights: [10, 20] })]);
equal(result.weight, 10, 'Tied frequencies use the lower observed working load');

// Require repeated full mastery and known reserve before increasing load.
const mastered = day => session([12, 12, 12], { day, rir: 2 });
const pair = [mastered('2026-09-16'), mastered('2026-09-19')];
result = prescribe([pair[1]]);
equal(result.action, 'repeat');
equal(result.repRangeMastered, true);
match(result.reason, /second consecutive/);
result = prescribe(pair);
equal(result.action, 'increase_load');
equal(weights(result), [11, 11, 11]);
equal(reps(result), [8, 8, 8]);
result = prescribe([mastered('2026-09-16'), session([12, 12, 12])]);
equal(result.action, 'repeat');
match(result.reason, /effort is unknown/);
result = prescribe([mastered('2026-09-16'), session([12, 12, 12], { rir: 1 })]);
equal(result.action, 'repeat');
result = prescribe([session([12, 12, 11], { day: '2026-09-16', rir: 3 }), pair[1]]);
equal(result.action, 'repeat');
result = prescribe([pair[1], { ...pair[1], occurrenceId: 'duplicate-occurrence' }]);
equal(result.action, 'repeat', 'Duplicate exercise occurrences in one session are one confirmation');
result = prescribe([...pair, session([10, 10, 10], { day: '2026-09-20' })]);
equal(result.action, 'add_rep', 'An intervening non-mastery resets the consecutive confirmation');
result = prescribe(pair, { loads: [5, 10, 12.5] });
equal(result.kind, 'equipment_limit');
equal(weights(result), [10, 10, 10]);
match(result.reason, /more than 10%/);
result = prescribe(pair, { loads: [5, 10] });
equal(result.kind, 'equipment_limit');
result = prescribe([session()], { loads: [] });
equal(result.kind, 'configure_loads');
equal(weights(result), [null, null, null]);
result = prescribe([session()], { loads: [12, 15] });
equal(weights(result), [null, null, null], 'No unsupported or inferred heavier replacement');

// Repeated low reps can call for a lighter available load; a single bad day cannot.
const lowPair = [session([6, 5, 4], { day: '2026-09-16', rir: 0 }), session([6, 5, 4], { rir: 0 })];
result = prescribe(lowPair);
equal(result.action, 'reduce_load');
equal(weights(result), [7.5, 7.5, 7.5]);
equal(reps(result), [4, 4, 4], 'A lower load does not invent a jump to the minimum rep range');
result = prescribe([lowPair[1]]);
equal(result.action, 'repeat');
result = prescribe([session([3, 2, 1])], { type: 'reps' });
equal(reps(result), [3, 2, 2], 'Bodyweight capacity below the rep range remains below it');
equal(weights(result), [null, null, null]);
result = prescribe([session([12, 12, 12])], { type: 'reps' });
equal(result.action, 'repeat');
equal(reps(result), [12, 12, 12]);
result = prescribe([], { type: 'reps', options: { zeroBaseline: true } });
equal(reps(result), [1, 1, 1]);
match(result.reason, /assistance/);

// Time progresses one second on one hold, never 30 -> 60 on all planned sets.
const hold = session([], { durations: [30, 30, 30] });
result = prescribe([hold], { type: 'time', target: { ...target, duration: 60 } });
equal(seconds(result), [30, 30, 31]);
equal(result.action, 'add_time');
equal(weights(result), [null, null, null]);
result = prescribe([hold], { type: 'weight_time', target: { ...target, duration: 60 } });
equal(seconds(result), [30, 30, 31]);
equal(weights(result), [10, 10, 10]);
result = prescribe([hold], { type: 'time' });
equal(seconds(result), [30, 30, 30]);
equal(result.action, 'repeat');
result = prescribe([session([], { durations: [60, 60, 60] })], { type: 'time', target: { ...target, duration: 60 } });
equal(result.action, 'repeat');
equal(seconds(result), [60, 60, 60]);
result = prescribe([session([], { durations: [30] })], { type: 'time', target: { ...target, duration: 60 } });
equal(result.action, 'repeat');
equal(seconds(result), [30, 30, 30]);
result = prescribe([session([], { durations: [59.5, 60, 60] })], { type: 'time', target: { ...target, duration: 60 } });
equal(seconds(result), [60, 60, 60], 'The timer increment is capped at the goal');

// No record -> no imaginary kg; stale and future data must not drive progression.
result = prescribe([]);
equal(result.action, 'establish');
equal(result.weight, null);
equal(weights(result), [null, null, null]);
equal(result.confidence, 'insufficient');
result = prescribe([session([10, 9, 8], { day: '2026-08-30' })]);
equal(result.action, 'rebuild');
equal(reps(result), [10, 9, 8]);
result = prescribe([session([10, 9, 8], { day: '2026-09-21' })]);
equal(result.action, 'establish');
result = prescribe([session([10, 9, 8], { day: '2026-09-01' })]);
equal(result.action, 'add_rep', '19 days does not invoke the 21-day conservative review');

// Defensive normalization cannot cause impossible values or mutate saved records.
result = prescribe([null, {}, session([NaN, Infinity, -1]), session([1.5, 0, 0])]);
equal(result.action, 'establish');
result = prescribe([], { target: { sets: Infinity, repMin: NaN, repMax: -1, duration: Infinity }, loads: [NaN, -5, Infinity] });
equal(result.setTargets.length, 3);
equal(reps(result), [8, 8, 8]);
equal(result.durationSeconds, null);
result = prescribe([session([10, 9, 8], { day: '2026-02-30' })]);
equal(result.action, 'establish', 'Impossible dates are rejected');
const original = pair.map(s => structuredClone(s));
prescribe(pair);
equal(pair, original, 'Prescription calculation never mutates historical sets');
for (let first = 1; first <= 12; first++) {
  const input = [first, Math.max(1, first - 1), Math.max(1, first - 2)];
  const value = prescribe([session(input)], { type: 'reps' });
  equal(reps(value).reduce((a, b) => a + b, 0) - input.reduce((a, b) => a + b, 0), 1, 'Progression adds exactly one total rep');
  equal(value.setTargets.every(s => Number.isInteger(s.reps) && s.reps >= 1 && s.reps <= 12), true);
}

result = prescribe([session([10,9,8], {rir:1})]);
equal(result.action,'repeat','Near-failure effort prevents adding reps below the ceiling');
result = prescribe([session([10,9,8])], {options:{failedAttempt:true}});
equal(result.action,'rebuild','A recent zero attempt cannot be hidden by older valid sets');
console.log(`Gym prescription: ${assertions} assertions passed.`);
