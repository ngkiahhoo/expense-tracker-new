import assert from 'node:assert/strict';
import { moduleURL } from './load-typescript.mjs';

const { analyzeProgress, calculateE1RM, normalizeAvailableLoads } = await import(moduleURL('src/lib/gym/progress/calculate.ts'));
const { formatWorkoutAIExport } = await import(moduleURL('src/utils/formatWorkoutAIExport.ts'));
const today = '2026-11-30';
const date = day => `2026-09-${String(day).padStart(2, '0')}T12:00:00Z`;
const exercise = (id = 'press', trackingType = 'weight_reps') => ({ id, name: id, trackingType });
function workout(day, sets, ex = exercise(), overrides = {}) {
  return {
    id: `${ex.id}-${day}`, planId: 'A', planNameSnapshot: 'Plan A', startedAt: date(day), endedAt: date(day), status: 'completed',
    exercises: [{ id: `occ-${day}`, exerciseId: ex.id, nameSnapshot: ex.name, trackingTypeSnapshot: ex.trackingType, plannedSetsSnapshot: 3, targetRepMin: 8, targetRepMax: 12, status: 'completed' }],
    sets: sets.map((set, i) => ({ id: `${ex.id}-${day}-${i}`, workoutExerciseId: `occ-${day}`, setNumber: i + 1, completedAt: date(day), ...set })), ...overrides,
  };
}
function data(sessions = [], exercises = [exercise()]) {
  return { exercises, sessions, plans: [{ id: 'A', name: 'Plan A', exerciseIds: exercises.map(e => ({ exerciseId: e.id, targetSets: 3, targetRepMin: 8, targetRepMax: 12 })) }], routines: [], progressSettings: { availableLoads: [5, 7.5, 10, 12.5], weightConvention: 'per_dumbbell' } };
}
const analyze = input => analyzeProgress(input, today);
const first = input => analyze(input).exercises[0];
const set = (weight, reps) => ({ weight, reps });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

// A: same-load reps followed by an established heavier load.
const a = data([workout(1, [set(5, 8)]), workout(3, [set(5, 10)]), workout(5, [set(5, 12)]), workout(19, [set(7.5, 8)])]);
let result = first(a);
assert.equal(result.startingLoad, 5);
assert.equal(result.currentLoad, 7.5);
near(result.loadChangePercent, 50);
assert.equal(result.bestRepsAtLoad['5'], 12);
assert.equal(result.nextTarget.label, '7.5kg x 9');
assert.equal(result.repChangeAtCurrentLoad, 0, 'Changing load must not report a loss of reps');
assert.equal(result.daysToCurrentLoad, 18);
assert.equal(result.sessionsToCurrentLoad, 3, 'Exclude initial milestone, include destination exercise session');
assert.equal(result.averageDaysPerLoadIncrease, null);

// B: all planned working sets must master the range, with available equipment.
const b = data([workout(1, [set(7.5, 12), set(7.5, 12), set(7.5, 12)])]);
assert.equal(first(b).nextTarget.repRangeMastered, true);
assert.equal(first(b).nextTarget.label, '10kg x 8');
b.sessions[0].sets[2].reps = 11;
assert.equal(first(b).nextTarget.repRangeMastered, false);
assert.equal(first(b).nextTarget.weight, 7.5);
b.sessions[0].sets[2].reps = 12;
b.sessions[0].sets[2].repsInReserve = 0;
assert.equal(first(b).nextTarget.kind, 'repeat');
b.sessions[0].sets[2].repsInReserve = 2;
assert.equal(first(b).nextTarget.kind, 'increase_load');
b.progressSettings.availableLoads = [5, 7.5];
assert.equal(first(b).nextTarget.kind, 'equipment_limit');
b.progressSettings.availableLoads = [];
assert.equal(first(b).nextTarget.kind, 'configure_loads');
assert.deepEqual(normalizeAvailableLoads([10, 5, 5, -1, 0, NaN, Infinity, '7.5']), [5, 10]);

// C: an explicit zero attempt is a baseline, but not a valid work set/session.
const pull = exercise('pull', 'reps');
const c = data([0, 1, 2, 3].map((reps, i) => workout(i + 1, [{ reps }], pull)), [pull]);
result = first(c);
assert.equal(result.startingMaxReps, 0);
assert.equal(result.repChange, 3);
assert.equal(result.repChangePercent, null);
assert.equal(result.nextTarget.label, '4 reps');
assert.equal(result.sessionCount, 3);
assert.equal(result.currentE1RM, null);
assert.equal(analyze(c).overall.validSets, 3);
assert.equal(result.prHistory[0].previousValue, 0);
assert.ok(!JSON.stringify(analyze(c)).includes('Infinity'));

