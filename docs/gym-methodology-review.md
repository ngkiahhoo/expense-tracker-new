# Gym recommendation and reporting review

Reviewed 2026-09-28. This document separates scientific evidence from the app's
implementation policy. It is a design and regression-test contract, not a claim
that an algorithm can measure readiness, strength, recovery, or muscle growth.

## Implemented behavior

- `prescribe.ts` is the shared pure prescription engine. `calculate.ts` supplies
  cleaned, chronologically ordered history, the selected plan and per-exercise
  equipment. The workout adapter uses the plan snapshot and history before its
  start; the export includes both the selected Progress plan and active targets.
- A full 10/9/8 baseline becomes an attempt at 10/9/9 at the same load. Missing
  sets remain provisional. Mixed loads use the most repeated load (lower load
  wins a tie) and request a consistent baseline before progressing.
- Load increases require two consecutive complete ceiling performances at the
  same working load, with at least two good reps reported in reserve on the
  final set of each, and no failed set/technique. The next configured plate
  increment must be at most 10%. Otherwise the app gives a concrete repeat,
  effort-recording or equipment instruction. Missing effort is unknown.
- A reported 0 or 1 rep in reserve prevents adding reps. Two complete exposures
  below the planned lower bound can prompt the next lighter available load.
  After 21 days without a record, old results become rebuild references; the
  app never fabricates a percentage of lost strength. These are app policies.
- Timed work starts at the lower planned bound when available. With a complete
  baseline it adds one second to one lowest-duration set, bounded by the plan
  ceiling. Duration is not a strength score and does not automatically add load.
- The UI gives each set's target, an explicit prefill action and an optional
  reps-left field. Actual logged results stay separate. Bulk completion records
  the visible actual values for all remaining sets and never invents RIR.
- Progress leads with total reps/time at matching set positions and loads.
  Best-set records, volume and load milestones remain labeled factual records.
  The Epley formula is secondary, low-confidence, and never a strength PR or
  target driver. Plateau thresholds are review reminders, not diagnoses.
- Known built-in Goblet Squat and One-Arm Dumbbell Row entries default to one
  dumbbell. Other missing setup values default conservatively to a pair; users
  can change the setup in the exercise library. Historical weights are untouched.

## Verification completed

`npm run test:gym-progress` runs legacy analysis/export coverage plus 109 pure
prescription assertions, equipment enumeration, and the report integration
suite. Integration cases cover weaker-set progress, declining totals despite a
best-set PR, extra sets without a strength claim, invalid technique, partial
workouts, duplicate slots, single-dumbbell loads, selected-plan export parity
and active-workout target parity. TypeScript and targeted ESLint pass.

The browser suite verifies dark/light views at 360/440/1440 pixels, contrast,
navigation, target placement and prefill, optional effort recording/reset,
deletion stability, empty history and clipboard export. It uses isolated
fixture data and mocked remote storage rather than real workout writes.

## Scientific basis

