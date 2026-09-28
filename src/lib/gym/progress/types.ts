import type { WorkoutPrescription } from "./prescription-types";

export type TrackingType = "weight_reps" | "reps" | "time" | "weight_time";
export type WorkoutFeedback = {
  finalSetRir: 0 | 1 | 2 | 3 | 4 | null;
  technique: "stable" | "some_breakdown" | "poor";
  pain: "none" | "mild" | "limiting";
  sleep?: "poor" | "okay" | "good" | "excellent";
  fatigue?: "fresh" | "normal" | "more_tired" | "very_fatigued";
  recovery?: "fully_recovered" | "mostly_recovered" | "still_sore" | "not_recovered";
};

export type ProgressSet = {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  completedAt: string;
  repsInReserve?: number;
  isWarmup?: boolean;
  deleted?: boolean;
  techniqueValid?: boolean;
};

export type ProgressExerciseOccurrence = {
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
  dumbbellCountSnapshot?: 1 | 2;
};

export type PlateInventory = { weightKg: number; quantity: number };
export type ProgressSettings = {
  plateInventory?: PlateInventory[];
  availableLoads: number[];
  weightConvention: "per_dumbbell";
};

export type ProgressInput = {
  exercises: Array<{ id: string; name: string; trackingType: TrackingType; dumbbellCount?: 1 | 2 }>;
  plans: Array<{ id: string; name?: string; exerciseIds: Array<{
    exerciseId: string;
    targetSets: number;
    targetRepMin?: number;
    targetRepMax?: number;
    targetDurationMin?: number;
    targetDurationMax?: number;
  }> }>;
  sessions: Array<{
    id: string;
    planId?: string;
    feedback?: WorkoutFeedback;
    startedAt: string;
    endedAt?: string;
    status: string;
    exercises: ProgressExerciseOccurrence[];
    sets: ProgressSet[];
  }>;
  progressSettings?: ProgressSettings;
};

export type Targets = { sets: number; repMin: number; repMax: number; duration: number | null; durationMin?: number | null };
export type Confidence = "insufficient" | "low" | "normal";
export type SessionPerformance = {
  sessionId: string;
  occurrenceId: string;
  sessionDate: string;
  exerciseId: string;
  targets: Targets;
  validSets: ProgressSet[];
  techniqueIssue?: boolean;
  highestWeight: number | null;
  establishedLoad: number | null;
  bestRepsAtWeight: Record<string, number>;
  bestDurationAtWeight: Record<string, number>;
  bestSet: ProgressSet;
  sessionVolume: number | null;
  sessionE1RM: number | null;
  e1rmConfidence: Confidence;
  repsInReserve: number | null;
};

export type LoadMilestone = {
  date: string;
  sessionId: string;
  load: number;
  previousLoad: number | null;
  days: number | null;
  sessions: number | null;
  changePercent: number | null;
};

export type PRType = "load" | "estimated_strength" | "reps" | "bodyweight_reps" | "duration" | "volume";
export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  date: string;
  type: PRType;
  value: number;
  previousValue: number;
  load: number | null;
  set: ProgressSet;
};

export type NextTarget = {
  kind: "first_session" | "reps" | "duration" | "increase_load" | "repeat" | "equipment_limit" | "configure_loads";
  label: string;
  reason: string;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  repRangeMastered: boolean;
  progressCurrent: number | null;
  progressTarget: number | null;
};

export type ExerciseProgress = {
  exerciseId: string;
  exerciseName: string;
  trackingType: TrackingType;
  sessions: SessionPerformance[];
  sessionCount: number;
  baseline: SessionPerformance | null;
  current: SessionPerformance | null;
  workComparison: {
    previousSessionId: string;
    previousDate: string;
    setCount: number;
    load: number | null;
    unit: "reps" | "seconds";
    previousTotal: number;
    currentTotal: number;
    change: number;
  } | null;
  bestSet: ProgressSet | null;
  baselineE1RM: number | null;
  currentE1RM: number | null;
  currentE1RMDate: string | null;
  bestE1RM: number | null;
  estimatedStrengthChangePercent: number | null;
  personalBestImprovementPercent: number | null;
  eligibleStrengthSessions: number;
  startingLoad: number | null;
  currentLoad: number | null;
  highestLoad: number | null;
  loadChangePercent: number | null;
  currentRepsAtLoad: number | null;
  bestRepsAtCurrentLoad: number | null;
  bestRepsAtLoad: Record<string, number>;
  repHistoryByLoad: Array<{ load: number; starting: number; current: number; change: number | null }>;
  bestVolume: number | null;
  volumeChange: number | null;
  repChangeAtCurrentLoad: number | null;
  startingMaxReps: number | null;
  currentMaxReps: number | null;
  bestMaxReps: number | null;
  repChange: number | null;
  repChangePercent: number | null;
  zeroRepBaselineDate: string | null;
  repMilestones: Array<{ reps: number; date: string }>;
  startingBestDuration: number | null;
  currentBestDuration: number | null;
  allTimeBestDuration: number | null;
  durationChange: number | null;
  durationChangePercent: number | null;
  daysToCurrentLoad: number | null;
  sessionsToCurrentLoad: number | null;
  averageDaysPerLoadIncrease: number | null;
  averageSessionsPerLoadIncrease: number | null;
  nextTarget: WorkoutPrescription;
  targetPlanName?: string;
  dumbbellCount: 1 | 2;
  availableLoads: number[];
  status: "Building baseline" | "Progressing" | "Stable" | "Progress slowing" | "Possible plateau";
  sessionsWithoutImprovement: number;
  loadMilestones: LoadMilestone[];
  prHistory: PersonalRecord[];
  improvementDates: string[];
  dataConfidence: Confidence;
  e1rmConfidence: Confidence;
};

export type ProgressAnalysis = {
  asOfDate: string;
  settings: ProgressSettings;
  methodology: {
    e1rm: string;
    overall: string;
    validSets: string;
    zeroRepAttempts: string;
    loadMilestoneSessions: string;
    prCounting: string;
    weightConvention: string;
    recommendations: string;
    rir: string;
  };
  overall: {
    earlyTrend: boolean;
    trainingStartDate: string | null;
    trainingDays: number | null;
    workoutsCompleted: number;
    validSets: number;
    lifetimePRs: number;
    estimatedStrengthChangePercent: number | null;
    eligibleExerciseCount: number;
  };
  monthly: { month: string; workoutsCompleted: number; exercisesImproved: number; loadIncreases: number; prs: number; progressSlowing: number; possiblePlateaus: number };
  recentSignal: PersonalRecord | null;
  workoutFeedback: { date: string; today: boolean; improved: number; prs: number; items: Array<{ exerciseId: string; name: string; label: string; improved: boolean }> } | null;
  exercises: ExerciseProgress[];
};
