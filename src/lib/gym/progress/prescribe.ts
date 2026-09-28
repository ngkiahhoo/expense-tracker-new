import type { PrescriptionOptions, PrescriptionSetTarget, WorkoutPrescription } from "./prescription-types";
import type { ProgressSet, SessionPerformance, Targets, TrackingType } from "./types";

const DAY = 86_400_000;
const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const count = (n: unknown): n is number => positive(n) && Number.isInteger(n);
const validRir = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 4;
const weighted = (type: TrackingType) => type === "weight_reps" || type === "weight_time";
const timed = (type: TrackingType) => type === "time" || type === "weight_time";
function dateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const stamp = Date.parse(key);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === key ? key : null;
}
function normalizeTarget(target: Targets): Targets {
  const repMin = count(target?.repMin) ? target.repMin : 8;
  return {
    sets: count(target?.sets) && target.sets <= 100 ? target.sets : 3,
    repMin,
    repMax: Math.max(repMin, count(target?.repMax) ? target.repMax : 12),
    duration: positive(target?.duration) ? target.duration : null,
    durationMin: positive(target?.durationMin) ? Math.min(target.durationMin, positive(target.duration) ? target.duration : target.durationMin) : null,
  };
}

type ObservedSession = {
  source: SessionPerformance;
  date: string;
  sets: ProgressSet[];
  load: number | null;
  techniqueIssue: boolean;
  failure: boolean;
  finalRir: number | null;
};

function observe(session: SessionPerformance, type: TrackingType): ObservedSession | null {
  const date = dateKey(session?.sessionDate);
  if (!date || !session?.sessionId || !Array.isArray(session.validSets)) return null;
  const raw = session.validSets.filter(s => s && !s.deleted && !s.isWarmup);
  const techniqueIssue = raw.some(s => s.techniqueValid === false)
    || (session as SessionPerformance & { techniqueIssue?: boolean }).techniqueIssue === true;
  const ids = new Set<string>();
  const slots = new Map<number, ProgressSet>();
  for (const set of [...raw].sort((a, b) => String(a.completedAt).localeCompare(String(b.completedAt)))) {
    if (!set.id || ids.has(set.id) || !count(set.setNumber) || !dateKey(set.completedAt)
      || set.techniqueValid === false || (weighted(type) && !positive(set.weight))
      || (timed(type) ? !positive(set.durationSeconds) : !count(set.reps))) continue;
    ids.add(set.id);
    // A duplicate set slot cannot turn a partial workout into a full workout.
    slots.set(set.setNumber, set);
  }
  const sets = [...slots.values()].sort((a, b) => a.setNumber - b.setNumber);
  if (!sets.length) return null;
  const counts = new Map<number, number>();
  if (weighted(type)) for (const set of sets) counts.set(set.weight!, (counts.get(set.weight!) ?? 0) + 1);
  // A heavy top set must not become the assumed load for every working set.
  // Ties select the lower observed load rather than an optimistic maximum.
  const load = weighted(type) ? [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0] : null;
  const final = sets.at(-1)!;
  const finalRir = validRir(final.repsInReserve) ? final.repsInReserve
    : validRir(session.repsInReserve) ? session.repsInReserve : null;
  return { source: session, date, sets, load, techniqueIssue,
    failure: raw.some(s => s.repsInReserve === 0) || session.repsInReserve === 0,
    finalRir };
}

function fullAtLoad(session: ObservedSession, target: Targets, type: TrackingType, load: number | null) {
  const originalSets = normalizeTarget(session.source.targets).sets;
  const requiredSets = Math.max(originalSets, target.sets);
  return session.sets.length >= requiredSets && !session.techniqueIssue
    && Array.from({ length: requiredSets }, (_, i) => session.sets.find(s => s.setNumber === i + 1))
      .every(s => !!s && (!weighted(type) || s.weight === load));
}

function summary(sets: PrescriptionSetTarget[], type: TrackingType) {
  const values = sets.map(s => timed(type) ? s.durationSeconds : s.reps);
  if (values.some(v => v === null)) return "Establish a comfortable baseline";
  const repeats = new Set(values).size === 1;
  const work = repeats ? `${sets.length} × ${values[0]}` : values.join(" / ");
  const unit = timed(type) ? "sec" : "reps";
  const load = weighted(type) && sets[0]?.weight !== null ? `${sets[0].weight}kg · ` : "";
  return `${load}${work} ${unit}`;
}

