type TrackingType = "weight_reps" | "reps" | "time" | "weight_time";

type WorkoutSet = {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  completedAt: string;
};

type WorkoutExercise = {
  id: string;
  exerciseId: string;
  nameSnapshot: string;
  trackingTypeSnapshot: TrackingType;
  plannedSetsSnapshot: number;
  targetRepMin?: number;
  targetRepMax?: number;
  targetDurationMin?: number;
  targetDurationMax?: number;
  status: string;
};

type GymData = {
  exercises: Array<{ id: string; name: string; trackingType: TrackingType }>;
  plans: Array<{
    id: string;
    name: string;
    exerciseIds: Array<{
      id: string;
      exerciseId: string;
      targetSets: number;
      targetRepMin?: number;
      targetRepMax?: number;
      targetDurationMin?: number;
      targetDurationMax?: number;
    }>;
  }>;
  routines: Array<{
    id: string;
    name: string;
    planIds: string[];
    scheduleType: string;
    intervalDays: number;
    weekdays: number[];
    startDate: string;
    rotationIndex: number;
    lastCompletedAt?: string;
  }>;
  sessions: Array<{
    id: string;
    planId: string;
    routineId?: string;
    planNameSnapshot: string;
    startedAt: string;
    endedAt?: string;
    status: string;
    exercises: WorkoutExercise[];
    sets: WorkoutSet[];
  }>;
};

function csvEscape(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

function normalizeWorkoutState(state: unknown): GymData | null {
  if (!state || typeof state !== "object") return null;
  if ("data" in state) return (state as { data: GymData }).data;
  return state as GymData;
}

function minutesBetween(start: string, end?: string) {
  if (!end) return "";
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}

function setLabel(set: WorkoutSet, trackingType: TrackingType) {
  if (trackingType === "weight_reps") return `${set.weight ?? 0}kg x ${set.reps ?? 0}`;
  if (trackingType === "reps") return `${set.reps ?? 0} reps`;
  if (trackingType === "time") return `${set.durationSeconds ?? 0}s`;
  return `${set.weight ?? 0}kg x ${set.durationSeconds ?? 0}s`;
}

function volume(set: WorkoutSet) {
  return Number(set.weight || 0) * Number(set.reps || 0);
}

function sessionSets(session: GymData["sessions"][number], exercise: WorkoutExercise) {
  return session.sets.filter((set) => set.workoutExerciseId === exercise.id);
}

export function formatWorkoutAIExport(state: unknown) {
  const data = normalizeWorkoutState(state);
  const parts: string[] = [];

  parts.push("=== EXPORT CONTEXT ===\n");
  parts.push("Current workout tracker export for AI analysis. It includes workout plans, routine rotation/schedule settings, workout history, and summary metrics. Use this to analyze training consistency, progression, exercise balance, weak points, recovery patterns, and next programming changes.\n\n");

  if (!data) {
    parts.push("No workout data was available.\n");
    return parts.join("").trim();
  }

  const planById = new Map(data.plans.map((plan) => [plan.id, plan]));
  const exerciseById = new Map(data.exercises.map((exercise) => [exercise.id, exercise]));
  const completedSessions = data.sessions.filter((session) => session.status === "completed");
  const totalSets = data.sessions.reduce((sum, session) => sum + session.sets.length, 0);
  const totalMinutes = data.sessions.reduce((sum, session) => sum + Number(minutesBetween(session.startedAt, session.endedAt) || 0), 0);
  const totalVolume = data.sessions.reduce((sum, session) => sum + session.sets.reduce((setSum, set) => setSum + volume(set), 0), 0);

  parts.push("=== SUMMARY CSV ===\n");
  parts.push("total_sessions,completed_sessions,total_sets,total_training_minutes,total_weight_reps_volume,last_workout_at\n");
  parts.push([
    data.sessions.length,
    completedSessions.length,
    totalSets,
    totalMinutes,
    totalVolume.toFixed(2),
    data.sessions.at(-1)?.startedAt || "",
  ].join(",") + "\n\n");

  parts.push("=== PLANS CSV ===\n");
  parts.push("plan,order,exercise,tracking_type,target_sets,target_reps,target_duration_seconds\n");
  for (const plan of data.plans) {
    plan.exerciseIds.forEach((item, index) => {
      const exercise = exerciseById.get(item.exerciseId);
      parts.push([
        csvEscape(plan.name),
        index + 1,
        csvEscape(exercise?.name || "Unknown Exercise"),
        csvEscape(exercise?.trackingType || ""),
        item.targetSets,
        item.targetRepMin != null && item.targetRepMax != null ? `${item.targetRepMin}-${item.targetRepMax}` : "",
        item.targetDurationMin != null && item.targetDurationMax != null ? `${item.targetDurationMin}-${item.targetDurationMax}` : "",
      ].join(",") + "\n");
    });
  }
  parts.push("\n");

  parts.push("=== ROUTINES CSV ===\n");
  parts.push("routine,schedule_type,interval_days,weekdays,rotation_order,next_plan,last_completed_at\n");
  for (const routine of data.routines) {
    const nextPlan = routine.planIds.length
      ? planById.get(routine.planIds[routine.rotationIndex % routine.planIds.length])
      : undefined;
    parts.push([
      csvEscape(routine.name),
      csvEscape(routine.scheduleType),
      routine.intervalDays,
      csvEscape(routine.weekdays.join("|")),
      csvEscape(routine.planIds.map((planId) => planById.get(planId)?.name || planId).join(" > ")),
      csvEscape(nextPlan?.name || ""),
      csvEscape(routine.lastCompletedAt || ""),
    ].join(",") + "\n");
  }
  parts.push("\n");

  parts.push("=== HISTORY CSV ===\n");
  parts.push("started_at,ended_at,duration_minutes,status,plan,exercise,exercise_status,set_number,result,weight,reps,duration_seconds,volume\n");
  for (const session of data.sessions) {
    for (const exercise of session.exercises) {
      const sets = sessionSets(session, exercise);
      if (!sets.length) {
        parts.push([
          session.startedAt,
          session.endedAt || "",
          minutesBetween(session.startedAt, session.endedAt),
          csvEscape(session.status),
          csvEscape(session.planNameSnapshot),
          csvEscape(exercise.nameSnapshot),
          csvEscape(exercise.status),
          "",
          "",
          "",
          "",
          "",
          "",
        ].join(",") + "\n");
      }
      for (const set of sets) {
        parts.push([
          session.startedAt,
          session.endedAt || "",
          minutesBetween(session.startedAt, session.endedAt),
          csvEscape(session.status),
          csvEscape(session.planNameSnapshot),
          csvEscape(exercise.nameSnapshot),
          csvEscape(exercise.status),
          set.setNumber,
          csvEscape(setLabel(set, exercise.trackingTypeSnapshot)),
          set.weight ?? "",
          set.reps ?? "",
          set.durationSeconds ?? "",
          volume(set).toFixed(2),
        ].join(",") + "\n");
      }
    }
  }
  parts.push("\n");

  parts.push("=== RAW WORKOUT JSON ===\n");
  parts.push(JSON.stringify(data, null, 2));
  parts.push("\n\n");

  parts.push("=== AI ANALYSIS PROMPT ===\n\n");
  parts.push("Analyze my workout data in Chinese. Summarize training consistency, plan/routine structure, exercise balance, strength or endurance progress, missed or skipped exercises, recovery risks, and clear next changes for the next 2-4 weeks. Use the plan targets and routine rotation together with history. Be practical and specific.");

  return parts.join("").trim();
}
