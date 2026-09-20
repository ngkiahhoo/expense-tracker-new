"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Dumbbell,
  Ellipsis,
  Play,
  Plus,
  Trash2,
  Timer,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import useThemePreference from "@/hooks/useThemePreference";
import { getWorkoutState, saveWorkoutState } from "@/services/workoutService";

type TrackingType = "weight_reps" | "reps" | "time" | "weight_time";
type ScheduleType = "interval" | "weekdays" | "none";
type SessionStatus = "completed" | "partial";
type ExerciseStatus = "pending" | "completed" | "skipped" | "partial";

type Exercise = {
  id: string;
  name: string;
  trackingType: TrackingType;
  createdAt: string;
  updatedAt: string;
};

type PlanExercise = {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetRepMin?: number;
  targetRepMax?: number;
  targetDurationMin?: number;
  targetDurationMax?: number;
  restSeconds: number;
};

type Plan = {
  id: string;
  name: string;
  exerciseIds: PlanExercise[];
  createdAt: string;
  updatedAt: string;
};

type Routine = {
  id: string;
  name: string;
  planIds: string[];
  scheduleType: ScheduleType;
  intervalDays: number;
  weekdays: number[];
  startDate: string;
  rotationIndex: number;
  lastCompletedAt?: string;
};

type WorkoutExercise = {
  id: string;
  exerciseId: string;
  nameSnapshot: string;
  trackingTypeSnapshot: TrackingType;
  plannedSetsSnapshot: number;
  restSecondsSnapshot: number;
  targetRepMin?: number;
  targetRepMax?: number;
  targetDurationMin?: number;
  targetDurationMax?: number;
  status: ExerciseStatus;
};

type WorkoutSet = {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  completedAt: string;
};

type WorkoutSession = {
  id: string;
  planId: string;
  routineId?: string;
  planNameSnapshot: string;
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
  exercises: WorkoutExercise[];
  sets: WorkoutSet[];
};

type GymData = {
  exercises: Exercise[];
  plans: Plan[];
  routines: Routine[];
  sessions: WorkoutSession[];
};

type ActiveWorkout = {
  session: WorkoutSession;
  currentExerciseIndex: number;
  restUntil?: number;
};

type PersistedWorkoutState =
  | GymData
  | {
      data: GymData;
      active: ActiveWorkout | null;
    };

type SyncState = "local" | "syncing" | "supabase" | "fallback";
type GymTab = "home" | "library" | "plans" | "routines" | "history" | "progress" | "summary";

const storageKey = "expense-tracker-gym-mvp";
const activeWorkoutKey = "expense-tracker-gym-active";
const gymTabs: GymTab[] = ["home", "library", "plans", "routines", "history", "progress", "summary"];

const trackingLabels: Record<TrackingType, string> = {
  weight_reps: "Weight + Reps",
  reps: "Reps Only",
  time: "Time",
  weight_time: "Weight + Time",
};

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function niceDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(new Date(value));
}

function dateKey(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10);
}

function secondsLabel(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function trackingDefault(trackingType: TrackingType): Partial<PlanExercise> {
  if (trackingType === "time" || trackingType === "weight_time") {
    return { targetDurationMin: 30, targetDurationMax: 60 };
  }
  return { targetRepMin: 8, targetRepMax: 12 };
}

function seedData(): GymData {
  const now = new Date().toISOString();
  const exerciseNames: Array<[string, TrackingType]> = [
    ["Dumbbell Floor Press", "weight_reps"],
    ["One-Arm Dumbbell Row", "weight_reps"],
    ["Pull-up", "reps"],
    ["Dumbbell Shoulder Press", "weight_reps"],
    ["Goblet Squat", "weight_reps"],
    ["Romanian Deadlift", "weight_reps"],
    ["Dumbbell Crunch", "reps"],
    ["Plank", "time"],
    ["Bulgarian Split Squat", "weight_reps"],
    ["Dumbbell Biceps Curl", "weight_reps"],
    ["Side Plank", "time"],
  ];
  const exercises = exerciseNames.map(([name, trackingType]) => ({
    id: id("ex"),
    name,
    trackingType,
    createdAt: now,
    updatedAt: now,
  }));
  const byName = (name: string) => exercises.find((item) => item.name === name)!;
  const makePlanExercise = (name: string): PlanExercise => {
    const exercise = byName(name);
    return {
      id: id("pe"),
      exerciseId: exercise.id,
      targetSets: exercise.trackingType === "time" ? 3 : 3,
      restSeconds: exercise.trackingType === "time" ? 60 : 90,
      ...trackingDefault(exercise.trackingType),
    };
  };
  const plans: Plan[] = [
    {
      id: id("plan"),
      name: "Full Body A",
      exerciseIds: [
        "Dumbbell Floor Press",
        "One-Arm Dumbbell Row",
        "Pull-up",
        "Dumbbell Shoulder Press",
        "Goblet Squat",
        "Romanian Deadlift",
        "Dumbbell Crunch",
        "Plank",
      ].map(makePlanExercise),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id("plan"),
      name: "Full Body B",
      exerciseIds: [
        "Bulgarian Split Squat",
        "Dumbbell Floor Press",
        "One-Arm Dumbbell Row",
        "Dumbbell Biceps Curl",
        "Romanian Deadlift",
        "Side Plank",
      ].map(makePlanExercise),
      createdAt: now,
      updatedAt: now,
    },
  ];
  return {
    exercises,
    plans,
    routines: [{
      id: id("routine"),
      name: "My Main Routine",
      planIds: plans.map((plan) => plan.id),
      scheduleType: "interval",
      intervalDays: 2,
      weekdays: [1, 3, 5],
      startDate: todayKey(),
      rotationIndex: 0,
    }],
    sessions: [],
  };
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function lastExerciseSets(data: GymData, exerciseId: string, beforeSessionId?: string) {
  const sessions = [...data.sessions]
    .filter((session) => session.id !== beforeSessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const session of sessions) {
    const workoutExercise = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!workoutExercise) continue;
    const sets = session.sets.filter((set) => set.workoutExerciseId === workoutExercise.id);
    if (sets.length) return { session, sets };
  }
  return null;
}

function makeSession(plan: Plan, data: GymData, routineId?: string): WorkoutSession {
  return {
    id: id("session"),
    planId: plan.id,
    routineId,
    planNameSnapshot: plan.name,
    startedAt: new Date().toISOString(),
    status: "partial",
    exercises: plan.exerciseIds.map((item, index) => {
      const exercise = data.exercises.find((ex) => ex.id === item.exerciseId);
      return {
        id: id("we"),
        exerciseId: item.exerciseId,
        nameSnapshot: exercise?.name || "Unknown Exercise",
        trackingTypeSnapshot: exercise?.trackingType || "weight_reps",
        plannedSetsSnapshot: item.targetSets,
        restSecondsSnapshot: item.restSeconds,
        targetRepMin: item.targetRepMin,
        targetRepMax: item.targetRepMax,
        targetDurationMin: item.targetDurationMin,
        targetDurationMax: item.targetDurationMax,
        sortOrder: index,
        status: "pending",
      };
    }),
    sets: [],
  };
}

function nextScheduledText(routine: Routine) {
  if (routine.scheduleType === "none") return "Manual start";
  if (!routine.lastCompletedAt) return "Scheduled today";
  const today = new Date(dateKey(new Date()));
  let due: Date | null = null;
  if (routine.scheduleType === "interval") {
    due = new Date(routine.lastCompletedAt);
    due.setDate(due.getDate() + routine.intervalDays);
  }
  if (routine.scheduleType === "weekdays") {
    if (!routine.weekdays.length) return "No training days selected";
    const anchor = new Date(routine.lastCompletedAt);
    for (let offset = 1; offset <= 14; offset += 1) {
      const candidate = new Date(anchor);
      candidate.setDate(anchor.getDate() + offset);
      if (routine.weekdays.includes(candidate.getDay())) {
        due = candidate;
        break;
      }
    }
  }
  if (!due) return "Scheduled today";
  const dueDay = new Date(dateKey(due));
  const diff = Math.floor((today.getTime() - dueDay.getTime()) / 86_400_000);
  if (diff === 0) return "Scheduled today";
  if (diff > 0) return `Scheduled ${niceDate(due.toISOString())} - ${diff} day${diff === 1 ? "" : "s"} overdue`;
  return `Scheduled ${niceDate(due.toISOString())}`;
}

function getSessionStatus(session: WorkoutSession): SessionStatus {
  return session.exercises.length > 0 &&
    session.exercises.every((item) => item.status === "completed" || item.status === "skipped") &&
    session.exercises.some((item) => item.status === "completed")
    ? "completed"
    : "partial";
}

function setLabel(set: WorkoutSet, trackingType: TrackingType) {
  if (trackingType === "weight_reps") return `${set.weight ?? 0}kg x ${set.reps ?? 0}`;
  if (trackingType === "reps") return `${set.reps ?? 0} reps`;
  if (trackingType === "time") return `${set.durationSeconds ?? 0}s`;
  return `${set.weight ?? 0}kg x ${set.durationSeconds ?? 0}s`;
}

function exerciseHistory(data: GymData, exerciseId: string) {
  return [...data.sessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap((session) => {
      const workoutExercise = session.exercises.find((item) => item.exerciseId === exerciseId);
      if (!workoutExercise) return [];
      const sets = session.sets.filter((set) => set.workoutExerciseId === workoutExercise.id);
      return sets.length ? [{ session, workoutExercise, sets }] : [];
    });
}

function bestSetForTracking(sets: WorkoutSet[], trackingType: TrackingType) {
  return [...sets].sort((a, b) => {
    if (trackingType === "weight_reps") {
      return ((b.weight || 0) * (b.reps || 0)) - ((a.weight || 0) * (a.reps || 0));
    }
    if (trackingType === "weight_time") {
      return ((b.weight || 0) * (b.durationSeconds || 0)) - ((a.weight || 0) * (a.durationSeconds || 0));
    }
    if (trackingType === "time") return (b.durationSeconds || 0) - (a.durationSeconds || 0);
    return (b.reps || 0) - (a.reps || 0);
  })[0];
}

function sessionDurationLabel(session: WorkoutSession) {
  if (!session.endedAt) return "In progress";
  const minutes = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000));
  return `${minutes} min`;
}

