import { prescribeWorkout } from "./prescribe";
import { DEFAULT_PLATE_INVENTORY, generateAvailableDumbbellLoads } from "./equipment";
import type { Confidence, ExerciseProgress, PersonalRecord, ProgressAnalysis, ProgressExerciseOccurrence, ProgressInput, ProgressSet, SessionPerformance, Targets, TrackingType } from "./types";

const DAY = 86_400_000;
const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const count = (n: unknown): n is number => positive(n) && Number.isInteger(n);
const validDate = (s: unknown): s is string => typeof s === "string" && Number.isFinite(Date.parse(s));
const weighted = (t: TrackingType) => t === "weight_reps" || t === "weight_time";
const timed = (t: TrackingType) => t === "time" || t === "weight_time";
const percent = (current: number | null, baseline: number | null) => current !== null && baseline !== null && baseline > 0 ? (current / baseline - 1) * 100 : null;
const maxOrNull = (values: number[]) => values.length ? Math.max(...values) : null;

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarDays(start: string, end: string) {
  return Math.max(0, Math.round((Date.parse(end.slice(0, 10)) - Date.parse(start.slice(0, 10))) / DAY));
}

export function calculateE1RM(weight: number, reps: number): { value: number; confidence: Confidence } | null {
  if (!positive(weight) || !count(reps) || reps > 15) return null;
  const value = weight * (1 + reps / 30);
  return Number.isFinite(value) ? { value, confidence: reps > 10 ? "low" : "normal" } : null;
}

export function normalizeAvailableLoads(values: unknown): number[] {
  return Array.isArray(values) ? [...new Set(values.filter(positive))].sort((a, b) => a - b) : [];
}

function eligibleSet(set: ProgressSet) {
  return !!set && validDate(set.completedAt) && !set.deleted && !set.isWarmup && set.techniqueValid !== false;
}

export function isValidWorkSet(set: ProgressSet, type: TrackingType) {
  if (!eligibleSet(set)) return false;
  if (weighted(type) && !positive(set.weight)) return false;
  return timed(type) ? positive(set.durationSeconds) : count(set.reps);
}

function targets(sets?: number, repMin?: number, repMax?: number, duration?: number, durationMin?: number): Targets {
  const min = count(repMin) ? repMin : 8;
  return { sets: count(sets) ? sets : 3, repMin: min, repMax: Math.max(min, count(repMax) ? repMax : 12), duration: positive(duration) ? duration : null, durationMin: positive(durationMin) ? Math.min(durationMin, positive(duration) ? duration : durationMin) : null };
}

function compareSets(a: ProgressSet, b: ProgressSet, type: TrackingType) {
  return (weighted(type) ? (a.weight ?? 0) - (b.weight ?? 0) : 0)
    || (timed(type) ? (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0) : (a.reps ?? 0) - (b.reps ?? 0));
}

// A best set can stay unchanged while later sets improve. Compare the complete
// logged work only when set count and the load at every set position match.
// Extra sets and a different load are useful facts, but not this comparison.
function workSignature(session: SessionPerformance, type: TrackingType) {
  return session.validSets.map(set => `${set.setNumber}:${weighted(type) ? set.weight : 0}`).join("|");
}

function totalWork(session: SessionPerformance, type: TrackingType) {
  return session.validSets.reduce((sum, set) => sum + (timed(type) ? set.durationSeconds! : set.reps!), 0);
}

function compareWork(current: SessionPerformance, prior: SessionPerformance[], type: TrackingType): ExerciseProgress["workComparison"] {
  const signature = workSignature(current, type);
  const previous = prior.findLast(session => session.sessionId !== current.sessionId && workSignature(session, type) === signature);
  if (!previous) return null;
  const currentTotal = totalWork(current, type);
  const previousTotal = totalWork(previous, type);
  const loads = [...new Set(current.validSets.map(set => set.weight))];
  return {
    previousSessionId: previous.sessionId, previousDate: previous.sessionDate,
    setCount: current.validSets.length, load: weighted(type) && loads.length === 1 ? loads[0]! : null,
    unit: timed(type) ? "seconds" : "reps", previousTotal, currentTotal, change: currentTotal - previousTotal,
  };
}