/**
 * Shared, deterministic prescription policy; no 1RM-to-working-load conversion.
 * ACSM 2026 supports individualized progressive resistance training, sufficient
 * effort and no requirement to train to failure (doi:10.1249/MSS.0000000000003897).
 * +1 total rep/second, two full confirmations and a <=10% equipment step are
 * conservative application rules, not a validated prediction of today's ability.
 * The historical 2009 ACSM 2–10% guidance is context, not a universal algorithm.
 */
export function prescribeWorkout(
  type: TrackingType,
  sessions: SessionPerformance[],
  rawTarget: Targets,
  availableLoads: number[],
  asOfDate?: string,
  options: PrescriptionOptions = {},
): WorkoutPrescription {
  const target = normalizeTarget(rawTarget);
  const loads = Array.isArray(availableLoads) ? [...new Set(availableLoads.filter(positive))].sort((a, b) => a - b) : [];
  const asOf = dateKey(asOfDate);
  const bySession = new Map<string, ObservedSession>();
  for (const session of Array.isArray(sessions) ? sessions : []) {
    const observation = observe(session, type);
    if (observation && (!asOf || observation.date <= asOf)) bySession.set(session.sessionId, observation);
  }
  const history = [...bySession.values()].sort((a, b) => a.date.localeCompare(b.date));
  const latest = history.at(-1);
  const effort = timed(type)
    ? "End the hold before position or breathing breaks down; the time is a target, not a failure test."
    : "Aim to finish with 2–3 good reps left (RIR). Stop earlier if form breaks; never force a target rep.";
  const rest = timed(type)
    ? "Rest about 2 minutes between working sets; take longer if you have not recovered."
    : "Rest 2–3 minutes between working sets; keep rest and technique consistent for comparisons.";
  const firstReps = type === "reps" && options.zeroBaseline ? 1 : target.repMin;
  const base: WorkoutPrescription = {
    kind: "first_session", action: "establish", label: "Establish a baseline",
    reason: "No comparable saved working sets. Choose a comfortable starting effort and record what you actually complete.",
    weight: null, reps: timed(type) ? null : firstReps, durationSeconds: timed(type) ? target.durationMin ?? target.duration : null,
    repRangeMastered: false, progressCurrent: null, progressTarget: timed(type) ? target.duration : target.repMax,
    confidence: "insufficient", effort, rest,
    setTargets: Array.from({ length: target.sets }, (_, i) => ({ setNumber: i + 1, weight: null,
      reps: timed(type) ? null : firstReps, durationSeconds: timed(type) ? target.durationMin ?? target.duration : null, provisional: true })),
    basis: ["Targets are adjustable attempts, not guaranteed performance or measured strength."],
  };
  if (!latest) {
    if (options.zeroBaseline && type === "reps") {
      base.reason = "You have logged a zero-rep attempt. Try one controlled rep per set; use assistance or an easier variation if needed and log the actual result.";
      base.label = "Work toward your first controlled rep";
    } else if (weighted(type)) {
      base.reason = `No load baseline: choose a weight you can control for about ${timed(type) ? "a comfortable hold" : `${target.repMin} reps`} without reaching failure. No starting kg is inferred.`;
    } else if (timed(type) && target.duration === null) {
      base.reason = "Record a comfortable first hold, ending before position breaks. No duration is inferred without a plan goal or previous hold.";
    }
    if (options.techniqueIssue) base.reason = "The latest recorded attempt had a technique issue. Use an easier controlled effort and record a new baseline before progressing.";
    return base;
  }

  const relevant = latest.sets.filter(s => !weighted(type) || s.weight === latest.load);
  const valueOf = (set: ProgressSet) => timed(type) ? set.durationSeconds! : set.reps!;
  const floor = Math.min(...relevant.map(valueOf));
  const limit = timed(type) ? target.duration : target.repMax;
  const cap = (value: number) => limit === null ? value : Math.min(value, limit);
  const setTargets: PrescriptionSetTarget[] = Array.from({ length: target.sets }, (_, i) => {
    const observed = relevant.find(s => s.setNumber === i + 1);
    const value = cap(observed ? valueOf(observed) : floor);
    return { setNumber: i + 1, weight: latest.load, reps: timed(type) ? null : value,
      durationSeconds: timed(type) ? value : null, provisional: !observed };
  });
  const full = fullAtLoad(latest, target, type, latest.load);
  const previous = history.at(-2);
  const effortKnown = latest.finalRir !== null;
  const basis = [
    `Baseline: ${latest.date}, ${relevant.length} working set${relevant.length === 1 ? "" : "s"}${latest.load === null ? "" : ` at ${latest.load}kg`}.`,
    timed(type) ? "Hold quality and effort are not inferred from duration alone." : effortKnown ? `Last working set: ${latest.finalRir === 4 ? "4+" : latest.finalRir} reps left (self-reported).` : "Reps left were not recorded; effort is unknown.",
    "A repeat is useful training. Progress is not required at every workout.",
  ];
  const common: WorkoutPrescription = { ...base, kind: "repeat", action: "repeat", setTargets,
    weight: latest.load, reps: setTargets[0].reps, durationSeconds: setTargets[0].durationSeconds,
    label: summary(setTargets, type), reason: "Repeat your last working-set targets with controlled technique.",
    progressCurrent: floor, confidence: full && effortKnown && history.length >= 2 ? "normal" : "low", basis };
  const finish = (patch: Partial<WorkoutPrescription> = {}): WorkoutPrescription => {
    const result = { ...common, ...patch };
    result.label = patch.label ?? summary(result.setTargets, type);
    result.weight = result.setTargets[0]?.weight ?? null;
    result.reps = result.setTargets[0]?.reps ?? null;
    result.durationSeconds = result.setTargets[0]?.durationSeconds ?? null;
    return result;
  };

  if (options.techniqueIssue || latest.techniqueIssue) return finish({ reason: "The latest workout included a technique issue. Repeat with clean form, reducing the load or difficulty if needed; do not add work today." });
  if (options.failedAttempt) return finish({ action: "rebuild", confidence: "low", reason: "Your latest attempt included zero completed reps or seconds. These are earlier reference targets, not a new progression. Use an easier load or variation and record a controlled baseline before adding work." });
  if (options.feedback?.pain === "limiting" || options.feedback?.technique === "poor") return finish({ action: "rebuild", confidence: "low", reason: "Your feedback reported limiting pain or poor technique. Do not progress this exercise from that session; use an easier variation or stop and review the movement." });
  const daysSince = asOf ? Math.round((Date.parse(asOf) - Date.parse(latest.date)) / DAY) : 0;
  if (daysSince >= 21) return finish({ action: "rebuild", confidence: "low", reason: `It has been ${daysSince} days since this exercise. Treat these as previous reference targets: restart comfortably, reduce the load if needed, and rebuild a current baseline before progressing.`, basis: [...basis, "The 21-day review threshold is an app precaution, not a predicted amount of strength loss."] });
  if (weighted(type) && !loads.includes(latest.load!)) {
    // Never silently substitute an unsupported heavier load or convert ability.
    return finish({ kind: "configure_loads", action: "configure_equipment", confidence: "low",
      setTargets: setTargets.map(s => ({ ...s, weight: null, provisional: true })),
      reason: `The recorded ${latest.load}kg load is not in your configured equipment. Confirm the equipment, or choose a comfortable available load and establish its baseline; no replacement kg is inferred.` });
  }
  if (!full) return finish({ confidence: "low", reason: latest.sets.some(s => weighted(type) && s.weight !== latest.load)
    ? "The last workout used mixed loads. Use the most repeated working load; unobserved sets are provisional. Establish a full consistent baseline before adding reps or load."
    : `The last workout does not establish all ${target.sets} planned working sets at this load. Repeat recorded targets; missing sets use your lowest observed performance as a provisional attempt. Complete the planned sets before adding more work.` });

  if (!timed(type) && weighted(type) && previous && fullAtLoad(previous, target, type, latest.load)
    && latest.sets.slice(0, target.sets).some(s => s.reps! < target.repMin)
    && previous.sets.slice(0, target.sets).some(s => s.reps! < target.repMin)) {
    const lower = loads.filter(load => load < latest.load!).at(-1);
    if (lower !== undefined) return finish({ action: "reduce_load", confidence: "low",
      setTargets: setTargets.map(s => ({ ...s, weight: lower, reps: Math.min(target.repMin, floor), provisional: true })),
      reason: `Two full workouts fell below the ${target.repMin}-rep lower target. Try the next lighter available load (${lower}kg) at the recorded lower rep count and rebuild with 2–3 reps left; this is a reset, not an exact capacity prediction.` });
  }
  if (latest.failure) return finish({ reason: "A working set reached 0 reps left (failure). Repeat the targets only while you can keep good form and leave reps in reserve; do not add reps or load today." });
  if (!timed(type) && latest.sets.some(s => s.repsInReserve === 1)) return finish({ reason: "A working set finished with only 1 good rep left. Repeat the recorded targets without adding work; reduce the effort if needed to keep 2–3 good reps in reserve." });

  if (timed(type)) {
    if (target.duration === null) return finish({ reason: "Repeat your recorded durations. Set a duration ceiling in your plan before the app adds time." });
    const weakest = setTargets.reduce((index, s, i) => s.durationSeconds! <= setTargets[index].durationSeconds! ? i : index, 0);
    if (setTargets[weakest].durationSeconds! >= target.duration) return finish({ reason: "All planned holds reached the duration ceiling. Repeat with steady technique; choose a harder variation separately when comfortable. The app does not automatically extend every hold or increase load." });
    const next = setTargets.map((s, i) => i === weakest ? { ...s, durationSeconds: Math.min(target.duration!, s.durationSeconds! + 1) } : s);
    return finish({ kind: "duration", action: "add_time", setTargets: next,
      reason: `Try 1 extra second on set ${weakest + 1}; repeat the other holds. This is the timer's smallest step, bounded by your ${target.duration}-second plan ceiling, not a physiological prediction.` });
  }

  const mastered = latest.sets.slice(0, target.sets).every(s => s.reps! >= target.repMax);
  if (mastered) {
    common.repRangeMastered = true;
    if (!weighted(type)) return finish({ reason: `All ${target.sets} sets reached ${target.repMax} reps. Repeat clean reps, or intentionally choose a harder variation and establish a new baseline; the app will not add reps indefinitely.` });
    if (!previous || !fullAtLoad(previous, target, type, latest.load)
      || !previous.sets.slice(0, target.sets).every(s => s.reps! >= target.repMax) || previous.failure) {
      return finish({ reason: `Confirm all ${target.sets} sets at ${target.repMax} reps in a second consecutive workout before increasing load. Record reps left on the final set; aim for 2–3.` });
    }
    if (latest.finalRir === null || previous.finalRir === null) return finish({ confidence: "low", reason: "The rep ceiling is repeated, but effort is unknown. Record how many good reps were left on the final set; load increases need two full ceiling workouts with at least 2 reps left." });
    if (latest.finalRir < 2 || previous.finalRir < 2) return finish({ reason: "The ceiling sets were close to failure. Repeat until two full ceiling workouts each finish with at least 2 good reps left before increasing load." });
    const nextLoad = loads.find(load => load > latest.load!);
    if (nextLoad === undefined) return finish({ kind: "equipment_limit", reason: "You have repeated the rep ceiling with effort in reserve, but there is no heavier configured load. Repeat this load, add suitable equipment, or intentionally choose a harder variation." });
    if (nextLoad > latest.load! * 1.1 + 1e-9) return finish({ kind: "equipment_limit", reason: `The next available load (${nextLoad}kg) is more than 10% heavier. Repeat these sets and configure smaller increments; the app does not prescribe this jump.` });
    return finish({ kind: "increase_load", action: "increase_load",
      setTargets: setTargets.map(s => ({ ...s, weight: nextLoad, reps: target.repMin, provisional: true })),
      reason: `Two full workouts reached ${target.repMax} reps per set with at least 2 reps left. Try ${nextLoad}kg at ${target.repMin} reps per set; return to the old load if technique or effort deteriorates.`,
      basis: [...basis, "Two-session confirmation and the 10% step cap are conservative app policies; they do not guarantee the new load is suitable."] });
  }
  const weakest = setTargets.reduce((index, s, i) => s.reps! <= setTargets[index].reps! ? i : index, 0);
  const next = setTargets.map((s, i) => i === weakest ? { ...s, reps: Math.min(target.repMax, s.reps! + 1) } : s);
  return finish({ kind: "reps", action: "add_rep", setTargets: next,
    reason: `Try 1 extra rep on set ${weakest + 1}; repeat the other sets. That is only 1 extra rep across the workout. Keep 2–3 good reps in reserve and stop below the target if needed.`,
    basis: [...basis, "Adding one total rep to the weakest set is the app's conservative double-progression rule, not an exact prediction."] });
}
