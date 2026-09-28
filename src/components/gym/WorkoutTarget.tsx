import type { ExerciseProgress, ProgressExerciseOccurrence } from "@/lib/gym/progress/types";
import { performanceLabel } from "./ProgressAnalysis";

export default function WorkoutTarget({ progress, exercise }: { progress: ExerciseProgress; exercise: ProgressExerciseOccurrence }) {
  const next = progress.nextTarget;
  const timed = progress.trackingType === "time" || progress.trackingType === "weight_time";
  const firstSession = next.kind === "first_session";
  const repMin = exercise.targetRepMin ?? 8;
  const repMax = Math.max(repMin, exercise.targetRepMax ?? 12);
  const duration = exercise.targetDurationMax ?? exercise.targetDurationMin;
  const planGoal = timed ? duration ? `${duration}s` : "Record a comfortable hold" : `${repMin}–${repMax} reps`;

  return (
    <section className="gym-card rounded-3xl border p-5" aria-labelledby="workout-target-title">
      <p className="text-sm font-semibold text-emerald-200">Suggested target · {exercise.nameSnapshot}</p>
      <h2 id="workout-target-title" className="mt-2 text-2xl font-bold text-emerald-50">
        {firstSession ? planGoal : next.label}
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        {exercise.plannedSetsSnapshot} planned sets · {firstSession ? "Establish your baseline" : progress.trackingType === "weight_reps" ? "Working-set goal" : "Best-set goal"}
      </p>
      <p className="mt-3 text-sm text-slate-200">
        {firstSession
          ? `No usable history for this exercise yet. Start with your plan's target${progress.trackingType.startsWith("weight") ? " and a load you can control; there is not enough data to calculate a starting weight" : " and record what you can complete with controlled technique"}.`
          : next.reason}
      </p>
      {progress.current && (
        <div className="gym-inset-panel mt-4 rounded-xl border p-3 text-sm">
          <p className="font-semibold text-slate-200">Last recorded · {progress.current.sessionDate}</p>
          <p className="mt-1 text-slate-300">
            {progress.current.validSets.map((set, index) => `Set ${index + 1}: ${performanceLabel(set, progress.trackingType)}`).join(" · ")}
          </p>
        </div>
      )}
      <details className="mt-4 text-sm text-slate-300">
        <summary className="cursor-pointer font-semibold text-emerald-200">How this target is calculated</summary>
        <div className="mt-3 space-y-2">
          <p>Uses the same rules as Progress, with the current plan, saved history and available equipment. Sets recorded during this workout do not increase the target.</p>
          {progress.trackingType === "weight_reps" ? (
            <p>Keep the load and build toward {repMax} reps across all {exercise.plannedSetsSnapshot} working sets. A one-rep step is an app progression rule, not a prediction. Increase only after all recorded working sets meet the upper limit; use the next available load within 10% and return to {repMin} reps. Reported RIR 0 means repeat the load.</p>
          ) : timed ? (
            <p>Use the planned duration, or repeat your last recorded hold if no duration is configured. Weighted holds keep the same load. No arbitrary extra seconds or estimated 1RM are used.</p>
          ) : (
            <p>The next best-set goal is one rep above your last recorded best. This is the smallest whole-rep progression step, not a prediction that every set will reach it.</p>
          )}
          <p>Targets are evidence-informed training suggestions, not a measurement of your current capacity. Keep technique controlled and adjust to your actual performance.</p>
          <p>
            Basis: <a className="underline" href="https://pubmed.ncbi.nlm.nih.gov/19204579/" target="_blank" rel="noreferrer">ACSM progression guidance</a>
            {" · "}<a className="underline" href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noreferrer">2026 resistance training guidance</a>.
            {" "}These support progressive, individualized training; they do not validate an exact next-session number.
          </p>
        </div>
      </details>
    </section>
  );
}