function performance(input: ProgressInput, exerciseId: string, type: TrackingType, today: string) {
  const result: SessionPerformance[] = [];
  let zeroRepBaselineDate: string | null = null;
  for (const session of input.sessions ?? []) {
    if (!session || !validDate(session.startedAt) || session.status === "deleted") continue;
    const day = localDateKey(new Date(session.startedAt));
    if (day > today) continue;
    for (const occurrence of session.exercises ?? []) {
      if (!occurrence || occurrence.exerciseId !== exerciseId || occurrence.trackingTypeSnapshot !== type || occurrence.status === "skipped") continue;
      const raw = (session.sets ?? []).filter(s => s && s.workoutExerciseId === occurrence.id);
      if (type === "reps" && raw.some(s => eligibleSet(s) && s.reps === 0)) {
        if (!zeroRepBaselineDate || day < zeroRepBaselineDate) zeroRepBaselineDate = day;
      }
      const seen = new Set<string>();
      const seenSlots = new Set<number>();
      const sets = raw.filter(s => {
        if (!isValidWorkSet(s, type) || !s.id || !count(s.setNumber) || seen.has(s.id) || seenSlots.has(s.setNumber) || localDateKey(new Date(s.completedAt)) > today) return false;
        seen.add(s.id);
        seenSlots.add(s.setNumber);
        return true;
      }).sort((a, b) => a.setNumber - b.setNumber || a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id));
      if (!sets.length) continue;
      const target = targets(occurrence.plannedSetsSnapshot, occurrence.targetRepMin, occurrence.targetRepMax, occurrence.targetDurationMax ?? occurrence.targetDurationMin, occurrence.targetDurationMin);
      const bestRepsAtWeight: Record<string, number> = {};
      const bestDurationAtWeight: Record<string, number> = {};
      for (const set of sets) {
        const key = String(weighted(type) ? set.weight : 0);
        if (!timed(type)) bestRepsAtWeight[key] = Math.max(bestRepsAtWeight[key] ?? 0, set.reps!);
        else bestDurationAtWeight[key] = Math.max(bestDurationAtWeight[key] ?? 0, set.durationSeconds!);
      }
      const estimates = type === "weight_reps" ? sets.flatMap(s => {
        const e = calculateE1RM(s.weight!, s.reps!);
        return e ? [e] : [];
      }).sort((a, b) => b.value - a.value) : [];
      const establishedLoad = weighted(type) ? maxOrNull(sets.filter(s => timed(type)
        ? s.durationSeconds! >= (positive(occurrence.targetDurationMin) ? occurrence.targetDurationMin : target.duration ?? Infinity)
        : s.reps! >= target.repMin).map(s => s.weight!)) : null;
      const rir = sets.at(-1)?.repsInReserve;
      result.push({
        sessionId: session.id, occurrenceId: occurrence.id, sessionDate: day, exerciseId, targets: target, validSets: sets,
        techniqueIssue: raw.some(set => set && !set.deleted && !set.isWarmup && set.techniqueValid === false),
        highestWeight: weighted(type) ? Math.max(...sets.map(s => s.weight!)) : null,
        establishedLoad, bestRepsAtWeight, bestDurationAtWeight,
        bestSet: sets.reduce((best, s) => compareSets(s, best, type) > 0 ? s : best),
        sessionVolume: type === "weight_reps" ? sets.reduce((sum, s) => sum + s.weight! * s.reps!, 0) : null,
        // Routine work sets are not validated repetition-maximum tests. The
        // index also omits handle mass under the app's plate-only convention.
        sessionE1RM: estimates[0]?.value ?? null, e1rmConfidence: estimates.length ? "low" : "insufficient",
        repsInReserve: typeof rir === "number" && Number.isInteger(rir) && rir >= 0 && rir <= 4 ? rir : null,
      });
    }
  }
  const sessionTimes = new Map((input.sessions ?? []).filter(Boolean).map(s => [s.id, s.startedAt]));
  result.sort((a, b) => Date.parse(sessionTimes.get(a.sessionId)!) - Date.parse(sessionTimes.get(b.sessionId)!) || a.sessionId.localeCompare(b.sessionId) || a.occurrenceId.localeCompare(b.occurrenceId));
  if (zeroRepBaselineDate && result[0] && zeroRepBaselineDate > result[0].sessionDate) zeroRepBaselineDate = null;
  return { sessions: result, zeroRepBaselineDate };
}

export function getNextTarget(type: TrackingType, current: SessionPerformance | null, target: Targets, availableLoads: number[]) {
  return prescribeWorkout(type, current ? [current] : [], target, availableLoads);
}