// D: time is separate from weight and estimated strength.
const plank = exercise('plank', 'time');
const d = data([30, 40, 45].map((durationSeconds, i) => workout(i + 1, [{ durationSeconds }], plank)), [plank]);
result = first(d);
assert.equal(result.durationChange, 15);
near(result.durationChangePercent, 50);
assert.equal(result.nextTarget.label, '50s');
assert.equal(result.currentE1RM, null);
d.plans[0].exerciseIds[0].targetDurationMax = 60;
assert.equal(first(d).nextTarget.label, '60s');

// E: a single workout establishes baselines, not improvement PRs or 0% strength.
const e = data([workout(1, [set(5, 10)])]);
assert.equal(analyze(e).overall.estimatedStrengthChangePercent, null);
assert.equal(first(e).estimatedStrengthChangePercent, null);
assert.equal(first(e).loadChangePercent, null);
assert.equal(analyze(e).overall.lifetimePRs, 0);
assert.equal(first(e).status, 'Building baseline');
assert.equal(analyze(data()).overall.trainingStartDate, null);

// F/G: inactivity cannot cause plateau; six performed sessions without improvement can.
const repeated = data(Array.from({ length: 7 }, (_, i) => workout(i + 1, [set(5, 10)])));
assert.equal(first(e).sessionsWithoutImprovement, 0);
assert.equal(first(repeated).status, 'Possible plateau');
assert.equal(first(repeated).sessionsWithoutImprovement, 6);
assert.equal(analyzeProgress(repeated, '2026-09-30').monthly.possiblePlateaus, 1);
assert.equal(analyze(repeated).monthly.possiblePlateaus, 0, 'Inactive exercises are not new plateaus this month');
repeated.sessions.push(workout(8, [set(5, 11)]));
assert.equal(first(repeated).sessionsWithoutImprovement, 0);
assert.equal(first(repeated).status, 'Progressing');

// H: high reps contribute to facts and PRs but never fabricate an estimate.
const h = data([workout(1, [set(5, 16)]), workout(2, [set(5, 20)])]);
result = first(h);
assert.equal(result.currentE1RM, null);
assert.equal(result.sessions[1].sessionVolume, 100);
assert.ok(result.prHistory.some(p => p.type === 'reps' && p.value === 20));
assert.equal(calculateE1RM(5, 20), null);
assert.equal(calculateE1RM(5, 11).confidence, 'low');
assert.equal(calculateE1RM(5, 10).confidence, 'normal');
assert.equal(calculateE1RM(-5, 10), null);
assert.equal(calculateE1RM(Number.MAX_VALUE, 15), null);

// A failed load attempt is not an established load; reductions are not hidden by bests.
const changed = data([workout(1, [set(5, 10)]), workout(2, [set(7.5, 4)])]);
assert.equal(first(changed).currentLoad, 5);
assert.equal(first(changed).loadMilestones.length, 1);
changed.sessions.push(workout(3, [set(7.5, 8)]), workout(4, [set(5, 8)]));
result = first(changed);
assert.equal(result.currentLoad, 5);
assert.equal(result.highestLoad, 7.5);
assert.ok(result.currentE1RM < result.bestE1RM);
assert.ok(result.estimatedStrengthChangePercent < 0);

// Skip malformed/incomplete/deleted/warmup/zero sets without losing valid partial data.
const invalid = data([workout(1, [set(5, 10)])]);
invalid.sessions[0].sets.push(null, { ...invalid.sessions[0].sets[0], id: 'bad1', reps: 0 },
  { ...invalid.sessions[0].sets[0], id: 'bad2', weight: -1 },
  { ...invalid.sessions[0].sets[0], id: 'bad3', completedAt: '' },
  { ...invalid.sessions[0].sets[0], id: 'bad4', isWarmup: true },
  { ...invalid.sessions[0].sets[0], id: 'bad5', deleted: true },
  { ...invalid.sessions[0].sets[0], id: 'bad6', techniqueValid: false },
  { ...invalid.sessions[0].sets[0], id: 'bad7', reps: NaN });
assert.equal(analyze(invalid).overall.validSets, 1);
assert.ok(formatWorkoutAIExport(invalid, today).includes('PROGRESS ANALYSIS JSON'), 'Malformed sets must not block analysis export');
invalid.sessions[0].status = 'partial';
assert.equal(first(invalid).sessionCount, 1);
assert.equal(analyze(invalid).overall.workoutsCompleted, 0);
invalid.sessions[0].exercises[0].status = 'skipped';
assert.equal(first(invalid).sessionCount, 0);

