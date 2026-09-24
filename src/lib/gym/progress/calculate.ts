import type { Confidence, ExerciseProgress, NextTarget, PersonalRecord, ProgressAnalysis, ProgressInput, ProgressSet, SessionPerformance, Targets, TrackingType } from "./types";

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

function targets(sets?: number, repMin?: number, repMax?: number, duration?: number): Targets {
  const min = count(repMin) ? repMin : 8;
  return { sets: count(sets) ? sets : 3, repMin: min, repMax: Math.max(min, count(repMax) ? repMax : 12), duration: positive(duration) ? duration : null };
}

function compareSets(a: ProgressSet, b: ProgressSet, type: TrackingType) {
  return (weighted(type) ? (a.weight ?? 0) - (b.weight ?? 0) : 0)
    || (timed(type) ? (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0) : (a.reps ?? 0) - (b.reps ?? 0));
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
      const sets = raw.filter(s => {
        if (!isValidWorkSet(s, type) || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      }).sort((a, b) => a.setNumber - b.setNumber || a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id));
      if (!sets.length) continue;
      const target = targets(occurrence.plannedSetsSnapshot, occurrence.targetRepMin, occurrence.targetRepMax, occurrence.targetDurationMax ?? occurrence.targetDurationMin);
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
        highestWeight: weighted(type) ? Math.max(...sets.map(s => s.weight!)) : null,
        establishedLoad, bestRepsAtWeight, bestDurationAtWeight,
        bestSet: sets.reduce((best, s) => compareSets(s, best, type) > 0 ? s : best),
        sessionVolume: type === "weight_reps" ? sets.reduce((sum, s) => sum + s.weight! * s.reps!, 0) : null,
        sessionE1RM: estimates[0]?.value ?? null, e1rmConfidence: estimates[0]?.confidence ?? "insufficient",
        repsInReserve: typeof rir === "number" && Number.isInteger(rir) && rir >= 0 && rir <= 4 ? rir : null,
      });
    }
  }
  const sessionTimes = new Map((input.sessions ?? []).filter(Boolean).map(s => [s.id, s.startedAt]));
  result.sort((a, b) => Date.parse(sessionTimes.get(a.sessionId)!) - Date.parse(sessionTimes.get(b.sessionId)!) || a.sessionId.localeCompare(b.sessionId) || a.occurrenceId.localeCompare(b.occurrenceId));
  if (zeroRepBaselineDate && result[0] && zeroRepBaselineDate > result[0].sessionDate) zeroRepBaselineDate = null;
  return { sessions: result, zeroRepBaselineDate };
}

export function getNextTarget(type: TrackingType, current: SessionPerformance | null, target: Targets, availableLoads: number[]): NextTarget {
  const base: NextTarget = { kind: "first_session", label: "Complete your first session", reason: "Establish a baseline", weight: null, reps: null, durationSeconds: null, repRangeMastered: false, progressCurrent: null, progressTarget: null };
  if (!current) return base;
  if (type === "reps") {
    const reps = current.bestSet.reps!;
    return { ...base, kind: "reps", reps: reps + 1, label: `${reps + 1} reps`, reason: "One more rep than your latest best set", progressCurrent: reps, progressTarget: reps + 1 };
  }
  if (timed(type)) {
    const duration = current.bestSet.durationSeconds!;
    const next = target.duration && target.duration > duration ? target.duration : duration + 5;
    return { ...base, kind: "duration", weight: current.bestSet.weight ?? null, durationSeconds: next, label: `${type === "weight_time" ? `${current.bestSet.weight}kg x ` : ""}${next}s`, reason: "Next duration target", progressCurrent: duration, progressTarget: next };
  }
  const weight = current.highestWeight!;
  const sets = current.validSets;
  const reps = current.bestRepsAtWeight[String(weight)];
  const mastered = sets.length >= target.sets && sets.every(s => s.weight === weight && s.reps! >= target.repMax);
  const common = { ...base, weight, reps, repRangeMastered: mastered, progressCurrent: reps, progressTarget: target.repMax };
  if (mastered && current.repsInReserve === 0) return { ...common, kind: "repeat", label: `${weight}kg x ${target.repMax}`, reason: "Repeat this load and try to make the final set more comfortable (reported RIR 0)." };
  if (mastered) {
    if (!availableLoads.length) return { ...common, kind: "configure_loads", label: "Set your available loads", reason: "Rep range completed. Configure equipment before increasing load." };
    const nextLoad = availableLoads.find(load => load > weight);
    if (nextLoad !== undefined) return { ...common, kind: "increase_load", weight: nextLoad, reps: target.repMin, label: `${nextLoad}kg x ${target.repMin}`, reason: "Rep range completed across all working sets. Ready to increase load." };
    return { ...common, kind: "equipment_limit", label: "Current equipment limit reached", reason: "Keep this load; consider more reps, slower tempo or a harder variation." };
  }
  const nextReps = Math.min(target.repMax, Math.max(target.repMin, reps + 1));
  return { ...common, kind: "reps", reps: nextReps, label: `${weight}kg x ${nextReps}`, reason: reps >= target.repMax ? `Bring all ${target.sets} working sets to ${target.repMax} reps at this load.` : `${Math.max(0, target.repMax - reps)} reps to the top of the range; complete all ${target.sets} working sets.` };
}