The **2026 ACSM Position Stand** updates the 2009 statement. It synthesizes 137
systematic reviews and supports progressive resistance training, consistency,
and programming that matches the person's goal. Training to momentary failure
and complicated periodization did not consistently improve outcomes across the
reviewed evidence. This supports a simple progression policy without requiring
failure on every set; it does not validate a precise next-session prediction.
Sources: [ACSM announcement](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/),
[ACSM summary](https://acsm.org/resistance-training-guidelines-update-2026/),
[position stand](https://doi.org/10.1249/MSS.0000000000003897).

The **2009 ACSM progression rule** recommends increasing load by 2–10% when the
person exceeds the prescribed repetitions by 1–2 in two consecutive sessions.
Smaller muscle exercises generally use smaller increments. The abstract omits
the two-session detail, but the full text includes it. A rule that requires all
planned sets at the top of a range twice is an app adaptation, not the identical
ACSM rule or a scientifically proven optimal trigger.
Sources: [abstract](https://pubmed.ncbi.nlm.nih.gov/19204579/),
[ACSM-hosted full Chinese translation, page 5](https://acsm.org/wp-content/uploads/2025/01/Progression-Models-in-Resistance-Training-for-Healthy-Adults-Simplified.pdf).

A randomized **2022 progression trial** found both increasing repetitions and
increasing load viable over eight weeks in 43 trained adults performing lower
body exercise. It supports progressing repetitions when equipment increments
are unavailable. It does not prove that exactly one extra total repetition,
one particular set allocation, or a fixed schedule is optimal for this user.
Source: [Plotkin et al.](https://pubmed.ncbi.nlm.nih.gov/36199287/).

Repetition-based 1RM equations depend on the test and number of repetitions;
validation in one exercise and population is not universal. RIR is also a
subjective estimate: a primary study found estimates more accurate near failure
than far from failure. Neither a logged rep count nor a missing RIR field shows
the user's maximum capacity.
Sources: [1RM equation validation](https://pubmed.ncbi.nlm.nih.gov/12741856/),
[RIR accuracy study](https://pubmed.ncbi.nlm.nih.gov/27787474/).

## Findings from the original implementation

- Selecting the heaviest single set and best rep count could turn a failed heavy
  attempt into the next working load or ask all sets to match one best set.
- A single successful session could trigger load progression. Extra sets,
  changed prescriptions, active workouts, and missing effort data were not
  adequate evidence of repeated mastery.
- Reps-only targets increased the best set indefinitely; duration targets could
  jump directly from the last result to a distant plan maximum.
- A plateau label was inferred from a small fixed number of sessions without a
  PR. That cannot diagnose a plateau when effort, rest, exercise order, body
  weight, and program intent are unknown.
- Epley estimates from ordinary sets were displayed as strength changes. An
  overall median, especially with arbitrary percentage clipping, adds apparent
  precision without becoming a validated measure of whole-body strength.
- Every exercise reserved plates for two simultaneous dumbbells. This wrongly
  rejected physically available single-dumbbell loads, including Goblet Squat.

## Recommendation contract

1. Use one deterministic engine for Progress and today's workout, with today's
   exact plan snapshot. Freeze history at workout start so new sets cannot
   increase the current workout's targets. Do not pick an unrelated plan merely
   because it appears first in an array.
2. Give a working load and a target for each planned set. Use comparable working
   sets and preserve demonstrated fatigue differences between sets. A minimal
   rep increment across the session is a transparent product policy. Do not
   multiply one extra rep by every set silently.
3. Require repeated, complete performance at the same working load and compatible
   prescription before suggesting more load. Active, abandoned, deleted,
   warmup, failed-technique, or incomplete evidence must not establish mastery.
4. Missing RIR means unknown, not failure and not proven reserve. A reported
   failure should prevent automatic escalation. An effort cue such as leaving
   approximately two good reps is a practical coaching default, not a sensor
   measurement. Users should not have to perform a failed rep to satisfy a goal.
5. Initial weight requires a familiarization set or an actual prior record; the
   app cannot infer a safe personal starting weight from the exercise name.
   After a long gap or plan change, rebuild comparable evidence instead of
   assuming the prior progression trend continues.
6. For bodyweight exercises, keep progression within the configured rep range;
   at the ceiling, recommend a deliberately selected harder variation. Do not
   invent bodyweight kilograms. For holds, do not invent a percentage-based
   seconds increase or assume more time equals more strength. Repeating a hold
   while improving execution is legitimate; a changed hold goal is explicit.
7. If equipment cannot make a small increment, provide a concrete repeat target
   and explain the equipment constraint. Do not prescribe an unsupported load,
   silently jump upward to the lightest available load, or guarantee that slower
   tempo is equivalent to increasing resistance.

The exact +1-rep allocation, two-session confirmation policy, 10% increment cap,
stale-history window, and reset rules are engineering choices. They should be
documented and tested, never advertised as individually validated physiology.
Progressive overload is a process across training; improvement every workout is
neither required nor guaranteed.

## Equipment and measurement boundaries

`generateAvailableDumbbellLoads(inventory, dumbbellCount)` supports one dumbbell
or two matched dumbbells. A plate size needs two matching plates for one balanced
dumbbell, and four for a pair. The default remains two for legacy records with no
setup. Configure a single dumbbell explicitly; do not infer arbitrary custom
exercise equipment from its name.

With the default stock (1.25 kg × 4, 2.5 kg × 4, 3 kg × 8), a pair permits
2.5, 5, 6, 7.5, 8.5, 11, 12, 13.5, 14.5, 17, and 19.5 kg **per dumbbell**.
One dumbbell can use more of that stock, including 10 and 16 kg, up to 39 kg.
The generator assumes sufficient sleeve space and that plates fit the handles;
the inventory does not model those hardware constraints.

Existing weights are plate-only kilograms per dumbbell. Never rewrite them as
total resistance or double them for paired exercises. Because handles are
excluded, a percentage change in logged plates is not the percentage change in
total lifted resistance. A 10% plate-only cap is a conservative product cap,
not direct application of a physiological 10% total-load limit. Reps × logged
weight is a logging-volume metric, not mechanical work or strength. Historical
changes in handles, setup, range of motion, body weight, or assistance are not
recoverable if they were never recorded.

## Reporting and regression expectations

Lead with recorded facts: load, per-set reps/time, completed working sets, and
same-load comparisons. Keep completed-workout reports separate from live partial
records. A heavier low-rep attempt can be an observed load record without proving
greater strength or mastery. Extra sets can raise logged volume without proving
greater capacity. Epley, if retained, must be an explicitly limited estimate or
formula score, never the driver of today's load or a measured-strength verdict.

Minimum regression cases:

- Progress and workout targets agree for the same plan/history; current sets do
  not move today's goal, including deletion and reload.
- Per-set results such as 12/10/8 do not become 12/12/12 automatically. One heavy
  failed set does not override established working sets.
- One mastered workout does not satisfy two confirmations; active workouts,
  deleted sets, duplicated sets, skipped exercises, and changed plans cannot
  manufacture the second confirmation.
- RIR zero, missing RIR, missing earlier set numbers, mixed loads, time-only
  work, bodyweight ceilings, and stale history have explicit outcomes.
- No-history and unsupported-load cases never invent a heavier starting load.
- Two plates produce a single dumbbell, not a pair; odd spares, duplicate stock
  rows, decimal plate sizes, and legacy missing equipment setup are covered by
  `node scripts/gym-equipment-review-check.mjs`.
- Report and export share calculation results and units; a one-session baseline
  is not a 0% improvement, and training gaps are not diagnosed as plateaus.
