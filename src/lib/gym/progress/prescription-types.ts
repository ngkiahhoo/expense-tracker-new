import type { Confidence, NextTarget } from "./types";

export type PrescriptionSetTarget = {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  /** This set has no directly comparable observation; it is a starting attempt. */
  provisional?: boolean;
};

export type WorkoutPrescription = NextTarget & {
  action: "establish" | "repeat" | "add_rep" | "add_time" | "increase_load" | "reduce_load" | "rebuild" | "configure_equipment";
  confidence: Confidence;
  setTargets: PrescriptionSetTarget[];
  basis: string[];
  effort: string;
  rest: string;
};

export type PrescriptionOptions = {
  zeroBaseline?: boolean;
  /** Preserve a recent technique failure even when no set qualified for analytics. */
  techniqueIssue?: boolean;
  failedAttempt?: boolean;
};