export function getProgressStatus(sessionCount: number, noImprovement: number): ExerciseProgress["status"] {
  if (sessionCount < 2) return "Building baseline";
  if (noImprovement >= 6) return "Possible plateau";
  if (noImprovement >= 4) return "Progress slowing";
  if (noImprovement >= 3) return "Stable";
  return "Progressing";
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
  let bestE1RM: number | null = null;
  let bestVolume: number | null = null;
  let highestLoad: number | null = null;
  let previousEstablishedLoad: number | null = null;
  let lastLoadIndex = 0;
  let lastImprovedSession = -1;
  const uniqueSessions = [...new Set(sessions.map(s => s.sessionId))];

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
    if (session.sessionE1RM !== null) {
      if (bestE1RM !== null && session.sessionE1RM > bestE1RM + 1e-9) {
        const set = session.validSets.find(s => calculateE1RM(s.weight!, s.reps!)?.value === session.sessionE1RM)!;
        addPR("estimated_strength", session.sessionE1RM, bestE1RM, set.weight!, set);
        improved = true;
      }
      const previousEstimate = sessions.slice(0, index).findLast(s => s.sessionE1RM !== null)?.sessionE1RM;
      improvedFromPrevious ||= previousEstimate != null && session.sessionE1RM > previousEstimate + 1e-9;
      bestE1RM = Math.max(bestE1RM ?? 0, session.sessionE1RM);
    }
    for (const [load, reps] of Object.entries(session.bestRepsAtWeight)) {
      const previous = bestRepsAtLoad[load] ?? (type === "reps" && zeroRepBaselineDate ? 0 : undefined);
      if (previous !== undefined && reps > previous) {
        addPR("reps", reps, previous, weighted(type) ? Number(load) : null, session.validSets.find(s => s.reps === reps && (!weighted(type) || s.weight === Number(load)))!);
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
    if (improved || index === 0) lastImprovedSession = uniqueSessions.indexOf(session.sessionId);
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
  const plan = input.plans?.flatMap(p => p.exerciseIds ?? []).find(p => p.exerciseId === exercise.id);
  const target = plan ? targets(plan.targetSets, plan.targetRepMin, plan.targetRepMax, plan.targetDurationMax ?? plan.targetDurationMin) : current?.targets ?? targets();
  const nextTarget = getNextTarget(type, current, target, availableLoads);
  if (!current && type === "reps" && zeroRepBaselineDate) Object.assign(nextTarget, { kind: "reps", label: "1 rep", reps: 1, reason: "First completed rep", progressCurrent: 0, progressTarget: 1 });
  const noImprovement = Math.max(0, uniqueSessions.length - 1 - lastImprovedSession);
  return {
    exerciseId: exercise.id, exerciseName: exercise.name, trackingType: type, sessions, sessionCount: uniqueSessions.length,
    baseline, current, bestSet: sessions.length ? sessions.map(s => s.bestSet).reduce((a, b) => compareSets(a, b, type) >= 0 ? a : b) : null,
    baselineE1RM, currentE1RM, currentE1RMDate: estimates.at(-1)?.sessionDate ?? null, bestE1RM, eligibleStrengthSessions,
    estimatedStrengthChangePercent: eligibleStrengthSessions >= 2 ? percent(currentE1RM, baselineE1RM) : null,
    personalBestImprovementPercent: eligibleStrengthSessions >= 2 ? percent(bestE1RM, baselineE1RM) : null,
    startingLoad: loadMilestones[0]?.load ?? null, currentLoad, highestLoad,
    loadChangePercent: uniqueSessions.length >= 2 ? percent(currentLoad, loadMilestones[0]?.load ?? null) : null,
    currentRepsAtLoad, bestRepsAtCurrentLoad: currentLoad !== null ? bestRepsAtLoad[String(currentLoad)] ?? null : null,
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
    nextTarget, status: getProgressStatus(uniqueSessions.length, noImprovement), sessionsWithoutImprovement: noImprovement,
    loadMilestones, prHistory, improvementDates, dataConfidence: uniqueSessions.length === 0 ? "insufficient" : uniqueSessions.length === 1 ? "low" : "normal",
    e1rmConfidence: !estimates.length ? "insufficient" : eligibleStrengthSessions < 2 || estimates[0].e1rmConfidence === "low" || estimates.at(-1)!.e1rmConfidence === "low" ? "low" : "normal",
  };
}

export function analyzeProgress(input: ProgressInput, asOfDate = localDateKey()): ProgressAnalysis {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) || !validDate(asOfDate)) throw new Error("A valid analysis date is required");
  const settings = { availableLoads: normalizeAvailableLoads(input.progressSettings?.availableLoads), weightConvention: "per_dumbbell" as const };
  const catalog = new Map((input.exercises ?? []).filter(Boolean).map(e => [e.id, e]));
  const catalogIds = new Set(catalog.keys());
  const historicalSessions = [...(input.sessions ?? [])].filter(s => s && validDate(s.startedAt) && s.status !== "deleted" && localDateKey(new Date(s.startedAt)) <= asOfDate)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id.localeCompare(b.id));
  for (const session of historicalSessions) for (const occurrence of session.exercises ?? []) {
    // Deleted library entries retain history, using their most recent snapshot name/type.
    if (occurrence && !catalogIds.has(occurrence.exerciseId)) catalog.set(occurrence.exerciseId, { id: occurrence.exerciseId, name: occurrence.nameSnapshot, trackingType: occurrence.trackingTypeSnapshot });
  }
  const order = [...new Set((input.plans ?? []).flatMap(p => (p.exerciseIds ?? []).map(e => e.exerciseId)))];
  const exercises = [...catalog.values()].sort((a, b) => {
    const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
    return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi) || a.id.localeCompare(b.id);
  }).map(e => getExerciseProgress(input, e, asOfDate, settings.availableLoads));
  const validSessionIds = new Set(exercises.flatMap(e => e.sessions.map(s => s.sessionId)));
  const completed = (input.sessions ?? []).filter(s => s && s.status === "completed" && validSessionIds.has(s.id)).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const eligible = exercises.filter(e => e.eligibleStrengthSessions >= 2 && e.baselineE1RM && e.currentE1RM);
  const overallPercent = eligible.length >= 2 ? Math.expm1(eligible.reduce((sum, e) => sum + Math.log(e.currentE1RM! / e.baselineE1RM!), 0) / eligible.length) * 100 : null;
  const records = exercises.flatMap(e => e.prHistory);
  const month = asOfDate.slice(0, 7);
  const activeThisMonth = exercises.filter(e => e.sessions.some(s => s.sessionDate.startsWith(month)));
  const priority = { load: 0, estimated_strength: 1, reps: 2, duration: 2, volume: 3 };
  const recent = [...records].sort((a, b) => b.date.localeCompare(a.date) || priority[a.type] - priority[b.type] || a.exerciseId.localeCompare(b.exerciseId))[0] ?? null;
  const start = completed[0] ? localDateKey(new Date(completed[0].startedAt)) : null;
  return {
    asOfDate, settings,
    methodology: {
      e1rm: "Estimate: Epley weight*(1+reps/30), 1-15 reps only; 11-15 reps lower confidence. Current is the most recent suitable session, not the historical best.",
      overall: "Geometric mean of current/baseline e1RM ratios; at least two exercises, each with two eligible workout sessions.",
      validSets: "Only valid completed non-warmup sets, excluding skipped exercises, deleted sets, invalid technique, zero reps and invalid values. Partial workouts may contribute valid sets. Changed tracking types are not mixed.",
      zeroRepAttempts: "An explicitly logged zero-rep attempt may establish a reps-only zero baseline; it never counts as a valid work set, volume or performed session.",
      loadMilestoneSessions: "Unique sessions performing this exercise after the previous milestone session, through and including the new milestone session. Calendar dates use the viewer's local timezone.",
      prCounting: "Improvement records only; first result in each metric/load establishes its baseline. Separate categories can produce multiple PRs in one session. A first completed rep after an explicit zero attempt is an improvement.",
      weightConvention: "Logged kg per dumbbell, or the single implement used; never silently doubled. Volume is logged weight*reps, not a strength score. Existing weights are not converted.",
      recommendations: "App suggestions, not measured outcomes. Use configured available loads only. Current plan targets take precedence for next targets; historical targets are used for historical established loads. For multiple plans the first plan containing the exercise supplies the current target.",
      rir: "User-reported subjective reps in reserve; 4 means 4 or more. Missing RIR is unknown, not zero.",
    },
    overall: { trainingStartDate: start, trainingDays: start ? calendarDays(start, asOfDate) : null, workoutsCompleted: new Set(completed.map(s => s.id)).size,
      validSets: exercises.reduce((sum, e) => sum + e.sessions.reduce((n, s) => n + s.validSets.length, 0), 0), lifetimePRs: records.length,
      estimatedStrengthChangePercent: overallPercent, eligibleExerciseCount: eligible.length },
    monthly: { month, workoutsCompleted: completed.filter(s => localDateKey(new Date(s.startedAt)).startsWith(month)).length,
      exercisesImproved: exercises.filter(e => e.improvementDates.some(d => d.startsWith(month))).length,
      loadIncreases: records.filter(r => r.type === "load" && r.date.startsWith(month)).length,
      prs: records.filter(r => r.date.startsWith(month)).length,
      progressSlowing: activeThisMonth.filter(e => e.status === "Progress slowing").length,
      possiblePlateaus: activeThisMonth.filter(e => e.status === "Possible plateau").length },
    recentSignal: recent, exercises,
  };
}