// Distinct IDs never merge; shared plans never duplicate exercise histories.
const row = exercise('row');
const overall = data([workout(1, [set(5, 10)]), workout(2, [set(6, 10)]), workout(1, [set(5, 10)], row), workout(2, [set(6.5, 10)], row)], [exercise(), row]);
overall.plans.push({ id: 'B', name: 'Plan B', exerciseIds: overall.plans[0].exerciseIds });
near(analyze(overall).overall.estimatedStrengthChangePercent, (Math.sqrt(1.2 * 1.3) - 1) * 100);
assert.equal(analyze(overall).exercises.length, 2);
assert.equal(analyzeProgress(overall, '2026-09-30').monthly.exercisesImproved, 2);
overall.exercises[0].name = 'Renamed press';
assert.equal(first(overall).sessionCount, 2);
overall.exercises[0].trackingType = 'reps';
assert.equal(first(overall).sessionCount, 0, 'Changed tracking snapshots cannot contaminate metrics');

// Unrelated workouts do not inflate exercise-session time-to-load.
const milestones = structuredClone(a);
milestones.exercises.push(row);
milestones.sessions.push(workout(7, [set(5, 10)], row), workout(8, [set(5, 10)], row), workout(25, [set(10, 8)]));
result = first(milestones);
assert.equal(result.loadMilestones[1].sessions, 3);
assert.equal(result.loadMilestones[2].sessions, 1);
near(result.averageDaysPerLoadIncrease, 12);
near(result.averageSessionsPerLoadIncrease, 2);

// Weighted time remains a same-load duration metric, not Epley or weight*duration strength.
const hold = exercise('hold', 'weight_time');
const weightedTime = data([workout(1, [{ weight: 5, durationSeconds: 30 }], hold), workout(2, [{ weight: 10, durationSeconds: 15 }], hold)], [hold]);
assert.equal(first(weightedTime).durationChange, null);
assert.equal(first(weightedTime).currentE1RM, null);

// Stable, deterministic derived data and export parity; no history mutation.
const before = JSON.stringify(a);
const expected = analyze(a);
assert.deepEqual(analyze({ ...a, sessions: [...a.sessions].reverse() }), expected);
assert.equal(JSON.stringify(a), before);
const exported = formatWorkoutAIExport({ data: a }, today);
const exportedAnalysis = JSON.parse(exported.split('=== PROGRESS ANALYSIS JSON ===\n')[1].split('\n\n=== RAW HISTORY SUMMARY CSV ===')[0]);
assert.deepEqual(exportedAnalysis, expected);
assert.ok(exported.includes('reps_in_reserve_user_reported'));
assert.ok(exported.includes('RAW WORKOUT JSON'));
assert.equal(JSON.stringify(a), before);
const archived = structuredClone(a);
archived.exercises = [];
archived.sessions.at(-1).exercises[0].nameSnapshot = 'Renamed historical exercise';
assert.equal(first(archived).exerciseName, 'Renamed historical exercise');
assert.deepEqual(analyze({ ...archived, sessions: [...archived.sessions].reverse() }), analyze(archived));

// New months compare to prior valid history, and count improving exercise IDs once.
const monthly = structuredClone(a);
monthly.sessions[3].startedAt = '2026-10-02T12:00:00Z';
monthly.sessions[3].endedAt = '2026-10-02T12:30:00Z';
let monthResult = analyzeProgress(monthly, '2026-10-31').monthly;
assert.equal(monthResult.exercisesImproved, 1);
assert.equal(monthResult.loadIncreases, 1);
assert.equal(monthResult.workoutsCompleted, 1);
assert.equal(analyzeProgress(monthly, '2026-09-30').monthly.loadIncreases, 0);

// Partial coverage at different weights is not mastery, nor are too few sets.
const mixed = data([workout(1, [set(5, 12), set(7.5, 12), set(7.5, 12)])]);
assert.equal(first(mixed).nextTarget.repRangeMastered, false);
mixed.sessions[0].sets = mixed.sessions[0].sets.slice(1);
assert.equal(first(mixed).nextTarget.repRangeMastered, false);
console.log('PASS Gym analysis A-H, invalid data, RIR, equipment, milestones, monthly metrics, geometric mean, identity, determinism and complete AI-export parity');