function sessionVolume(session: WorkoutSession) {
  return session.sets.reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0);
}

function sessionExerciseSets(session: WorkoutSession, exercise: WorkoutExercise) {
  return session.sets.filter((set) => set.workoutExerciseId === exercise.id);
}

function sessionImprovementCount(data: GymData, session: WorkoutSession) {
  return sessionImprovementDetails(data, session).length;
}

function performanceValue(set: WorkoutSet, trackingType: TrackingType) {
  if (trackingType === "time") return Number(set.durationSeconds || 0);
  if (trackingType === "reps") return Number(set.reps || 0);
  if (trackingType === "weight_time") return Number(set.weight || 0) * Number(set.durationSeconds || 0);
  return Number(set.weight || 0) * Number(set.reps || 0);
}

function sessionImprovementDetails(data: GymData, session: WorkoutSession) {
  return session.exercises.flatMap((exercise) => {
    const currentBest = bestSetForTracking(sessionExerciseSets(session, exercise), exercise.trackingTypeSnapshot);
    const previous = lastExerciseSets(data, exercise.exerciseId, session.id);
    const previousBest = previous ? bestSetForTracking(previous.sets, exercise.trackingTypeSnapshot) : undefined;
    if (!currentBest || !previousBest) return [];
    return performanceValue(currentBest, exercise.trackingTypeSnapshot) > performanceValue(previousBest, exercise.trackingTypeSnapshot)
      ? [{ exercise, currentBest, previousBest }]
      : [];
  });
}

function completedSetComparison(previous: WorkoutSet[] | undefined, today: WorkoutSet[], trackingType: TrackingType) {
  return today.reduce((count, set, index) => {
    const oldSet = previous?.[index];
    if (!oldSet) return count;
    return performanceValue(set, trackingType) > performanceValue(oldSet, trackingType) ? count + 1 : count;
  }, 0);
}

function reorderById<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
  const nextItems = [...items];
  const [item] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, item);
  return nextItems;
}

function normalizePersistedState(state: PersistedWorkoutState | null) {
  if (!state) return null;
  if ("data" in state) return state;
  return { data: state, active: null };
}

export default function GymPage() {
  return (
    <Suspense fallback={<GymPageShell />}>
      <GymPageContent />
    </Suspense>
  );
}