// Use the same Progress engine, but the active workout's frozen plan targets.
// Today's unsaved sets must not move the goalposts while a workout is underway.
export function getWorkoutExerciseProgress(input: ProgressInput, session: { id: string; startedAt: string }, exercise: ProgressExerciseOccurrence): ExerciseProgress {
  const scopedInput: ProgressInput = {
    ...input,
    sessions: input.sessions.filter(item => item && item.id !== session.id && Date.parse(item.startedAt) < Date.parse(session.startedAt)),
    plans: [{ id: session.id, exerciseIds: [{
      exerciseId: exercise.exerciseId,
      targetSets: exercise.plannedSetsSnapshot,
      targetRepMin: exercise.targetRepMin,
      targetRepMax: exercise.targetRepMax,
      targetDurationMin: exercise.targetDurationMin,
      targetDurationMax: exercise.targetDurationMax,
    }] }],
  };
  const dumbbellCount = exercise.dumbbellCountSnapshot ?? input.exercises.find(item => item.id === exercise.exerciseId)?.dumbbellCount ?? 2;
  const loads = generateAvailableDumbbellLoads(input.progressSettings?.plateInventory ?? DEFAULT_PLATE_INVENTORY, dumbbellCount);
  return getExerciseProgress(scopedInput, { id: exercise.exerciseId, name: exercise.nameSnapshot, trackingType: exercise.trackingTypeSnapshot, dumbbellCount }, localDateKey(new Date(session.startedAt)), loads);
}

export function getProgressStatus(sessionCount: number, noImprovement: number): ExerciseProgress["status"] {
  if (sessionCount < 2) return "Building baseline";
  if (noImprovement >= 6) return "Possible plateau";
  if (noImprovement >= 4) return "Progress slowing";
  if (noImprovement >= 1) return "Stable";
  return "Progressing";
}

export function getExerciseStatus(e: ExerciseProgress, asOfDate: string): string {
  if (e.current && calendarDays(e.current.sessionDate, asOfDate) >= 21) return "No recent data";
  const next = e.nextTarget;
  if (next.kind === "equipment_limit") return "Equipment limit";
  if (next.kind === "increase_load") return "Ready to increase load";
  if (next.repRangeMastered) return "Rep range mastered";
  if (next.progressTarget !== null && next.progressCurrent !== null && next.progressTarget - next.progressCurrent === 1) return "Close to target";
  return e.status;
}

