# Gym progress calculations

Workout records, exercise IDs, logged weights and the Epley formula are unchanged.
Analytics are derived and memoized by the existing Gym page; no persisted PR records
or workout migration is needed.

## Equipment

`progressSettings.plateInventory` is optional and defaults to the owner's inventory:
1.25kg × 4, 2.5kg × 4, 3kg × 8. Existing settings remain readable. The legacy
`availableLoads` field is retained for compatibility but recommendations derive from
inventory. Saving equipment writes inventory and a derived compatibility list.

Divide plates equally across two dumbbells, then use matching pairs on either side.
Four plates of a size are required to add one pair per dumbbell. Spare plates are
excluded. Duplicate inventory rows are combined. Calculations use integer grams;
handles are excluded, including for single-dumbbell exercises.

The supplied expected list contained a mathematical error: subset sums of
`[2.5, 5, 6, 6]` cannot produce 10kg or 16kg. The verified list is:

`2.5, 5, 6, 7.5, 8.5, 11, 12, 13.5, 14.5, 17, 19.5 kg`

Thus 8.5 advances to 11, and 14.5 advances to 17. These jumps are equipment
constraints, not a promise of readiness. Recommendations preserve the existing
all-working-sets mastery rule and the conservative repeat recommendation for
reported final-set RIR 0. The progress bar uses the weakest set at the working load.
An unsupported historical load remains untouched; its next recommendation uses
an available load at or below it (or the minimum load if none is lower).

## Progress and confidence

Epley remains weight × (1 + reps / 30), valid for 1–15 reps; 11–15 reps retain
lower confidence. Reps-only and duration exercises never use e1RM.

Overall strength is the median of normalized per-exercise changes, capped at
−50%/+50% for aggregation only, with at least two comparable exercises.
Individual exercise percentages are not capped. The early label stays until
14 days of training and at least three eligible sessions in each contributing
exercise. One-session baselines are not shown as 0% progress.

Latest-workout feedback uses the most recent completed workout, compares only
identical exercise IDs/tracking types, and compares reps/duration only at the same
load. Partial workouts retain their existing contribution to detailed analytics.
Headline PR counts count one exercise/workout achievement; detailed PR categories
remain available. Recent achievement chooses the newest record date, then first
bodyweight rep, load, estimated strength, reps/duration, volume. An explicit zero
attempt supports a first-pull-up milestone without a percentage from zero.

Exercise status reports no recent data after 21 days. Current plan targets still
take precedence over historical targets; if multiple plans share an exercise, the
first plan supplies the next target, preserving existing behavior.

## Verification

`npm run test:gym-progress` covers equipment subset sums/transitions, mastery,
same-load reps, baselines, zero attempts, completed-workout feedback, PR counts,
robust aggregation, invalid records, identity, immutability and export parity.
`scripts/gym-progress-browser-check.mjs` uses isolated browser fixtures and mocked
cloud traffic; it never seeds application or production workout history.