function GymPageShell() {
  const { theme } = useThemePreference();
  return (
    <main className={`gym-page min-h-screen pb-40 ${theme === "light" ? "gym-light bg-slate-50 text-slate-950" : "bg-[#070a0f] text-slate-100"}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-cyan-400">Workout Tracker</p>
            <h1 className="text-3xl font-bold">Gym</h1>
            <p className="text-xs text-slate-400">Loading workout data...</p>
          </div>
          <Link href="/gym?tab=home" aria-label="Go to Gym home" className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 transition hover:bg-cyan-400/20">
            <Dumbbell aria-hidden className="size-6 text-cyan-300" />
          </Link>
        </header>
        <section className="grid gap-3">
          <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
        </section>
      </div>
    </main>
  );
}

function GymPageContent() {
  const { theme } = useThemePreference();
  const searchParams = useSearchParams();
  const [data, setData] = useState<GymData>(() => loadJson(storageKey, seedData()));
  const [active, setActive] = useState<ActiveWorkout | null>(() => loadJson<ActiveWorkout | null>(activeWorkoutKey, null));
  const [tab, setTab] = useState<GymTab>("home");
  const [lastFinishedSession, setLastFinishedSession] = useState<WorkoutSession | null>(null);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseType, setNewExerciseType] = useState<TrackingType>("weight_reps");
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState("");
  const [editingExerciseName, setEditingExerciseName] = useState("");
  const [editingExerciseType, setEditingExerciseType] = useState<TrackingType>("weight_reps");
  const [newPlanName, setNewPlanName] = useState("");
  const [planExerciseId, setPlanExerciseId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [newRoutineName, setNewRoutineName] = useState("");
  const [draggedPlanExercise, setDraggedPlanExercise] = useState<{ planId: string; itemId: string } | null>(null);
  const [draggedRoutinePlan, setDraggedRoutinePlan] = useState<{ routineId: string; planId: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWorkoutState<PersistedWorkoutState>()
      .then((remote) => {
        if (cancelled) return;
        const normalized = normalizePersistedState(remote);
        if (normalized) {
          setData(normalized.data);
          setActive(normalized.active);
          setSyncState("supabase");
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSyncState("fallback");
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(data));
    const timer = window.setTimeout(() => {
      saveWorkoutState({ data, active })
        .then(() => setSyncState("supabase"))
        .catch(() => setSyncState("fallback"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [active, data, hydrated]);

  useEffect(() => {
    if (active) window.localStorage.setItem(activeWorkoutKey, JSON.stringify(active));
    else window.localStorage.removeItem(activeWorkoutKey);
  }, [active]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedPlan = data.plans.find((plan) => plan.id === selectedPlanId) || data.plans[0];
  const requestedTab = searchParams.get("tab") as GymTab | null;
  const activeTab = requestedTab && gymTabs.includes(requestedTab) ? requestedTab : tab;
  const filteredExercises = data.exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseQuery.trim().toLowerCase())
  );
  const recommendedRoutine = data.routines[0];
  const recommendedPlan = recommendedRoutine
    ? data.plans.find((plan) => plan.id === recommendedRoutine.planIds[recommendedRoutine.rotationIndex % Math.max(1, recommendedRoutine.planIds.length)])
    : data.plans[0];
  const allSets = data.sessions.flatMap((session) => session.sets);
  const totalTime = data.sessions.reduce((sum, session) => {
    if (!session.endedAt) return sum;
    return sum + Math.max(0, new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime());
  }, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const recentSession = data.sessions.at(-1);
  const recentPr = useMemo(() => {
    for (const exercise of data.exercises) {
      const last = lastExerciseSets(data, exercise.id);
      if (last?.sets.length) return `${exercise.name}: ${setLabel(last.sets[0], exercise.trackingType)}`;
    }
    return "No PR yet";
  }, [data]);

  if (!hydrated) {
    return (
      <main className={`gym-page min-h-screen pb-40 ${theme === "light" ? "gym-light bg-slate-50 text-slate-950" : "bg-[#070a0f] text-slate-100"}`}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-cyan-400">Workout Tracker</p>
              <h1 className="text-3xl font-bold">Gym</h1>
              <p className="text-xs text-slate-400">Loading workout data...</p>
            </div>
            <Link href="/gym?tab=home" aria-label="Go to Gym home" className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 transition hover:bg-cyan-400/20">
              <Dumbbell aria-hidden className="size-6 text-cyan-300" />
            </Link>
          </header>
          <section className="grid gap-3">
            <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
            <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          </section>
        </div>
      </main>
    );
  }

  function saveExercise() {
    const name = newExerciseName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      exercises: [...current.exercises, { id: id("ex"), name, trackingType: newExerciseType, createdAt: now, updatedAt: now }],
    }));
    setNewExerciseName("");
  }

  function startEditExercise(exercise: Exercise) {
    setEditingExerciseId(exercise.id);
    setEditingExerciseName(exercise.name);
    setEditingExerciseType(exercise.trackingType);
  }

  function saveExerciseEdit() {
    const name = editingExerciseName.trim();
    if (!editingExerciseId || !name) return;
    setData((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === editingExerciseId
          ? { ...exercise, name, trackingType: editingExerciseType, updatedAt: new Date().toISOString() }
          : exercise
      ),
    }));
    setEditingExerciseId("");
    setEditingExerciseName("");
  }

  function deleteExercise(exerciseId: string) {
    const usedInSessions = data.sessions.some((session) => session.exercises.some((exercise) => exercise.exerciseId === exerciseId));
    if (usedInSessions) {
      window.alert("This exercise has workout history, so it cannot be deleted.");
      return;
    }
    setData((current) => ({
      ...current,
      exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId),
      plans: current.plans.map((plan) => ({
        ...plan,
        exerciseIds: plan.exerciseIds.filter((item) => item.exerciseId !== exerciseId),
        updatedAt: new Date().toISOString(),
      })),
    }));
  }

  function createPlan() {
    const name = newPlanName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const plan: Plan = { id: id("plan"), name, exerciseIds: [], createdAt: now, updatedAt: now };
    setData((current) => ({ ...current, plans: [...current.plans, plan] }));
    setSelectedPlanId(plan.id);
    setNewPlanName("");
  }

  function addExerciseToPlan() {
    if (!selectedPlan || !planExerciseId) return;
    const exercise = data.exercises.find((item) => item.id === planExerciseId);
    if (!exercise) return;
    setData((current) => ({
      ...current,
      plans: current.plans.map((plan) => plan.id === selectedPlan.id
        ? {
            ...plan,
            exerciseIds: [...plan.exerciseIds, {
              id: id("pe"),
              exerciseId: exercise.id,
              targetSets: 3,
              restSeconds: exercise.trackingType === "time" ? 60 : 90,
              ...trackingDefault(exercise.trackingType),
            }],
            updatedAt: new Date().toISOString(),
          }
        : plan),
    }));
    setPlanExerciseId("");
  }

  function renamePlan(planId: string, name: string) {
    const nextName = name.trim();
    if (!nextName) return;
    setData((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId ? { ...plan, name: nextName, updatedAt: new Date().toISOString() } : plan
      ),
    }));
  }

  function deletePlan(planId: string) {
    const hasHistory = data.sessions.some((session) => session.planId === planId);
    if (hasHistory) {
      window.alert("This plan has workout history, so it cannot be deleted.");
      return;
    }
    setData((current) => ({
      ...current,
      plans: current.plans.filter((plan) => plan.id !== planId),
      routines: current.routines.map((routine) => {
        const planIds = routine.planIds.filter((idValue) => idValue !== planId);
        return {
          ...routine,
          planIds,
          rotationIndex: Math.min(routine.rotationIndex, Math.max(0, planIds.length - 1)),
        };
      }),
    }));
    if (selectedPlanId === planId) setSelectedPlanId("");
  }

  function createRoutine() {
    const name = newRoutineName.trim();
    if (!name || data.plans.length === 0) return;
    setData((current) => ({
      ...current,
      routines: [...current.routines, {
        id: id("routine"),
        name,
        planIds: current.plans.slice(0, 2).map((plan) => plan.id),
        scheduleType: "interval",
        intervalDays: 2,
        weekdays: [],
        startDate: todayKey(),
        rotationIndex: 0,
      }],
    }));
    setNewRoutineName("");
  }

  function updateRoutine(routineId: string, patch: Partial<Routine>) {
    setData((current) => ({
      ...current,
      routines: current.routines.map((routine) =>
        routine.id === routineId ? { ...routine, ...patch } : routine
      ),
    }));
  }

  function toggleRoutinePlan(routine: Routine, planId: string) {
    const hasPlan = routine.planIds.includes(planId);
    const planIds = hasPlan
      ? routine.planIds.filter((idValue) => idValue !== planId)
      : [...routine.planIds, planId];
    updateRoutine(routine.id, {
      planIds,
      rotationIndex: Math.min(routine.rotationIndex, Math.max(0, planIds.length - 1)),
    });
  }

  function toggleRoutineWeekday(routine: Routine, weekday: number) {
    const weekdays = routine.weekdays.includes(weekday)
      ? routine.weekdays.filter((item) => item !== weekday)
      : [...routine.weekdays, weekday].sort((a, b) => a - b);
    updateRoutine(routine.id, { weekdays });
  }

  function updatePlanExercise(planId: string, itemId: string, patch: Partial<PlanExercise>) {
    setData((current) => ({
      ...current,
      plans: current.plans.map((plan) => plan.id === planId
        ? {
            ...plan,
            exerciseIds: plan.exerciseIds.map((item) => item.id === itemId ? { ...item, ...patch } : item),
            updatedAt: new Date().toISOString(),
          }
        : plan),
    }));
  }

  function removePlanExercise(planId: string, itemId: string) {
    setData((current) => ({
      ...current,
      plans: current.plans.map((plan) => plan.id === planId
        ? { ...plan, exerciseIds: plan.exerciseIds.filter((item) => item.id !== itemId), updatedAt: new Date().toISOString() }
        : plan),
    }));
  }

  function movePlanExercise(planId: string, itemId: string, direction: -1 | 1) {
    setData((current) => ({
      ...current,
      plans: current.plans.map((plan) => {
        if (plan.id !== planId) return plan;
        const currentIndex = plan.exerciseIds.findIndex((item) => item.id === itemId);
        const nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= plan.exerciseIds.length) return plan;
        const exerciseIds = [...plan.exerciseIds];
        const [item] = exerciseIds.splice(currentIndex, 1);
        exerciseIds.splice(nextIndex, 0, item);
        return { ...plan, exerciseIds, updatedAt: new Date().toISOString() };
      }),
    }));
  }

  function dropPlanExercise(planId: string, targetItemId: string) {
    if (!draggedPlanExercise || draggedPlanExercise.planId !== planId) return;
    setData((current) => ({
      ...current,
      plans: current.plans.map((plan) => plan.id === planId
        ? { ...plan, exerciseIds: reorderById(plan.exerciseIds, draggedPlanExercise.itemId, targetItemId), updatedAt: new Date().toISOString() }
        : plan),
    }));
    setDraggedPlanExercise(null);
  }

  function moveRoutinePlan(routine: Routine, planId: string, direction: -1 | 1) {
    const currentIndex = routine.planIds.indexOf(planId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= routine.planIds.length) return;
    const planIds = [...routine.planIds];
    const [item] = planIds.splice(currentIndex, 1);
    planIds.splice(nextIndex, 0, item);
    updateRoutine(routine.id, {
      planIds,
      rotationIndex: planIds.indexOf(routine.planIds[routine.rotationIndex] || item),
    });
  }

  function dropRoutinePlan(routine: Routine, targetPlanId: string) {
    if (!draggedRoutinePlan || draggedRoutinePlan.routineId !== routine.id) return;
    const planIds = reorderById(routine.planIds.map((planId) => ({ id: planId })), draggedRoutinePlan.planId, targetPlanId).map((item) => item.id);
    updateRoutine(routine.id, {
      planIds,
      rotationIndex: planIds.indexOf(routine.planIds[routine.rotationIndex] || targetPlanId),
    });
    setDraggedRoutinePlan(null);
  }

  function deleteRoutine(routineId: string) {
    setData((current) => ({
      ...current,
      routines: current.routines.filter((routine) => routine.id !== routineId),
    }));
  }

  function startWorkout(plan: Plan, routineId?: string) {
    setActive({ session: makeSession(plan, data, routineId), currentExerciseIndex: 0 });
  }

  function completeSet(values: { weight?: number; reps?: number; durationSeconds?: number }) {
    if (!active) return;
    const exercise = active.session.exercises[active.currentExerciseIndex];
    const existingSets = active.session.sets.filter((set) => set.workoutExerciseId === exercise.id);
    const nextSet: WorkoutSet = {
      id: id("set"),
      workoutExerciseId: exercise.id,
      setNumber: existingSets.length + 1,
      completedAt: new Date().toISOString(),
      ...values,
    };
    const sets = [...active.session.sets, nextSet];
    const targetReached = existingSets.length + 1 >= exercise.plannedSetsSnapshot;
    const exercises = active.session.exercises.map((item) => {
      if (item.id !== exercise.id) return item;
      return { ...item, status: targetReached ? "completed" as ExerciseStatus : "partial" as ExerciseStatus };
    });
    setActive({
      ...active,
      session: { ...active.session, sets, exercises },
      restUntil: Date.now() + exercise.restSecondsSnapshot * 1000,
    });
  }

  function finishExercise(status: ExerciseStatus = "completed") {
    if (!active) return;
    const exercise = active.session.exercises[active.currentExerciseIndex];
    const exercises = active.session.exercises.map((item) => item.id === exercise.id ? { ...item, status } : item);
    const nextIndex = Math.min(active.currentExerciseIndex + 1, exercises.length - 1);
    setActive({ ...active, session: { ...active.session, exercises }, currentExerciseIndex: nextIndex, restUntil: undefined });
  }

  function finishWorkout(status: SessionStatus) {
    if (!active) return;
    const session = { ...active.session, status, endedAt: new Date().toISOString() };
    setData((current) => ({
      ...current,
      sessions: [...current.sessions, session],
      routines: current.routines.map((routine) => {
        if (routine.id !== session.routineId || status !== "completed") return routine;
        return {
          ...routine,
          rotationIndex: routine.planIds.length ? (routine.rotationIndex + 1) % routine.planIds.length : 0,
          lastCompletedAt: session.endedAt,
        };
      }),
    }));
    setLastFinishedSession(session);
    setActive(null);
    setTab("summary");
  }

  function discardWorkout() {
    setActive(null);
    setTab("home");
  }

  function deleteHistorySession(sessionId: string) {
    const session = data.sessions.find((item) => item.id === sessionId);
    const label = session ? `${session.planNameSnapshot} on ${niceDate(session.startedAt)}` : "this workout";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setData((current) => ({
      ...current,
      sessions: current.sessions.filter((item) => item.id !== sessionId),
    }));
    if (lastFinishedSession?.id === sessionId) {
      setLastFinishedSession(null);
      setTab("history");
    }
  }

  function advanceRoutineForSession(session: WorkoutSession) {
    if (!session.routineId) return;
    setData((current) => ({
      ...current,
      routines: current.routines.map((routine) => routine.id === session.routineId
        ? {
            ...routine,
            rotationIndex: routine.planIds.length ? (routine.rotationIndex + 1) % routine.planIds.length : 0,
            lastCompletedAt: session.endedAt || new Date().toISOString(),
          }
        : routine),
    }));
  }

  if (active) {
    return (
      <WorkoutMode
        active={active}
        data={data}
        key={`${active.session.id}:${active.currentExerciseIndex}`}
        nowMs={nowMs}
        onSetActive={setActive}
        onCompleteSet={completeSet}
        onFinishExercise={finishExercise}
        onFinishWorkout={finishWorkout}
        onDiscardWorkout={discardWorkout}
      />
    );
  }

  return (
    <main className={`gym-page min-h-screen pb-40 ${theme === "light" ? "gym-light bg-slate-50 text-slate-950" : "bg-[#070a0f] text-slate-100"}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-cyan-400">Workout Tracker</p>
            <h1 className="text-3xl font-bold">Gym</h1>
            <p className="text-xs text-slate-400">
              {syncState === "supabase" ? "Synced with Supabase" : syncState === "syncing" ? "Syncing..." : syncState === "fallback" ? "Local fallback active" : "Local first"}
            </p>
          </div>
          <Link href="/gym?tab=home" aria-label="Go to Gym home" className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 transition hover:bg-cyan-400/20">
            <Dumbbell aria-hidden className="size-6 text-cyan-300" />
          </Link>
        </header>

        {activeTab === "home" && (
          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Next Workout</p>
              <h2 className="mt-2 text-2xl font-bold">{recommendedPlan?.name || "Create a plan"}</h2>
              <p className="mt-1 text-sm text-slate-400">{recommendedRoutine ? nextScheduledText(recommendedRoutine) : "No routine yet"}</p>
              <Button className="mt-4 w-full" size="lg" disabled={!recommendedPlan} onClick={() => recommendedPlan && startWorkout(recommendedPlan, recommendedRoutine?.id)}>
                <Play className="size-5" aria-hidden /> Start Workout
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total workouts" value={String(data.sessions.length)} />
              <Stat label="This month" value={String(data.sessions.filter((session) => session.startedAt.startsWith(thisMonth)).length)} />
              <Stat label="Training time" value={`${Math.round(totalTime / 60_000)}m`} />
              <Stat label="Total sets" value={String(allSets.length)} />
            </div>
            <div className="rounded-2xl border border-white/10 p-4 lg:col-span-2">
              <h3 className="font-semibold">Recent signals</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <p className="rounded-xl bg-white/[0.05] p-3 text-sm">Recent PR<br /><span className="font-semibold">{recentPr}</span></p>
                <p className="rounded-xl bg-white/[0.05] p-3 text-sm">Recent workout<br /><span className="font-semibold">{recentSession ? `${recentSession.planNameSnapshot} - ${niceDate(recentSession.startedAt)}` : "No sessions yet"}</span></p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "library" && (
          <section className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <Panel title="Create Exercise">
              <Input placeholder="Exercise name" value={newExerciseName} onChange={(event) => setNewExerciseName(event.target.value)} />
              <Select value={newExerciseType} onChange={(event) => setNewExerciseType(event.target.value as TrackingType)}>
                {Object.entries(trackingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Button onClick={saveExercise}><Plus className="size-4" /> Add exercise</Button>
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-sm font-semibold">Find Exercise</p>
                <Input placeholder="Search library" value={exerciseQuery} onChange={(event) => setExerciseQuery(event.target.value)} />
              </div>
            </Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredExercises.map((exercise) => {
                const history = exerciseHistory(data, exercise.id);
                const isEditing = editingExerciseId === exercise.id;
                const usedInPlans = data.plans.filter((plan) => plan.exerciseIds.some((item) => item.exerciseId === exercise.id)).length;
                return (
                  <article key={exercise.id} className="rounded-2xl border border-white/10 p-4">
                    {isEditing ? (
                      <div className="grid gap-2">
                        <Input value={editingExerciseName} onChange={(event) => setEditingExerciseName(event.target.value)} />
                        <Select value={editingExerciseType} onChange={(event) => setEditingExerciseType(event.target.value as TrackingType)}>
                          {Object.entries(trackingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={saveExerciseEdit}>Save</Button>
                          <Button variant="outline" onClick={() => setEditingExerciseId("")}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{exercise.name}</h3>
                            <p className="text-sm text-cyan-400">{trackingLabels[exercise.trackingType]}</p>
                          </div>
                          <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-slate-300">{history.length} logged</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => startEditExercise(exercise)}>Edit</Button>
                          <Button variant="outline" onClick={() => deleteExercise(exercise.id)}>Delete</Button>
                        </div>
                      </>
                    )}
                    <p className="mt-3 text-xs text-slate-500">Used in {usedInPlans} plan(s)</p>
                    <div className="mt-3 grid gap-2">
                      {history.length ? history.slice(0, 3).map((entry) => (
                        <p key={`${entry.session.id}-${entry.workoutExercise.id}`} className="rounded-xl bg-white/[0.04] p-2 text-sm">
                          <span className="text-slate-400">{niceDate(entry.session.startedAt)}</span>
                          <br />
                          {entry.sets.map((set) => setLabel(set, exercise.trackingType)).join(", ")}
                        </p>
                      )) : <p className="text-sm text-slate-400">No history yet</p>}
                    </div>
                  </article>
                );
              })}
              {!filteredExercises.length && <p className="text-sm text-slate-400">No exercises match that search.</p>}
            </div>
          </section>
        )}

        {activeTab === "plans" && (
          <section className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <Panel title="Plan">
              <Input placeholder="New plan name" value={newPlanName} onChange={(event) => setNewPlanName(event.target.value)} />
              <Button onClick={createPlan}><Plus className="size-4" /> Create plan</Button>
              <Select value={selectedPlan?.id || ""} onChange={(event) => setSelectedPlanId(event.target.value)}>
                {data.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </Select>
              <Select value={planExerciseId} onChange={(event) => setPlanExerciseId(event.target.value)}>
                <option value="">Choose exercise</option>
                {data.exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
              </Select>
              <Button onClick={addExerciseToPlan}>Add to selected plan</Button>
            </Panel>
            <div className="grid gap-3">
              {data.plans.map((plan) => (
                <article key={plan.id} className="rounded-2xl border border-white/10 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div>
                      <Input
                        fieldSize="md"
                        value={plan.name}
                        onChange={(event) => renamePlan(plan.id, event.target.value)}
                        className="max-w-md text-lg font-semibold"
                      />
                      <p className="mt-2 text-sm text-slate-400">{plan.exerciseIds.length} exercise(s)</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => startWorkout(plan)}>Start</Button>
                      <Button variant="outline" onClick={() => deletePlan(plan.id)}>Delete</Button>
                    </div>
                  </div>
                  <ol className="mt-4 space-y-2">
                    {plan.exerciseIds.map((item, index) => {
                      const exercise = data.exercises.find((ex) => ex.id === item.exerciseId);
                      return (
                        <li
                          key={item.id}
                          draggable
                          onDragStart={() => setDraggedPlanExercise({ planId: plan.id, itemId: item.id })}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => dropPlanExercise(plan.id, item.id)}
                          className="rounded-xl bg-white/[0.05] p-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{index + 1}. {exercise?.name}</p>
                              <p className="text-xs text-slate-400">{exercise ? trackingLabels[exercise.trackingType] : "Unknown"}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-1">
                              <span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400">Drag</span>
                              <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-xs disabled:opacity-40" disabled={index === 0} onClick={() => movePlanExercise(plan.id, item.id, -1)}>Up</button>
                              <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-xs disabled:opacity-40" disabled={index === plan.exerciseIds.length - 1} onClick={() => movePlanExercise(plan.id, item.id, 1)}>Down</button>
                              <button type="button" className="rounded-lg border border-red-300/30 px-2 py-1 text-xs text-red-300" onClick={() => removePlanExercise(plan.id, item.id)}>Remove</button>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <label className="text-xs">
                              Sets
                              <Input fieldSize="md" type="number" min="1" value={item.targetSets} onChange={(event) => updatePlanExercise(plan.id, item.id, { targetSets: Number(event.target.value) || 1 })} />
                            </label>
                            {(exercise?.trackingType === "weight_reps" || exercise?.trackingType === "reps") && (
                              <>
                                <label className="text-xs">
                                  Rep min
                                  <Input fieldSize="md" type="number" min="0" value={item.targetRepMin ?? 0} onChange={(event) => updatePlanExercise(plan.id, item.id, { targetRepMin: Number(event.target.value) || 0 })} />
                                </label>
                                <label className="text-xs">
                                  Rep max
                                  <Input fieldSize="md" type="number" min="0" value={item.targetRepMax ?? 0} onChange={(event) => updatePlanExercise(plan.id, item.id, { targetRepMax: Number(event.target.value) || 0 })} />
                                </label>
                              </>
                            )}
                            {(exercise?.trackingType === "time" || exercise?.trackingType === "weight_time") && (
                              <label className="text-xs">
                                Duration
                                <Input fieldSize="md" type="number" min="1" value={item.targetDurationMax ?? 30} onChange={(event) => updatePlanExercise(plan.id, item.id, { targetDurationMax: Number(event.target.value) || 30 })} />
                              </label>
                            )}
                            <label className="text-xs">
                              Rest
                              <Input fieldSize="md" type="number" min="0" value={item.restSeconds} onChange={(event) => updatePlanExercise(plan.id, item.id, { restSeconds: Number(event.target.value) || 0 })} />
                            </label>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "routines" && (
          <section className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <Panel title="Create Routine">
              <Input placeholder="Routine name" value={newRoutineName} onChange={(event) => setNewRoutineName(event.target.value)} />
              <Button onClick={createRoutine}>Create routine</Button>
            </Panel>
            <div className="grid gap-3">
              {data.routines.map((routine) => {
                const rotationPlans = routine.planIds
                  .map((planId) => data.plans.find((plan) => plan.id === planId))
                  .filter(Boolean) as Plan[];
                const availablePlans = data.plans.filter((plan) => !routine.planIds.includes(plan.id));
                return (
                  <article key={routine.id} className="rounded-2xl border border-white/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Input
                          fieldSize="md"
                          value={routine.name}
                          onChange={(event) => updateRoutine(routine.id, { name: event.target.value })}
                          className="max-w-md text-lg font-semibold"
                        />
                        <p className="mt-2 text-sm text-cyan-400">{routine.scheduleType === "interval" ? `Every ${routine.intervalDays} days` : routine.scheduleType}</p>
                      </div>
                      <Button variant="outline" onClick={() => deleteRoutine(routine.id)}>Delete</Button>
                    </div>
                    <p className="mt-3 text-sm">Next: {data.plans.find((plan) => plan.id === routine.planIds[routine.rotationIndex])?.name || "No plan selected"}</p>
                    <div className="mt-4 grid gap-3">
                      <label className="text-sm font-medium">
                        Schedule
                        <Select className="mt-1" fieldSize="md" value={routine.scheduleType} onChange={(event) => updateRoutine(routine.id, { scheduleType: event.target.value as ScheduleType })}>
                          <option value="interval">Interval</option>
                          <option value="weekdays">Specific weekdays</option>
                          <option value="none">No schedule</option>
                        </Select>
                      </label>
                      {routine.scheduleType === "interval" && (
                        <label className="text-sm font-medium">
                          Every days
                          <Input className="mt-1" fieldSize="md" type="number" min="1" max="30" value={routine.intervalDays} onChange={(event) => updateRoutine(routine.id, { intervalDays: Number(event.target.value) || 1 })} />
                        </label>
                      )}
                      {routine.scheduleType === "weekdays" && (
                        <div>
                          <p className="mb-2 text-sm font-medium">Training days</p>
                          <div className="grid grid-cols-7 gap-1">
                            {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                              <button key={`${label}-${index}`} type="button" onClick={() => toggleRoutineWeekday(routine, index)} className={`rounded-lg border py-2 text-xs font-bold ${routine.weekdays.includes(index) ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/10 bg-white/[0.04]"}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="mb-2 text-sm font-medium">Rotation order</p>
                        <div className="grid gap-2">
                          {rotationPlans.map((plan, index) => (
                            <div
                              key={plan.id}
                              draggable
                              onDragStart={() => setDraggedRoutinePlan({ routineId: routine.id, planId: plan.id })}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => dropRoutinePlan(routine, plan.id)}
                              className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm ${routine.planIds[routine.rotationIndex] === plan.id ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}`}
                            >
                              <div>
                                <p className="font-semibold">{index + 1}. {plan.name}</p>
                                <p className="text-xs text-slate-400">{routine.planIds[routine.rotationIndex] === plan.id ? "Next workout" : `${plan.exerciseIds.length} exercise(s)`}</p>
                              </div>
                              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                <span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400">Drag</span>
                                <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-xs disabled:opacity-40" disabled={index === 0} onClick={() => moveRoutinePlan(routine, plan.id, -1)}>Up</button>
                                <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-xs disabled:opacity-40" disabled={index === rotationPlans.length - 1} onClick={() => moveRoutinePlan(routine, plan.id, 1)}>Down</button>
                                <button type="button" className="rounded-lg border border-red-300/30 px-2 py-1 text-xs text-red-300" onClick={() => toggleRoutinePlan(routine, plan.id)}>Remove</button>
                              </div>
                            </div>
                          ))}
                          {!rotationPlans.length && <p className="rounded-xl border border-white/10 p-3 text-sm text-slate-400">Add a plan below to build this routine.</p>}
                        </div>
                      </div>
                      {!!availablePlans.length && (
                        <div>
                          <p className="mb-2 text-sm font-medium">Add plan</p>
                          <div className="flex flex-wrap gap-2">
                            {availablePlans.map((plan) => (
                              <button key={plan.id} type="button" onClick={() => toggleRoutinePlan(routine, plan.id)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                                + {plan.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {routine.planIds.length > 0 && (
                        <label className="text-sm font-medium">
                          Next plan
                          <Select className="mt-1" fieldSize="md" value={routine.rotationIndex} onChange={(event) => updateRoutine(routine.id, { rotationIndex: Number(event.target.value) })}>
                            {routine.planIds.map((planId, index) => (
                              <option key={planId} value={index}>{data.plans.find((plan) => plan.id === planId)?.name}</option>
                            ))}
                          </Select>
                        </label>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}


        {activeTab === "history" && (
          <section className="grid gap-3">
            {[...data.sessions].reverse().map((session) => (
              <article key={session.id} className="rounded-2xl border border-white/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{session.planNameSnapshot}</h3>
                    <p className="text-sm text-slate-400">{niceDate(session.startedAt)} - {sessionDurationLabel(session)} - {session.status}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">{session.sets.length} sets</span>
                    <button
                      type="button"
                      className="rounded-full border border-red-400/30 bg-red-400/10 p-2 text-red-300 transition hover:bg-red-400/20"
                      aria-label={`Delete ${session.planNameSnapshot}`}
                      onClick={() => deleteHistorySession(session.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <p className="gym-status-completed rounded-xl bg-emerald-400/10 p-2 text-emerald-200">{session.exercises.filter((item) => item.status === "completed").length}<br />Completed</p>
                  <p className="gym-status-partial rounded-xl bg-amber-400/10 p-2 text-amber-200">{session.exercises.filter((item) => item.status === "partial").length}<br />Partial</p>
                  <p className="gym-status-skipped rounded-xl bg-slate-400/10 p-2 text-slate-300">{session.exercises.filter((item) => item.status === "skipped").length}<br />Skipped</p>
                </div>
                <div className="mt-3 grid gap-2">
                  {session.exercises.map((exercise) => (
                    <p key={exercise.id} className="rounded-xl bg-white/[0.04] p-3 text-sm">
                      {exercise.nameSnapshot}: {session.sets.filter((set) => set.workoutExerciseId === exercise.id).map((set) => setLabel(set, exercise.trackingTypeSnapshot)).join(", ") || exercise.status}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        {activeTab === "summary" && lastFinishedSession && (
          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <article className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-5">
              {(() => {
                const improvements = sessionImprovementDetails(data, lastFinishedSession);
                return (
                  <>
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Workout Summary</p>
              <h2 className="mt-2 text-3xl font-bold">{lastFinishedSession.planNameSnapshot}</h2>
              <p className="mt-1 text-sm text-slate-400">{niceDate(lastFinishedSession.startedAt)} - {sessionDurationLabel(lastFinishedSession)} - {lastFinishedSession.status}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat label="Exercises" value={`${lastFinishedSession.exercises.filter((item) => item.status === "completed").length}/${lastFinishedSession.exercises.length}`} />
                <Stat label="Sets" value={String(lastFinishedSession.sets.length)} />
                <Stat label="Volume" value={`${sessionVolume(lastFinishedSession).toLocaleString()}kg`} />
                <Stat label="PRs" value={String(improvements.length)} />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="font-semibold">{improvements.length ? `${improvements.length} performance PR${improvements.length === 1 ? "" : "s"}` : "Solid session"}</p>
                <div className="mt-3 grid gap-2">
                  {improvements.length ? improvements.map((item) => (
                    <p key={item.exercise.id} className="rounded-xl bg-cyan-400/10 p-3 text-sm">
                      <span className="font-semibold">{item.exercise.nameSnapshot}</span>
                      <br />
                      Previous: {setLabel(item.previousBest, item.exercise.trackingTypeSnapshot)}
                      <br />
                      Today: {setLabel(item.currentBest, item.exercise.trackingTypeSnapshot)}
                    </p>
                  )) : (
                    <p className="text-sm text-slate-300">Completed {lastFinishedSession.exercises.filter((item) => item.status === "completed").length} / {lastFinishedSession.exercises.length} exercises.</p>
                  )}
                </div>
              </div>
                  </>
                );
              })()}
              {lastFinishedSession.status === "partial" && lastFinishedSession.routineId && (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <p className="font-semibold text-amber-200">Partial workout</p>
                  <p className="mt-1 text-sm text-amber-100/80">Completed data was saved. Choose whether this should advance the routine rotation.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => advanceRoutineForSession(lastFinishedSession)}>Advance routine</Button>
                    <Button variant="outline" onClick={() => setTab("home")}>Keep same next workout</Button>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-white/10 p-5">
              <h3 className="font-semibold">Exercises</h3>
              <div className="mt-3 grid gap-2">
                {lastFinishedSession.exercises.map((exercise) => {
                  const sets = sessionExerciseSets(lastFinishedSession, exercise);
                  const previous = lastExerciseSets(data, exercise.exerciseId, lastFinishedSession.id);
                  return (
                    <div key={exercise.id} className="rounded-2xl bg-white/[0.04] p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">{exercise.nameSnapshot}</p>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{exercise.status}</span>
                      </div>
                      <p className="mt-2 text-slate-300">Today: {sets.length ? sets.map((set) => setLabel(set, exercise.trackingTypeSnapshot)).join(", ") : "No sets"}</p>
                      <p className="mt-1 text-slate-500">Last: {previous ? previous.sets.map((set) => setLabel(set, exercise.trackingTypeSnapshot)).join(", ") : "No previous data"}</p>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        )}

        {activeTab === "progress" && (
          <section className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total workouts" value={String(data.sessions.length)} />
              <Stat label="Training time" value={`${Math.round(totalTime / 60_000)}m`} />
              <Stat label="Total sets" value={String(allSets.length)} />
              <Stat label="PRs" value={String(data.sessions.reduce((sum, session) => sum + sessionImprovementCount(data, session), 0))} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {data.plans.map((plan) => {
                const sessions = data.sessions.filter((session) => session.planId === plan.id);
                const totalDuration = sessions.reduce((sum, session) => {
                  if (!session.endedAt) return sum;
                  return sum + Math.max(0, new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime());
                }, 0);
                return (
                  <article key={plan.id} className="rounded-2xl border border-white/10 p-4">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <p className="rounded-xl bg-white/[0.04] p-2">Completed<br /><span className="font-semibold">{sessions.length}</span></p>
                      <p className="rounded-xl bg-white/[0.04] p-2">Avg duration<br /><span className="font-semibold">{sessions.length ? `${Math.round(totalDuration / sessions.length / 60_000)}m` : "No data"}</span></p>
                      <p className="rounded-xl bg-white/[0.04] p-2">Last<br /><span className="font-semibold">{sessions.at(-1) ? niceDate(sessions.at(-1)!.startedAt) : "No data"}</span></p>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.exercises.map((exercise) => {
              const history = exerciseHistory(data, exercise.id);
              const first = history.at(-1)?.sets[0];
              const current = history[0]?.sets[0];
              const best = bestSetForTracking(history.flatMap((entry) => entry.sets), exercise.trackingType);
              return (
                <article key={exercise.id} className="rounded-2xl border border-white/10 p-4">
                  <h3 className="font-semibold">{exercise.name}</h3>
                  <p className="text-sm text-slate-400">Performed {history.length} time(s)</p>
                  <div className="mt-3 grid gap-2 text-sm">
                    <p className="rounded-xl bg-white/[0.04] p-2">Started<br /><span className="font-semibold">{first ? setLabel(first, exercise.trackingType) : "No data yet"}</span></p>
                    <p className="rounded-xl bg-white/[0.04] p-2">Current<br /><span className="font-semibold">{current ? setLabel(current, exercise.trackingType) : "No data yet"}</span></p>
                    <p className="rounded-xl bg-cyan-400/10 p-2">Best<br /><span className="font-semibold">{best ? setLabel(best, exercise.trackingType) : "No data yet"}</span></p>
                  </div>
                  {!!history.length && (
                    <div className="mt-4 flex h-16 items-end gap-1 rounded-xl bg-white/[0.03] p-2">
                      {history.slice(0, 8).reverse().map((entry) => {
                        const bestForSession = bestSetForTracking(entry.sets, exercise.trackingType);
                        const maxValue = Math.max(...history.flatMap((item) => item.sets.map((set) => performanceValue(set, exercise.trackingType))), 1);
                        const height = bestForSession ? Math.max(12, (performanceValue(bestForSession, exercise.trackingType) / maxValue) * 100) : 12;
                        return (
                          <div key={`${entry.session.id}-${entry.workoutExercise.id}-bar`} className="flex flex-1 items-end">
                            <div className="w-full rounded-t bg-cyan-300/70" style={{ height: `${height}%` }} title={`${niceDate(entry.session.startedAt)} ${bestForSession ? setLabel(bestForSession, exercise.trackingType) : ""}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function WorkoutMode({
  active,
  data,
  nowMs,
  onSetActive,
  onCompleteSet,
  onFinishExercise,
  onFinishWorkout,
  onDiscardWorkout,
}: {
  active: ActiveWorkout;
  data: GymData;
  nowMs: number;
  onSetActive: (active: ActiveWorkout) => void;
  onCompleteSet: (values: { weight?: number; reps?: number; durationSeconds?: number }) => void;
  onFinishExercise: (status?: ExerciseStatus) => void;
  onFinishWorkout: (status: SessionStatus) => void;
  onDiscardWorkout: () => void;
}) {
  const current = active.session.exercises[active.currentExerciseIndex];
  const completedSets = active.session.sets.filter((set) => set.workoutExerciseId === current.id);
  const previous = lastExerciseSets(data, current.exerciseId, active.session.id);
  const prefill = previous?.sets[completedSets.length] || previous?.sets.at(-1);
  const [weight, setWeight] = useState(prefill?.weight || 10);
  const [reps, setReps] = useState(prefill?.reps || current.targetRepMax || 10);
  const [duration, setDuration] = useState(prefill?.durationSeconds || current.targetDurationMax || 30);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const restLeft = active.restUntil ? Math.max(0, Math.ceil((active.restUntil - nowMs) / 1000)) : 0;
  const previousRestLeft = useRef(restLeft);
  const elapsed = Math.floor((nowMs - new Date(active.session.startedAt).getTime()) / 1000);
  const timerValue = timerStartedAt ? Math.max(0, Math.floor((nowMs - timerStartedAt) / 1000)) : duration;
  const sessionStatus = getSessionStatus(active.session);

  useEffect(() => {
    if (previousRestLeft.current > 0 && restLeft === 0) {
      navigator.vibrate?.([120, 60, 120]);
    }
    previousRestLeft.current = restLeft;
  }, [restLeft]);

  function completeCurrentSet() {
    if (current.trackingTypeSnapshot === "weight_reps") onCompleteSet({ weight, reps });
    if (current.trackingTypeSnapshot === "reps") onCompleteSet({ reps });
    if (current.trackingTypeSnapshot === "time") onCompleteSet({ durationSeconds: timerValue });
    if (current.trackingTypeSnapshot === "weight_time") onCompleteSet({ weight, durationSeconds: timerValue });
    setTimerStartedAt(null);
  }

  function stopTimerAndSave() {
    const value = timerValue;
    if (current.trackingTypeSnapshot === "time") onCompleteSet({ durationSeconds: value });
    if (current.trackingTypeSnapshot === "weight_time") onCompleteSet({ weight, durationSeconds: value });
    setTimerStartedAt(null);
  }

  return (
    <main className="min-h-screen bg-[#05070b] px-4 py-5 pb-32 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-cyan-300">{active.session.planNameSnapshot}</p>
            <h1 className="text-2xl font-bold">{secondsLabel(elapsed)} elapsed</h1>
            <p className="mt-1 text-sm text-slate-400">Exercise {active.currentExerciseIndex + 1} of {active.session.exercises.length}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => setShowNavigator((current) => !current)}>Exercises</Button>
            <Button variant="outline" onClick={() => setShowFinishConfirm(true)}><X className="size-4" /> Finish</Button>
          </div>
        </header>

        {showNavigator && (
          <section className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">{active.session.planNameSnapshot}</h2>
              <button type="button" className="text-sm text-cyan-200" onClick={() => setShowNavigator(false)}>Close</button>
            </div>
            <div className="grid gap-2">
              {active.session.exercises.map((exercise, index) => {
                const statusLabel = exercise.status === "completed"
                  ? "Completed"
                  : exercise.status === "skipped"
                  ? "Skipped"
                  : index === active.currentExerciseIndex
                  ? "Current"
                  : "Pending";
                const setCount = active.session.sets.filter((set) => set.workoutExerciseId === exercise.id).length;
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => {
                      onSetActive({ ...active, currentExerciseIndex: index, restUntil: undefined });
                      setShowNavigator(false);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm ${index === active.currentExerciseIndex ? "border-cyan-300 bg-cyan-300/15" : "border-white/10 bg-white/[0.03]"}`}
                  >
                    <span>{exercise.nameSnapshot}</span>
                    <span className="text-xs text-slate-400">{statusLabel} - {setCount}/{exercise.plannedSetsSnapshot}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {restLeft > 0 && (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="text-sm font-semibold text-amber-300">REST</p>
            <p className="text-4xl font-bold">{secondsLabel(restLeft)}</p>
            <Button className="mt-3" onClick={() => onSetActive({ ...active, restUntil: undefined })}>Skip rest</Button>
          </section>
        )}

        <section className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">Exercise {active.currentExerciseIndex + 1} of {active.session.exercises.length}</p>
            <span className="text-sm text-slate-400">{completedSets.length}/{current.plannedSetsSnapshot} sets</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: `${((active.currentExerciseIndex + 1) / active.session.exercises.length) * 100}%` }} />
          </div>
          <h2 className="mt-6 text-3xl font-bold uppercase">{current.nameSnapshot}</h2>
          <p className="text-sm text-cyan-300">
            {trackingLabels[current.trackingTypeSnapshot]} 路 Target {current.plannedSetsSnapshot} sets
            {current.targetRepMin != null && current.targetRepMax != null ? ` 路 ${current.targetRepMin}-${current.targetRepMax} reps` : ""}
            {current.targetDurationMax != null ? ` 路 ${current.targetDurationMax}s` : ""}
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 p-4">
          <h3 className="font-semibold">Last performed</h3>
          {previous ? (
            <div className="mt-2 grid gap-2">
              <p className="text-sm text-slate-400">{niceDate(previous.session.startedAt)}</p>
              {previous.sets.map((set) => <p key={set.id} className="rounded-xl bg-white/[0.05] p-2 text-sm">{set.setNumber}. {setLabel(set, current.trackingTypeSnapshot)}</p>)}
            </div>
          ) : <p className="mt-2 text-sm text-slate-400">No previous data for this exercise.</p>}
        </section>

        <section className="rounded-2xl border border-white/10 p-4">
          <h3 className="font-semibold">Today - Set {completedSets.length + 1}</h3>
          <div className="mt-4 grid gap-3">
            {(current.trackingTypeSnapshot === "weight_reps" || current.trackingTypeSnapshot === "weight_time") && (
              <Stepper label="Weight" value={weight} suffix="kg" onChange={setWeight} onMinus={() => setWeight(Math.max(0, weight - 1))} onPlus={() => setWeight(weight + 1)} />
            )}
            {(current.trackingTypeSnapshot === "weight_reps" || current.trackingTypeSnapshot === "reps") && (
              <Stepper label="Reps" value={reps} onChange={setReps} onMinus={() => setReps(Math.max(0, reps - 1))} onPlus={() => setReps(reps + 1)} />
            )}
            {(current.trackingTypeSnapshot === "time" || current.trackingTypeSnapshot === "weight_time") && (
              <div className="rounded-2xl bg-white/[0.05] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Duration</span>
                  <span className="text-3xl font-bold">{timerValue}s</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => timerStartedAt ? stopTimerAndSave() : setTimerStartedAt(nowMs)}><Timer className="size-4" />{timerStartedAt ? "Stop & save" : "Start timer"}</Button>
                  <Button variant="outline" onClick={() => setDuration(duration + 5)}>+5s</Button>
                </div>
                {!timerStartedAt && (
                  <Input className="mt-3" fieldSize="md" type="number" min="0" value={duration} onChange={(event) => setDuration(Number(event.target.value) || 0)} />
                )}
              </div>
            )}
          </div>
          <Button className="mt-4 w-full text-lg uppercase" size="lg" onClick={completeCurrentSet}><Check className="size-5" /> Complete Set</Button>
          {completedSets.length >= current.plannedSetsSnapshot && (
            <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3">
              <p className="text-sm font-semibold text-emerald-200">Target sets reached</p>
              <div className="mt-3 grid gap-2">
                <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-xs font-semibold uppercase text-emerald-100/70">
                  <span>Set</span>
                  <span>Last</span>
                  <span>Today</span>
                </div>
                {completedSets.map((set, index) => (
                  <div key={set.id} className="grid grid-cols-[2rem_1fr_1fr] gap-2 rounded-xl bg-black/10 p-2 text-sm">
                    <span>{index + 1}</span>
                    <span>{previous?.sets[index] ? setLabel(previous.sets[index], current.trackingTypeSnapshot) : "-"}</span>
                    <span>{setLabel(set, current.trackingTypeSnapshot)}</span>
                  </div>
                ))}
                {!!previous?.sets.length && (
                  <p className="text-sm text-emerald-100">
                    {completedSetComparison(previous.sets, completedSets, current.trackingTypeSnapshot)} / {completedSets.length} sets improved
                  </p>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button onClick={() => onFinishExercise("completed")}>Finish Exercise</Button>
                <Button variant="outline" onClick={completeCurrentSet}>+ Add Set</Button>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="text-sm text-slate-400" onClick={() => onFinishExercise("skipped")}>Skip Exercise</button>
            <button type="button" className="inline-flex items-center gap-1 text-sm text-slate-400" onClick={() => setShowMore((current) => !current)}>
              <Ellipsis className="size-4" /> More
            </button>
          </div>
          {showMore && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <Button variant="outline" onClick={() => onFinishExercise(completedSets.length ? "partial" : "skipped")}>Next Exercise</Button>
              <Button variant="outline" disabled={active.currentExerciseIndex === 0} onClick={() => onSetActive({ ...active, currentExerciseIndex: active.currentExerciseIndex - 1 })}>Previous</Button>
              <Button variant="outline" onClick={() => onFinishExercise("completed")}>Complete Exercise</Button>
              <Button onClick={() => setShowFinishConfirm(true)}>Finish Workout</Button>
            </div>
          )}
        </section>
      </div>
      {showFinishConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 px-4 py-5 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finish-workout-title"
          onClick={() => setShowFinishConfirm(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-amber-400/35 bg-[#17140b] p-4 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="finish-workout-title" className="text-lg font-bold text-amber-100">End workout?</p>
            <p className="mt-2 text-sm text-amber-100/80">
              Completed: {active.session.exercises.filter((item) => item.status === "completed").length}/{active.session.exercises.length} exercises - {active.session.sets.length} sets.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button onClick={() => onFinishWorkout(sessionStatus)}>Save & End</Button>
              <Button variant="outline" onClick={onDiscardWorkout}>Discard</Button>
              <Button variant="outline" onClick={() => setShowFinishConfirm(false)}>Keep Training</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Stepper({ label, value, suffix = "", onChange, onMinus, onPlus }: { label: string; value: number; suffix?: string; onChange: (value: number) => void; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        <label className="flex items-center gap-1">
          <Input className="w-24 text-right text-2xl font-bold" fieldSize="md" type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} />
          <span className="text-xl font-bold">{suffix}</span>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="lg" onClick={onMinus}>-</Button>
        <Button size="lg" onClick={onPlus}>+</Button>
      </div>
    </div>
  );
}