function getExerciseProgress(input: ProgressInput, exercise: ProgressInput["exercises"][number], today: string, availableLoads: number[]): ExerciseProgress {
  const { sessions, zeroRepBaselineDate } = performance(input, exercise.id, exercise.trackingType, today);
  const type = exercise.trackingType;
  const current = sessions.at(-1) ?? null;
  const baseline = sessions[0] ?? null;
  const bestRepsAtLoad: Record<string, number> = {};
  const bestDurations: Record<string, number> = {};
  const firstReps: Record<string, number> = {};
  const previousReps: Record<string, number> = {};
  const previousDurations: Record<string, number> = {};
  const loadMilestones: ExerciseProgress["loadMilestones"] = [];
  const prHistory: PersonalRecord[] = [];
  const improvementDates: string[] = [];
  const bestComparableWork = new Map<string, number>();
  let bestE1RM: number | null = null;
  let bestVolume: number | null = null;
  let highestLoad: number | null = null;
  let previousEstablishedLoad: number | null = null;
  let lastLoadIndex = 0;
  let lastImprovedSession = -1;
  const uniqueSessions = [...new Set(sessions.map(s => s.sessionId))];
  const completedSessionIds = new Set((input.sessions ?? []).filter(s => s?.status === "completed").map(s => s.id));
  const completedSessionOrder = uniqueSessions.filter(id => completedSessionIds.has(id));

  for (let index = 0; index < sessions.length; index++) {
    const session = sessions[index];
    let improved = false;
    let improvedFromPrevious = false;
    const addPR = (kind: PersonalRecord["type"], value: number, previousValue: number, load: number | null = null, set = session.bestSet) => {
      prHistory.push({ exerciseId: exercise.id, exerciseName: exercise.name, sessionId: session.sessionId, date: session.sessionDate, type: kind, value, previousValue, load, set });
    };
    if (session.establishedLoad !== null) {
      if (highestLoad === null || session.establishedLoad > highestLoad) {
        const previous = loadMilestones.at(-1);
        loadMilestones.push({ date: session.sessionDate, sessionId: session.sessionId, load: session.establishedLoad, previousLoad: highestLoad,
          days: previous ? calendarDays(previous.date, session.sessionDate) : null,
          sessions: previous ? new Set(sessions.slice(lastLoadIndex + 1, index + 1).filter(s => s.sessionId !== previous.sessionId).map(s => s.sessionId)).size : null,
          changePercent: percent(session.establishedLoad, highestLoad) });
        if (highestLoad !== null) {
          addPR("load", session.establishedLoad, highestLoad, session.establishedLoad, session.validSets.find(s => s.weight === session.establishedLoad && (timed(type) ? s.durationSeconds! >= (session.targets.duration ?? 0) : s.reps! >= session.targets.repMin)) ?? session.bestSet);
          improved = true;
        }
        highestLoad = session.establishedLoad;
        lastLoadIndex = index;
      }
      improvedFromPrevious ||= previousEstablishedLoad !== null && session.establishedLoad > previousEstablishedLoad;
      previousEstablishedLoad = session.establishedLoad;
    }
    // Epley's formula is a secondary index, not an observed strength PR.
    if (session.sessionE1RM !== null) bestE1RM = Math.max(bestE1RM ?? 0, session.sessionE1RM);
    for (const [load, reps] of Object.entries(session.bestRepsAtWeight)) {
      const previous = bestRepsAtLoad[load] ?? (type === "reps" && zeroRepBaselineDate ? 0 : undefined);
      if (previous !== undefined && reps > previous) {
        addPR(type === "reps" ? "bodyweight_reps" : "reps", reps, previous, weighted(type) ? Number(load) : null, session.validSets.find(s => s.reps === reps && (!weighted(type) || s.weight === Number(load)))!);
        improved = true;
      }
      improvedFromPrevious ||= (previousReps[load] !== undefined && reps > previousReps[load]) || (type === "reps" && !!zeroRepBaselineDate && index === 0);
      firstReps[load] ??= reps;
      bestRepsAtLoad[load] = Math.max(previous ?? 0, reps);
      previousReps[load] = reps;
    }
    for (const [load, duration] of Object.entries(session.bestDurationAtWeight)) {
      if (bestDurations[load] !== undefined && duration > bestDurations[load]) {
        addPR("duration", duration, bestDurations[load], weighted(type) ? Number(load) : null, session.validSets.find(s => s.durationSeconds === duration && (!weighted(type) || s.weight === Number(load)))!);
        improved = true;
      }
      improvedFromPrevious ||= previousDurations[load] !== undefined && duration > previousDurations[load];
      bestDurations[load] = Math.max(bestDurations[load] ?? 0, duration);
      previousDurations[load] = duration;
    }
    if (session.sessionVolume !== null) {
      if (bestVolume !== null && session.sessionVolume > bestVolume) addPR("volume", session.sessionVolume, bestVolume);
      bestVolume = Math.max(bestVolume ?? 0, session.sessionVolume);
    }
    if (completedSessionIds.has(session.sessionId)) {
      const signature = workSignature(session, type);
      const work = totalWork(session, type);
      const previousBest = bestComparableWork.get(signature);
      improved ||= previousBest !== undefined && work > previousBest;
      bestComparableWork.set(signature, Math.max(previousBest ?? 0, work));
      const comparison = compareWork(session, sessions.slice(0, index).filter(s => completedSessionIds.has(s.sessionId)), type);
      improvedFromPrevious ||= comparison !== null && comparison.change > 0;
      if (improved || lastImprovedSession < 0) lastImprovedSession = completedSessionOrder.indexOf(session.sessionId);
    }
    if (improvedFromPrevious || improved) improvementDates.push(session.sessionDate);
  }

  const estimates = sessions.filter(s => s.sessionE1RM !== null);
  const eligibleStrengthSessions = new Set(estimates.map(s => s.sessionId)).size;
  const baselineE1RM = estimates[0]?.sessionE1RM ?? null;
  const currentE1RM = estimates.at(-1)?.sessionE1RM ?? null;
  const currentLoad = sessions.findLast(s => s.establishedLoad !== null)?.establishedLoad ?? null;
  const currentMilestone = loadMilestones.find(m => m.load === currentLoad);
  const increases = loadMilestones.filter(m => m.previousLoad !== null);
  const currentRepsAtLoad = currentLoad !== null ? current?.bestRepsAtWeight[String(currentLoad)] ?? null : null;
  const startingMaxReps = type === "reps" ? zeroRepBaselineDate ? 0 : baseline?.bestSet.reps ?? null : null;
  const currentMaxReps = type === "reps" ? current?.bestSet.reps ?? (zeroRepBaselineDate ? 0 : null) : null;
  // Weighted holds compare duration only at the current weight, never across loads.
  const durationSessions = timed(type) ? sessions.filter(s => type === "time" || s.bestDurationAtWeight[String(current?.highestWeight)] !== undefined) : [];
  const durationAtLoad = (s: SessionPerformance) => s.bestDurationAtWeight[String(type === "time" ? 0 : current?.highestWeight)] ?? null;
  const startingBestDuration = durationSessions[0] ? durationAtLoad(durationSessions[0]) : null;
  const currentBestDuration = current && timed(type) ? durationAtLoad(current) : null;
  const allTimeBestDuration = maxOrNull(durationSessions.map(s => durationAtLoad(s)!).filter(positive));
  const targetPlan = input.plans?.find(p => p.exerciseIds?.some(item => item.exerciseId === exercise.id));
  const plan = targetPlan?.exerciseIds.find(item => item.exerciseId === exercise.id);
  const target = plan ? targets(plan.targetSets, plan.targetRepMin, plan.targetRepMax, plan.targetDurationMax ?? plan.targetDurationMin, plan.targetDurationMin) : current?.targets ?? targets();
  const latestRaw = [...input.sessions].filter(s => s && s.status !== "deleted" && validDate(s.startedAt) && localDateKey(new Date(s.startedAt)) <= today && s.exercises?.some(o => o && o.exerciseId === exercise.id && o.trackingTypeSnapshot === type && o.status !== "skipped"))
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)).at(-1);
  const occurrenceIds = new Set(latestRaw?.exercises.filter(o => o && o.exerciseId === exercise.id && o.trackingTypeSnapshot === type && o.status !== "skipped").map(o => o.id));
  const techniqueIssue = latestRaw?.sets.some(s => s && occurrenceIds.has(s.workoutExerciseId) && !s.deleted && !s.isWarmup && s.techniqueValid === false) ?? false;
  const failedAttempt = latestRaw?.sets.some(s => s && occurrenceIds.has(s.workoutExerciseId) && eligibleSet(s) && (timed(type) ? s.durationSeconds === 0 : s.reps === 0)) ?? false;
  const nextTarget = prescribeWorkout(type, sessions, target, availableLoads, today, { zeroBaseline: !!zeroRepBaselineDate, techniqueIssue, failedAttempt });
  const noImprovement = Math.max(0, completedSessionOrder.length - 1 - lastImprovedSession);
  return {
    exerciseId: exercise.id, exerciseName: exercise.name, trackingType: type, sessions, sessionCount: uniqueSessions.length,
    baseline, current, workComparison: current ? compareWork(current, sessions.slice(0, -1), type) : null,
    bestSet: sessions.length ? sessions.map(s => s.bestSet).reduce((a, b) => compareSets(a, b, type) >= 0 ? a : b) : null,
    baselineE1RM, currentE1RM, currentE1RMDate: estimates.at(-1)?.sessionDate ?? null, bestE1RM, eligibleStrengthSessions,
    estimatedStrengthChangePercent: eligibleStrengthSessions >= 2 ? percent(currentE1RM, baselineE1RM) : null,
    personalBestImprovementPercent: eligibleStrengthSessions >= 2 ? percent(bestE1RM, baselineE1RM) : null,
    startingLoad: loadMilestones[0]?.load ?? null, currentLoad, highestLoad,
    loadChangePercent: uniqueSessions.length >= 2 ? percent(currentLoad, loadMilestones[0]?.load ?? null) : null,
    currentRepsAtLoad, bestRepsAtCurrentLoad: currentLoad !== null ? bestRepsAtLoad[String(currentLoad)] ?? null : null,
    repHistoryByLoad: Object.keys(bestRepsAtLoad).map(load => ({ load: Number(load), starting: firstReps[load], current: previousReps[load], change: sessions.filter(s => s.bestRepsAtWeight[load] !== undefined).length >= 2 ? previousReps[load] - firstReps[load] : null })),
    bestVolume, volumeChange: current?.sessionVolume != null && baseline?.sessionVolume != null && uniqueSessions.length >= 2 ? current.sessionVolume - baseline.sessionVolume : null,
    bestRepsAtLoad, repChangeAtCurrentLoad: currentRepsAtLoad !== null && currentLoad !== null ? currentRepsAtLoad - firstReps[String(currentLoad)] : null,
    startingMaxReps, currentMaxReps, bestMaxReps: type === "reps" ? bestRepsAtLoad["0"] ?? (zeroRepBaselineDate ? 0 : null) : null,
    repChange: startingMaxReps !== null && currentMaxReps !== null && (uniqueSessions.length >= 2 || !!zeroRepBaselineDate) ? currentMaxReps - startingMaxReps : null,
    repChangePercent: uniqueSessions.length >= 2 ? percent(currentMaxReps, startingMaxReps) : null,
    zeroRepBaselineDate,
    repMilestones: type === "reps" ? [1, 3, 5, 8, 10].flatMap(reps => { const s = sessions.find(s => s.bestSet.reps! >= reps); return s ? [{ reps, date: s.sessionDate }] : []; }) : [],
    startingBestDuration, currentBestDuration, allTimeBestDuration,
    durationChange: durationSessions.length >= 2 && startingBestDuration !== null && currentBestDuration !== null ? currentBestDuration - startingBestDuration : null,
    durationChangePercent: durationSessions.length >= 2 ? percent(currentBestDuration, startingBestDuration) : null,
    daysToCurrentLoad: currentMilestone?.days ?? null, sessionsToCurrentLoad: currentMilestone?.sessions ?? null,
    averageDaysPerLoadIncrease: increases.length >= 2 ? increases.reduce((sum, m) => sum + m.days!, 0) / increases.length : null,
    averageSessionsPerLoadIncrease: increases.length >= 2 ? increases.reduce((sum, m) => sum + m.sessions!, 0) / increases.length : null,
    nextTarget, targetPlanName: targetPlan?.name ?? (plan ? "Selected plan" : "Last recorded targets"), dumbbellCount: exercise.dumbbellCount === 1 ? 1 : 2, availableLoads,
    status: getProgressStatus(completedSessionOrder.length, noImprovement), sessionsWithoutImprovement: noImprovement,
    loadMilestones, prHistory, improvementDates, dataConfidence: uniqueSessions.length === 0 ? "insufficient" : uniqueSessions.length === 1 ? "low" : "normal",
    e1rmConfidence: !estimates.length ? "insufficient" : eligibleStrengthSessions < 2 || estimates[0].e1rmConfidence === "low" || estimates.at(-1)!.e1rmConfidence === "low" ? "low" : "normal",
  };
}

