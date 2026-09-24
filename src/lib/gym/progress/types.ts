export type TrackingType = "weight_reps" | "reps" | "time" | "weight_time";

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
};

export type ProgressSettings = {
  availableLoads: number[];
  weightConvention: "per_dumbbell";
};

export type ProgressInput = {
  exercises: Array<{ id: string; name: string; trackingType: TrackingType }>;
  plans: Array<{ id: string; exerciseIds: Array<{
    exerciseId: string;
    targetSets: number;
    targetRepMin?: number;
    targetRepMax?: number;
    targetDurationMin?: number;
    targetDurationMax?: number;
  }> }>;
  sessions: Array<{
    id: string;
    startedAt: string;
    endedAt?: string;
    status: string;
    exercises: ProgressExerciseOccurrence[];
    sets: ProgressSet[];
  }>;
  progressSettings?: ProgressSettings;
};

export type Targets = { sets: number; repMin: number; repMax: number; duration: number | null };
export type Confidence = "insufficient" | "low" | "normal";
export type SessionPerformance = {
  sessionId: string;
  occurrenceId: string;
  sessionDate: string;
  exerciseId: string;
  targets: Targets;
  validSets: ProgressSet[];
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

export type PRType = "load" | "estimated_strength" | "reps" | "duration" | "volume";
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
  nextTarget: NextTarget;
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
  exercises: ExerciseProgress[];
};