export function getOverallStrengthTrend(changes: number[]): number | null {
  const values = changes.filter(Number.isFinite).sort((a, b) => a - b);
  if (values.length < 2) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function countAchievements(records: PersonalRecord[]) {
  return new Set(records.map(r => `${r.exerciseId}:${r.sessionId}`)).size;
}

export function getSinceLastWorkoutProgress(input: ProgressInput, exercises: ExerciseProgress[], today: string): ProgressAnalysis["workoutFeedback"] {
  const completed = input.sessions.filter(s => s && s.status === "completed" && validDate(s.endedAt ?? s.startedAt) && localDateKey(new Date(s.endedAt ?? s.startedAt)) <= today)
    .sort((a, b) => Date.parse(a.endedAt ?? a.startedAt) - Date.parse(b.endedAt ?? b.startedAt) || a.id.localeCompare(b.id));
  const latest = completed.at(-1);
  if (!latest) return null;
  const ids = new Set(completed.map(s => s.id));
  const date = localDateKey(new Date(latest.endedAt ?? latest.startedAt));
  // A partial workout can inform detailed analytics, but cannot establish a
  // comparison/PR baseline for completed-workout feedback.
  const feedbackExercises = input.sessions.some(s => s && !ids.has(s.id))
    ? exercises.map(e => getExerciseProgress({ ...input, sessions: completed }, { id: e.exerciseId, name: e.exerciseName, trackingType: e.trackingType }, today, []))
    : exercises;
  const items = feedbackExercises.flatMap(e => {
    const history = e.sessions.filter(s => ids.has(s.sessionId));
    const index = history.findLastIndex(s => s.sessionId === latest.id);
    if (index < 0) {
      const occurrences = latest.exercises.filter(o => o.exerciseId === e.exerciseId && o.status !== "skipped" && o.trackingTypeSnapshot === e.trackingType);
      if (!occurrences.length) return [];
      const zeroAttempt = e.trackingType === "reps" && latest.sets.some(s => s && eligibleSet(s) && s.reps === 0 && occurrences.some(o => o.id === s.workoutExerciseId));
      return [{ exerciseId: e.exerciseId, name: e.exerciseName, label: zeroAttempt ? "0 reps · First completed rep is next" : "No comparable data", improved: false }];
    }
    const current = history[index];
    const prior = history.slice(0, index).filter(s => s.sessionId !== latest.id);
    const previous = prior.at(-1);
    const work = compareWork(current, prior, e.trackingType);
    let label = "No comparable data", improved = false;
    if (work) {
      improved = work.change > 0;
      const change = work.change === 0 ? "Matched total" : `${work.change > 0 ? "+" : ""}${work.change} total ${work.unit}`;
      label = `${change} across ${work.setCount} set${work.setCount === 1 ? "" : "s"}${work.load !== null ? ` at ${work.load}kg` : weighted(e.trackingType) ? " at the same per-set loads" : ""} (vs ${work.previousDate})`;
    } else if (previous) {
      const load = current.highestWeight;
      if (current.establishedLoad !== null && previous.establishedLoad !== null && current.establishedLoad > previous.establishedLoad) {
        label = `Load ${previous.establishedLoad} → ${current.establishedLoad}kg`; improved = true;
      } else {
        const key = String(load ?? 0);
        const duration = timed(e.trackingType);
        const value = duration ? current.bestDurationAtWeight[key] : current.bestRepsAtWeight[key];
        const comparable = prior.filter(s => (duration ? s.bestDurationAtWeight[key] : s.bestRepsAtWeight[key]) !== undefined);
        const last = comparable.at(-1);
        if (last) {
          const before = duration ? last.bestDurationAtWeight[key] : last.bestRepsAtWeight[key];
          improved = value > before;
          label = `Best set: ${value > before ? "+" : ""}${value - before} ${duration ? "sec" : "reps"}${load !== null ? ` at ${load}kg` : ""} (vs ${last.sessionDate}); total work not comparable`;
        } else {
          label = "Different load; no same-load comparison yet";
        }
      }
    }
    const pr = e.prHistory.filter(r => r.sessionId === latest.id).sort((a, b) => ({load: 0, estimated_strength: 1, reps: 2, bodyweight_reps: 2, duration: 2, volume: 3}[a.type] - {load: 0, estimated_strength: 1, reps: 2, bodyweight_reps: 2, duration: 2, volume: 3}[b.type]))[0];
    if (pr) {
      const firstRep = pr.type === "bodyweight_reps" && pr.previousValue === 0;
      const title = firstRep ? (/^pull[ -]?up$/i.test(e.exerciseName.trim()) ? "First Pull-up" : "First completed rep") : `New ${{load: "Load PR", reps: "Best-set Rep PR", bodyweight_reps: "Best-set Rep PR", estimated_strength: "Epley index record", duration: "Best-set Duration PR", volume: "Session Volume PR"}[pr.type]}`;
      label = firstRep ? title : label === "No comparable data" ? title : `${label} · ${title}`;
      // A best-set or volume PR must not hide a fall in comparable total work.
      improved ||= firstRep;
    }
    return [{ exerciseId: e.exerciseId, name: e.exerciseName, label, improved }];
  });
  return { date, today: date === today, items, improved: items.filter(i => i.improved).length, prs: countAchievements(feedbackExercises.flatMap(e => e.prHistory).filter(r => r.sessionId === latest.id)) };
}

export function analyzeProgress(input: ProgressInput, asOfDate = localDateKey()): ProgressAnalysis {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) || !validDate(asOfDate)) throw new Error("A valid analysis date is required");
  const plateInventory = input.progressSettings?.plateInventory ?? DEFAULT_PLATE_INVENTORY;
  const settings = { plateInventory, availableLoads: generateAvailableDumbbellLoads(plateInventory), weightConvention: "per_dumbbell" as const };
  const catalog = new Map((input.exercises ?? []).filter(Boolean).map(e => [e.id, e]));
  const catalogIds = new Set(catalog.keys());
  const historicalSessions = [...(input.sessions ?? [])].filter(s => s && validDate(s.startedAt) && s.status !== "deleted" && localDateKey(new Date(s.startedAt)) <= asOfDate)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id.localeCompare(b.id));
  for (const session of historicalSessions) for (const occurrence of session.exercises ?? []) {
    // Deleted library entries retain history, using their most recent snapshot name/type.
    if (occurrence && !catalogIds.has(occurrence.exerciseId)) catalog.set(occurrence.exerciseId, { id: occurrence.exerciseId, name: occurrence.nameSnapshot, trackingType: occurrence.trackingTypeSnapshot, dumbbellCount: occurrence.dumbbellCountSnapshot });
  }
  const order = [...new Set((input.plans ?? []).flatMap(p => (p.exerciseIds ?? []).map(e => e.exerciseId)))];
  const exercises = [...catalog.values()].sort((a, b) => {
    const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
    return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi) || a.id.localeCompare(b.id);
  }).map(e => getExerciseProgress(input, e, asOfDate, generateAvailableDumbbellLoads(plateInventory, e.dumbbellCount ?? 2)));
  const validSessionIds = new Set(exercises.flatMap(e => e.sessions.map(s => s.sessionId)));
  const completed = historicalSessions.filter(s => s.status === "completed" && (validSessionIds.has(s.id) || s.exercises.some(o => o && o.status !== "skipped" && o.trackingTypeSnapshot === "reps" && s.sets.some(set => set && set.workoutExerciseId === o.id && eligibleSet(set) && set.reps === 0))));
  const eligible = exercises.filter(e => e.eligibleStrengthSessions >= 2 && e.baselineE1RM && e.currentE1RM);
  const overallPercent = getOverallStrengthTrend(eligible.map(e => e.estimatedStrengthChangePercent!));
  const records = exercises.flatMap(e => e.prHistory);
  const month = asOfDate.slice(0, 7);
  const activeThisMonth = exercises.filter(e => e.sessions.some(s => s.sessionDate.startsWith(month)));
  const priority = { load: 0, estimated_strength: 1, reps: 2, bodyweight_reps: 2, duration: 2, volume: 3 };
  const recent = [...records].sort((a, b) => b.date.localeCompare(a.date) || Number(b.type === "bodyweight_reps" && b.previousValue === 0) - Number(a.type === "bodyweight_reps" && a.previousValue === 0) || priority[a.type] - priority[b.type] || a.exerciseId.localeCompare(b.exerciseId))[0] ?? null;
  const start = completed[0] ? localDateKey(new Date(completed[0].startedAt)) : null;
  return {
    asOfDate, settings,
    methodology: {
      e1rm: "Secondary Epley performance index: plate load*(1+reps/30), 1-15 reps only. Routine sets are not repetition-maximum tests and handle mass is excluded, so this is not a measured or validated estimate of your actual 1RM. Effort and technique changes can alter the index. It never drives targets or strength PRs.",
      overall: "Median change in the secondary Epley index, not a percentage increase in measured strength. At least two exercises with two eligible sessions; individual exercise histories may cover different periods. Early until 14 days and three eligible sessions per contributing exercise; these are app display rules, not validated confidence thresholds.",
      validSets: "Only valid completed non-warmup sets, excluding skipped exercises, deleted sets, invalid technique, zero reps and invalid values. Partial workouts may contribute valid sets. Changed tracking types are not mixed.",
      zeroRepAttempts: "An explicitly logged zero-rep attempt may establish a reps-only zero baseline; it never counts as a valid work set, volume or performed session.",
      loadMilestoneSessions: "Unique sessions performing this exercise after the previous milestone session, through and including the new milestone session. Calendar dates use the viewer's local timezone.",
      prCounting: "Improvement records only; first result in each metric/load establishes its baseline. Best-set records and session-volume records describe logged work, not measured strength. Totals compare only equal set counts and equal per-set loads. Partial sessions do not add to no-new-best counts. Status thresholds are app reminders, not diagnoses of a plateau. Headline PR counts deduplicate by exercise and workout.",
      weightConvention: "Plate-only kg per dumbbell including single-dumbbell exercises; handles excluded; never silently doubled. Volume is logged weight*reps, not a strength score. Existing weights are not converted.",
      recommendations: "Per-set attempts from comparable saved sets. One additional total rep/second, repeated mastery and effort confirmation before increasing load, and an equipment cap are conservative app policies, not measured capacity. The Progress plan selector supplies targets; an active workout uses its frozen plan. Equipment is calculated for one dumbbell or a matched pair. Missing effort remains unknown.",
      rir: "User-reported subjective reps in reserve; 4 means 4 or more. Missing RIR is unknown, not zero.",
    },
    overall: { earlyTrend: !start || calendarDays(start, asOfDate) < 14 || eligible.length < 2 || eligible.some(e => e.eligibleStrengthSessions < 3), trainingStartDate: start, trainingDays: start ? calendarDays(start, asOfDate) : null, workoutsCompleted: new Set(completed.map(s => s.id)).size,
      validSets: exercises.reduce((sum, e) => sum + e.sessions.reduce((n, s) => n + s.validSets.length, 0), 0), lifetimePRs: countAchievements(records),
      estimatedStrengthChangePercent: overallPercent, eligibleExerciseCount: eligible.length },
    monthly: { month, workoutsCompleted: completed.filter(s => localDateKey(new Date(s.startedAt)).startsWith(month)).length,
      exercisesImproved: exercises.filter(e => e.improvementDates.some(d => d.startsWith(month))).length,
      loadIncreases: records.filter(r => r.type === "load" && r.date.startsWith(month)).length,
      prs: countAchievements(records.filter(r => r.date.startsWith(month))),
      progressSlowing: activeThisMonth.filter(e => e.status === "Progress slowing").length,
      possiblePlateaus: activeThisMonth.filter(e => e.status === "Possible plateau").length },
    recentSignal: recent, workoutFeedback: getSinceLastWorkoutProgress(input, exercises, asOfDate), exercises,
  };
}
